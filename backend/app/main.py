import json
import queue
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse

from .analysis import analyse
from .benchmark import (
    BASELINE_KEYS,
    CODECS,
    COMPRESSORS,
    EXTENSIONS,
    plan_jobs,
    run_benchmark,
)
from .models import JobId, RunCreated
from .store import store

MAX_BYTES = 25 * 1024 * 1024
PING_EVERY_S = 2.0
SAMPLES_DIR = Path(__file__).parent / "samples"

app = FastAPI(title="Weissman Check")


def _job_id(key: tuple[str, str]) -> JobId:
    return JobId(compressor=key[0], setting=key[1], level_label=CODECS[key].label)  # type: ignore[arg-type]


@app.post("/api/runs", status_code=201)
async def create_run(
    file: Annotated[UploadFile, File()], compressors: Annotated[str, Form()] = ""
) -> RunCreated:
    if store.any_running():
        raise HTTPException(409, "A run is already in progress.")
    included = [c for c in compressors.split(",") if c in COMPRESSORS]
    if not included:
        raise HTTPException(422, "Pick at least one compressor.")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Files are limited to 25 MB.")
    if not data:
        raise HTTPException(422, "This file is empty, nothing to squeeze.")
    run_id = store.create(data, included, Path(file.filename or "file").name)
    jobs = plan_jobs(included)
    return RunCreated(
        run_id=run_id,
        jobs=[_job_id(k) for k in jobs],
        baselines=[_job_id(k) for k in BASELINE_KEYS],
    )


def _sse(event: str, payload: object) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@app.get("/api/runs/{run_id}/events")
def run_events(run_id: str) -> StreamingResponse:
    run = store.get(run_id)
    if run is None:
        raise HTTPException(404, "That run expired, run it again.")
    if run.running:
        raise HTTPException(409, "A run is already in progress.")

    def stream() -> Iterator[str]:
        run.running = True
        events: queue.Queue[tuple[str, object] | None] = queue.Queue()

        def work() -> None:
            results = []
            try:
                for result, out in run_benchmark(run.data, run.included):
                    if run.cancelled:
                        return
                    results.append(result)
                    if out is not None:
                        run.outputs[(result.compressor, result.setting)] = out
                    events.put(("result", result.model_dump()))
                events.put(("done", analyse(results, run.data, run.name).model_dump()))
            except Exception as exc:  # surface unexpected failures instead of hanging the stream
                events.put(("error", {"message": str(exc) or type(exc).__name__}))
            finally:
                run.running = False
                events.put(None)

        threading.Thread(target=work, daemon=True).start()
        try:
            while True:
                try:
                    item = events.get(timeout=PING_EVERY_S)
                except queue.Empty:
                    yield _sse("ping", {})  # lets the browser tell "slow job" from "dead server"
                    continue
                if item is None:
                    break
                yield _sse(*item)
        finally:
            run.cancelled = True  # the browser left; stop after the current job

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/runs/{run_id}/download/{compressor}/{setting}")
def download(run_id: str, compressor: str, setting: str) -> Response:
    run = store.get(run_id)
    out = run.outputs.get((compressor, setting)) if run else None
    if run is None or out is None or compressor not in EXTENSIONS:
        raise HTTPException(404, "That run expired, run it again.")
    filename = f"{run.name}.{EXTENSIONS[compressor]}"
    return Response(
        out,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/samples/{name}")
def get_sample(name: str) -> FileResponse:
    path = SAMPLES_DIR / name
    if path.parent != SAMPLES_DIR or not path.is_file():
        raise HTTPException(404, "Unknown sample.")
    return FileResponse(path, filename=name)
