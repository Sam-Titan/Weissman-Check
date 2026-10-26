"""Single source of truth for the answer: pure functions, no I/O."""

import math
from collections import Counter
from collections.abc import Callable, Iterable

from .models import (
    AlreadyCompressed,
    Analysis,
    GaugeScales,
    GzipDefault,
    JobResult,
    ModeRecommendation,
    Range,
    Recommendation,
    RowSummary,
    RowTimes,
    ScoreCell,
)

NETWORK_MBPS = 20  # assumed "4G" speed, stated on the banner
BROWSER_COMPRESSORS = {"gzip", "brotli", "zstd"}
# Weissman: time units (seconds -> unit) and baselines (the result each score is measured against)
UNITS = {"s": 1.0, "ms": 1e3, "us": 1e6}
BASELINES = {
    "gzip6": ("gzip", "baseline"),
    "gzip1": ("gzip", "fast"),
    "zstd3": ("zstd", "baseline"),
}
TOO_SMALL_S = 0.001  # every option within 1 ms of the best: the choice does not matter
PACKED_ENTROPY_BITS = 7.5  # above this many bits per byte the data is already dense
PACKED_MAGIC = (  # leading bytes of formats that are already compressed (docx/xlsx/pptx are zip)
    b"PK\x03\x04",
    b"PK\x05\x06",
    b"\x1f\x8b",
    b"BZh",
    b"\xfd7zXZ\x00",
    b"\x28\xb5\x2f\xfd",
    b"7z\xbc\xaf\x27\x1c",
    b"Rar!",
    b"%PDF-",
    b"\x89PNG\r\n\x1a\n",
    b"\xff\xd8\xff",
    b"GIF8",
    b"ID3",
    b"\xff\xfb",
    b"\xff\xf3",
    b"OggS",
    b"fLaC",
    b"\x1a\x45\xdf\xa3",
)
PACKED_EXTENSIONS = {
    "docx",
    "xlsx",
    "pptx",
    "odt",
    "ods",
    "odp",
    "epub",
    "jar",
    "apk",
    "zip",
    "gz",
    "tgz",
    "bz2",
    "xz",
    "zst",
    "br",
    "7z",
    "rar",
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "avif",
    "heic",
    "mp3",
    "aac",
    "ogg",
    "flac",
    "m4a",
    "mp4",
    "m4v",
    "mov",
    "mkv",
    "webm",
}
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
    too_small = len(rows) > 1 and max(time_fn(r) for r in rows) - fastest <= TOO_SMALL_S
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
        too_small_to_matter=too_small,
    )


def weissman_cell(r: float, t: float, r_base: float, t_base: float) -> ScoreCell:
    """W = (r / r_base) * (ln t_base / ln t), natural log, alpha = 1. Never NaN or infinity."""

    def undefined(note: str) -> ScoreCell:
        return ScoreCell(status="undefined", value=None, note=note)

    if not all(math.isfinite(x) for x in (r, t, r_base, t_base)):
        return undefined("A time of zero (or less) has no logarithm.")
    if t <= 0 or t_base <= 0:
        return undefined("A time of zero (or less) has no logarithm.")
    if r_base <= 0:
        return undefined("The baseline produced no compressed output to compare with.")
    ln_t, ln_base = math.log(t), math.log(t_base)
    if abs(ln_t) < 1e-12:
        return undefined("Time equals exactly 1 unit, so the score divides by zero.")
    if abs(ln_base) < 1e-12:
        return undefined("Baseline time equals exactly 1 unit, so the score is meaningless.")
    if (ln_t < 0) != (ln_base < 0):
        return undefined(
            "One time is under 1 unit and the other over, so the score would be negative."
        )
    value = (r / r_base) * (ln_base / ln_t)
    if not math.isfinite(value):
        return undefined("The score overflowed.")
    if ln_t < 0:
        return ScoreCell(
            status="flagged",
            value=value,
            note="Times under 1 unit have negative logs, so faster runs score lower here.",
        )
    return ScoreCell(status="ok", value=value, note="")


