"""Runs real compressors over a file, timing each job (median of adaptive repeats)."""

import bz2
import gzip
import lzma
import statistics
import time
from collections.abc import Callable, Iterator
from dataclasses import dataclass

import brotli
import lz4.frame
import zstandard

from .models import JobResult

TIME_BUDGET_S = 0.5  # keep repeating a step while its total time is under this...
MAX_REPEATS = 7  # ...but never more than this many times (always at least once)

COMPRESSORS = ["gzip", "brotli", "zstd", "lz4", "xz", "bzip2"]
EXTENSIONS = {
    "gzip": "gz",
    "brotli": "br",
    "zstd": "zst",
    "lz4": "lz4",
    "xz": "xz",
    "bzip2": "bz2",
}


@dataclass(frozen=True)
class Codec:
    label: str
    compress: Callable[[bytes], bytes]
    decompress: Callable[[bytes], bytes]


def _zstd(level: int) -> Codec:
    return Codec(
        f"level {level}",
        lambda d: zstandard.ZstdCompressor(level=level).compress(d),
        lambda d: zstandard.ZstdDecompressor().decompress(d),
    )


def _gzip(level: int) -> Codec:
    return Codec(
        f"level {level}",
        lambda d: gzip.compress(d, compresslevel=level, mtime=0),
        gzip.decompress,
    )


def _brotli(q: int) -> Codec:
    return Codec(f"quality {q}", lambda d: brotli.compress(d, quality=q), brotli.decompress)


def _lz4(level: int) -> Codec:
    return Codec(
        f"level {level}",
        lambda d: lz4.frame.compress(d, compression_level=level),
        lz4.frame.decompress,
    )


def _xz(preset: int) -> Codec:
    return Codec(
        f"preset {preset}",
        lambda d: lzma.compress(d, preset=preset),
        lzma.decompress,
    )


def _bzip2(level: int) -> Codec:
    return Codec(
        f"level {level}",
        lambda d: bz2.compress(d, compresslevel=level),
        bz2.decompress,
    )


# (compressor, setting) -> codec. "baseline" entries are the extra Weissman baselines.
CODECS: dict[tuple[str, str], Codec] = {
    ("gzip", "fast"): _gzip(1),
    ("gzip", "strong"): _gzip(9),
    ("brotli", "fast"): _brotli(1),
    ("brotli", "strong"): _brotli(11),
    ("zstd", "fast"): _zstd(1),
    ("zstd", "strong"): _zstd(19),
    ("lz4", "fast"): _lz4(0),
    ("lz4", "strong"): _lz4(12),
    ("xz", "fast"): _xz(1),
    ("xz", "strong"): _xz(9),
    ("bzip2", "fast"): _bzip2(1),
    ("bzip2", "strong"): _bzip2(9),
    ("gzip", "baseline"): _gzip(6),
    ("zstd", "baseline"): _zstd(3),
}

# Baseline jobs: gzip 6 and zstd 3 are only available this way; gzip 1 reuses gzip fast.
BASELINE_KEYS = [("gzip", "baseline"), ("gzip", "fast"), ("zstd", "baseline")]


def timed_median(fn: Callable[[], object]) -> tuple[float, int, object]:
    """Run fn at least once, repeating while under the time budget (max MAX_REPEATS).

    Returns (median seconds, repeats, last return value).
    """
    times: list[float] = []
    spent = 0.0
    value: object = None
    while not times or (spent < TIME_BUDGET_S and len(times) < MAX_REPEATS):
        start = time.perf_counter()
        value = fn()
        elapsed = time.perf_counter() - start
        times.append(elapsed)
        spent += elapsed
    return statistics.median(times), len(times), value


def run_job(
    data: bytes, compressor: str, setting: str, is_baseline: bool = False
) -> tuple[JobResult, bytes | None]:
    codec = CODECS[(compressor, setting)]
    base = dict(
        compressor=compressor,
        setting=setting,
        level_label=codec.label,
        original_bytes=len(data),
        is_baseline=is_baseline,
    )
    try:
        compress_s, c_repeats, out = timed_median(lambda: codec.compress(data))
        assert isinstance(out, bytes)
        decompress_s, _d_repeats, back = timed_median(lambda: codec.decompress(out))
        if back != data:
            raise ValueError("round trip did not match the original")
        result = JobResult(
            **base,
            status="ok",
            compressed_bytes=len(out),
            compress_s=compress_s,
            decompress_s=decompress_s,
            repeats=c_repeats,
        )
        return result, out
    except Exception as exc:  # one failing job must not stop the others
        return JobResult(**base, status="failed", error=str(exc) or type(exc).__name__), None


def plan_jobs(included: list[str]) -> list[tuple[str, str]]:
    return [(c, s) for c in COMPRESSORS if c in included for s in ("fast", "strong")]


def run_benchmark(data: bytes, included: list[str]) -> Iterator[tuple[JobResult, bytes | None]]:
    """Yield one (result, compressed bytes) per job: hidden baselines first, then the 12 jobs."""
    jobs = plan_jobs(included)
    for key in BASELINE_KEYS:
        if key in jobs:
            continue  # a normal job covers it; its result is flagged as baseline-capable later
        yield run_job(data, *key, is_baseline=True)
    for key in jobs:
        yield run_job(data, *key)
