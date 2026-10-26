"""Single source of truth for the answer: pure functions, no I/O."""

from collections.abc import Callable, Iterable

from .models import Analysis, JobResult, ModeRecommendation, Recommendation, RowSummary

NETWORK_MBPS = 20  # assumed "4G" speed, stated on the banner
BROWSER_COMPRESSORS = {"gzip", "brotli", "zstd"}


def transfer_s(compressed_bytes: int) -> float:
    return compressed_bytes / (NETWORK_MBPS * 1_000_000 / 8)


def static_time(r: JobResult) -> float:
    """Compressed once, served many times: compress time is free."""
    return transfer_s(r.compressed_bytes) + r.decompress_s


def dynamic_time(r: JobResult) -> float:
    """Compressed on every request: compress time counts."""
    return r.compress_s + static_time(r)


def _summary(r: JobResult, time_fn: Callable[[JobResult], float]) -> RowSummary:
    return RowSummary(
        compressor=r.compressor,
        setting=r.setting,
        level_label=r.level_label,
        compressed_bytes=r.compressed_bytes,
        percent_saved=(1 - r.compressed_bytes / r.original_bytes) * 100,
        decompress_mbps=r.original_bytes / 1e6 / r.decompress_s if r.decompress_s > 0 else 0.0,
        delivery_s=time_fn(r),
    )


def _recommend(rows: list[JobResult], time_fn: Callable[[JobResult], float]) -> ModeRecommendation:
    if not rows:
        return ModeRecommendation(winner=None, browser_best=None)
    winner = min(rows, key=time_fn)
    browser_rows = [r for r in rows if r.compressor in BROWSER_COMPRESSORS]
    browser_best = min(browser_rows, key=time_fn) if browser_rows else None
    return ModeRecommendation(
        winner=_summary(winner, time_fn),
        browser_best=_summary(browser_best, time_fn) if browser_best else None,
    )


def analyse(results: Iterable[JobResult]) -> Analysis:
    rows = [r for r in results if r.status == "ok" and not r.is_baseline]
    return Analysis(
        network_mbps=NETWORK_MBPS,
        recommendation=Recommendation(
            static=_recommend(rows, static_time),
            dynamic=_recommend(rows, dynamic_time),
        ),
    )
