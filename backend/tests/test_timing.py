import time

from backend.app import benchmark
from backend.app.benchmark import timed_median


def test_slow_job_runs_once(monkeypatch):
    monkeypatch.setattr(benchmark, "TIME_BUDGET_S", 0.05)
    calls = []

    def slow():
        calls.append(1)
        time.sleep(0.08)

    _, repeats, _ = timed_median(slow)
    assert repeats == 1 and len(calls) == 1


def test_fast_job_hits_max_repeats(monkeypatch):
    monkeypatch.setattr(benchmark, "TIME_BUDGET_S", 5.0)
    _, repeats, value = timed_median(lambda: 42)
    assert repeats == benchmark.MAX_REPEATS and value == 42


def test_returns_median(monkeypatch):
    monkeypatch.setattr(benchmark, "MAX_REPEATS", 3)
    monkeypatch.setattr(benchmark, "TIME_BUDGET_S", 100.0)
    ticks = iter([0.0, 1.0, 1.0, 11.0, 11.0, 13.0])  # durations: 1, 10, 2 -> median 2
    monkeypatch.setattr(benchmark.time, "perf_counter", lambda: next(ticks))
    median, repeats, _ = timed_median(lambda: None)
    assert (median, repeats) == (2.0, 3)


def test_round_trip_all_codecs():
    data = b"hello hello hello world " * 500
    for compressor, setting in benchmark.CODECS:
        result, out = benchmark.run_job(data, compressor, setting)
        assert result.status == "ok", (compressor, setting, result.error)
        assert out is not None and result.compressed_bytes < len(data)