def _weissman_tables(
    rows: list[JobResult], everything: dict[tuple[str, str], JobResult]
) -> dict[str, dict[str, dict[str, ScoreCell]]]:
    tables: dict[str, dict[str, dict[str, ScoreCell]]] = {}
    for unit, factor in UNITS.items():
        tables[unit] = {}
        for name, key in BASELINES.items():
            base = everything.get(key)
            cells: dict[str, ScoreCell] = {}
            for row in rows:
                label = f"{row.compressor}/{row.setting}"
                if base is None:
                    cells[label] = ScoreCell(
                        status="undefined", value=None, note="The baseline run failed."
                    )
                    continue
                cells[label] = weissman_cell(
                    row.original_bytes / row.compressed_bytes,
                    row.compress_s * factor,
                    base.original_bytes / base.compressed_bytes,
                    base.compress_s * factor,
                )
            tables[unit][name] = cells
    return tables


def _mbps(r: JobResult) -> float:
    return r.original_bytes / 1e6 / r.decompress_s if r.decompress_s > 0 else 0.0


def _range(values: list[float]) -> Range:
    return Range(min=min(values), max=max(values)) if values else Range(min=0.0, max=0.0)


def _gauges(rows: list[JobResult], everything: dict[tuple[str, str], JobResult]) -> GaugeScales:
    gzip6 = everything.get(BASELINES["gzip6"])
    return GaugeScales(
        time_static=_range([static_time(r) for r in rows]),
        time_dynamic=_range([dynamic_time(r) for r in rows]),
        decompress_mbps=_range([_mbps(r) for r in rows]),
        gzip_default=GzipDefault(
            saved_percent=(1 - gzip6.compressed_bytes / gzip6.original_bytes) * 100,
            decompress_mbps=_mbps(gzip6),
            static_s=static_time(gzip6),
            dynamic_s=dynamic_time(gzip6),
        )
        if gzip6
        else None,
    )


def _entropy_bits(data: bytes) -> float:
    n = len(data)
    return -sum(c / n * math.log2(c / n) for c in Counter(data).values()) if n else 0.0


def _is_packed_format(data: bytes, filename: str) -> bool:
    head = data[:16]
    riff_media = head[:4] == b"RIFF" and head[8:12] in (b"WEBP", b"AVI ")
    mp4 = head[4:8] == b"ftyp"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return head.startswith(PACKED_MAGIC) or riff_media or mp4 or ext in PACKED_EXTENSIONS


def _already_compressed(
    rows: list[JobResult], data: bytes, filename: str
) -> AlreadyCompressed | None:
    if not rows or not data:
        return None
    bits = _entropy_bits(data)
    dense = bits > PACKED_ENTROPY_BITS
    if not dense and not _is_packed_format(data, filename):
        return None
    best = max((1 - r.compressed_bytes / r.original_bytes) * 100 for r in rows)
    what = "mostly packed data" if dense else "a packed file format"
    ending = (
        "Ship it as is."
        if best < 5
        else "Some gain is possible, but it is probably not worth the extra work."
    )
    return AlreadyCompressed(
        entropy_bits=bits,
        best_saved_percent=best,
        reason="entropy" if dense else "format",
        message=(
            f"Already compressed: this file is {what} (entropy {bits:.2f} bits/byte). "
            f"Compressing it again saves about {max(best, 0):.1f}% at best. {ending}"
        ),
    )


def analyse(results: Iterable[JobResult], data: bytes = b"", filename: str = "") -> Analysis:
    results = list(results)
    rows = [r for r in results if r.status == "ok" and not r.is_baseline]
    everything = {(r.compressor, r.setting): r for r in results if r.status == "ok"}
    return Analysis(
        network_mbps=NETWORK_MBPS,
        original_bytes=rows[0].original_bytes if rows else 0,
        rows={
            f"{r.compressor}/{r.setting}": RowTimes(
                compress_s=r.compress_s,
                saved_percent=(1 - r.compressed_bytes / r.original_bytes) * 100,
                decompress_mbps=_mbps(r),
                transfer_s=transfer_s(r.compressed_bytes),
                decompress_s=r.decompress_s,
                static_s=static_time(r),
                dynamic_s=dynamic_time(r),
            )
            for r in rows
        },
        gauges=_gauges(rows, everything),
        weissman=_weissman_tables(rows, everything),
        recommendation=Recommendation(
            static=_recommend(rows, static_time),
            dynamic=_recommend(rows, dynamic_time),
        ),
        already_compressed=_already_compressed(rows, data, filename),
    )
