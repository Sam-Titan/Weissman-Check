import bz2
import gzip
import json
import lzma

import brotli
import lz4.frame
import pytest
import zstandard
from fastapi.testclient import TestClient

from backend.app import benchmark, main
from backend.app.store import RunStore

DATA = (b"GET /api/users 200 12\n" * 400) + (b"GET /api/orders 404 7\n" * 300)
UNPACK = {
    "gzip": gzip.decompress,
    "brotli": brotli.decompress,
    "zstd": zstandard.ZstdDecompressor().decompress,
    "lz4": lz4.frame.decompress,
    "xz": lzma.decompress,
    "bzip2": bz2.decompress,
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "store", RunStore())
    return TestClient(main.app)


def start(client, data=DATA, compressors="gzip,brotli,zstd,lz4,xz,bzip2", name="app.log"):
    res = client.post("/api/runs", files={"file": (name, data)}, data={"compressors": compressors})
    assert res.status_code == 201, res.text
    return res.json()["run_id"]


def events(client, run_id):
    out = []
    with client.stream("GET", f"/api/runs/{run_id}/events") as res:
        kind = None
        for line in res.iter_lines():
            if line.startswith("event: "):
                kind = line[7:]
            elif line.startswith("data: ") and kind != "ping":
                out.append((kind, json.loads(line[6:])))
    return out


def test_every_download_is_the_real_compressed_file(client):
    run_id = start(client)
    events(client, run_id)
    for compressor, unpack in UNPACK.items():
        for setting in ("fast", "strong"):
            res = client.get(f"/api/runs/{run_id}/download/{compressor}/{setting}")
            assert res.status_code == 200
            assert unpack(res.content) == DATA, (compressor, setting)
            ext = benchmark.EXTENSIONS[compressor]
            assert f'filename="app.log.{ext}"' in res.headers["content-disposition"]


def test_download_of_unknown_or_expired_run_is_404(client):
    res = client.get("/api/runs/nope/download/gzip/fast")
    assert res.status_code == 404 and "expired" in res.json()["detail"]


def test_download_of_a_compressor_that_did_not_run_is_404(client):
    run_id = start(client, compressors="gzip")
    events(client, run_id)
    assert client.get(f"/api/runs/{run_id}/download/gzip/fast").status_code == 200
    assert client.get(f"/api/runs/{run_id}/download/xz/fast").status_code == 404


def test_one_failing_job_does_not_stop_the_others(client, monkeypatch):
    def boom(_data):
        raise MemoryError("xz preset 9 ran out of memory")

    broken = benchmark.Codec("preset 9", boom, lzma.decompress)
    monkeypatch.setitem(benchmark.CODECS, ("xz", "strong"), broken)
    run_id = start(client, compressors="gzip,xz")
    evs = events(client, run_id)
    results = {(d["compressor"], d["setting"]): d for k, d in evs if k == "result"}
    assert results[("xz", "strong")]["status"] == "failed"
    assert "memory" in results[("xz", "strong")]["error"]
    assert all(r["status"] == "ok" for key, r in results.items() if key != ("xz", "strong"))
    assert evs[-1][0] == "done"
    analysis = evs[-1][1]
    assert "xz/strong" not in analysis["rows"] and "xz/fast" in analysis["rows"]
    assert client.get(f"/api/runs/{run_id}/download/xz/strong").status_code == 404


def test_upload_limits(client):
    assert (
        client.post(
            "/api/runs", files={"file": ("e.txt", b"")}, data={"compressors": "gzip"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/runs", files={"file": ("a.txt", b"x")}, data={"compressors": ""}
        ).status_code
        == 422
    )
    big = b"a" * (main.MAX_BYTES + 1)
    res = client.post("/api/runs", files={"file": ("big.txt", big)}, data={"compressors": "gzip"})
    assert res.status_code == 413
