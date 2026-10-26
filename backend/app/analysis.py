"""Single source of truth for the answer: pure functions, no I/O."""

from collections.abc import Callable, Iterable

from .models import (
    Analysis,
    JobResult,
    ModeRecommendation,
    Recommendation,
    RowSummary,
    RowTimes,
)

NETWORK_MBPS = 20  # assumed "4G" speed, stated on the banner
BROWSER_COMPRESSORS = {"gzip", "brotli", "zstd"}
TIE_FRACTION = 0.05  # a runner-up within 5% of the winner's time counts as a near tie


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


def _tie_key(r: JobResult) -> tuple[bool, int]:
    """Tie-break order: browser-supported first, then smaller output."""
    return (r.compressor not in BROWSER_COMPRESSORS, r.compressed_bytes)


def _recommend(rows: list[JobResult], time_fn: Callable[[JobResult], float]) -> ModeRecommendation:
    if not rows:
        return ModeRecommendation(winner=None, browser_best=None)
    fastest = min(time_fn(r) for r in rows)
    tied = sorted(
        (r for r in rows if time_fn(r) <= fastest * (1 + TIE_FRACTION)),
        key=lambda r: (_tie_key(r), time_fn(r)),
    )
    winner = tied[0]
    runner_up = tied[1] if len(tied) > 1 else None
    reason = None
    if runner_up:
        winner_in = winner.compressor in BROWSER_COMPRESSORS
        runner_in = runner_up.compressor in BROWSER_COMPRESSORS
        reason = "browser" if winner_in and not runner_in else "smaller"
    browser_rows = [r for r in rows if r.compressor in BROWSER_COMPRESSORS]
    browser_best = min(browser_rows, key=time_fn) if browser_rows else None
    if winner.compressor in BROWSER_COMPRESSORS:
        browser_best = winner
    return ModeRecommendation(
        winner=_summary(winner, time_fn),
        browser_best=_summary(browser_best, time_fn) if browser_best else None,
        near_tie=runner_up is not None,
        runner_up=_summary(runner_up, time_fn) if runner_up else None,
        tie_reason=reason,
    )


def analyse(results: Iterable[JobResult]) -> Analysis:
    rows = [r for r in results if r.status == "ok" and not r.is_baseline]
    return Analysis(
        network_mbps=NETWORK_MBPS,
        original_bytes=rows[0].original_bytes if rows else 0,
        rows={
            f"{r.compressor}/{r.setting}": RowTimes(
                static_s=static_time(r), dynamic_s=dynamic_time(r)
            )
            for r in rows
        },
        recommendation=Recommendation(
            static=_recommend(rows, static_time),
            dynamic=_recommend(rows, dynamic_time),
        ),
    )
