import json
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from .analysis import analyse
from .benchmark import BASELINE_KEYS, CODECS, COMPRESSORS, plan_jobs, run_benchmark
from .models import JobId, RunCreated
from .store import store

MAX_BYTES = 25 * 1024 * 1024
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
    run_id = store.create(data, included)
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
        results = []
        try:
            for result, out in run_benchmark(run.data, run.included):
                results.append(result)
                if out is not None:
                    run.outputs[(result.compressor, result.setting)] = out
                yield _sse("result", result.model_dump())
            yield _sse("done", analyse(results).model_dump())
        finally:
            run.running = False

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/samples/{name}")
def get_sample(name: str) -> FileResponse:
    path = SAMPLES_DIR / name
    if path.parent != SAMPLES_DIR or not path.is_file():
        raise HTTPException(404, "Unknown sample.")
    return FileResponse(path, filename=name)
