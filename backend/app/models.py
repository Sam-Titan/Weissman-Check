from typing import Literal

from pydantic import BaseModel

Setting = Literal["fast", "strong", "baseline"]


class JobId(BaseModel):
    compressor: str
    setting: Setting
    level_label: str


class RunCreated(BaseModel):
    run_id: str
    jobs: list[JobId]
    baselines: list[JobId]


class JobResult(BaseModel):
    compressor: str
    setting: Setting
    level_label: str
    status: Literal["ok", "failed"]
    original_bytes: int
    compressed_bytes: int = 0
    compress_s: float = 0.0
    decompress_s: float = 0.0
    repeats: int = 0
    is_baseline: bool = False
    error: str | None = None


class RowSummary(BaseModel):
    compressor: str
    setting: Setting
    level_label: str
    compressed_bytes: int
    percent_saved: float
    decompress_mbps: float
    delivery_s: float


class ModeRecommendation(BaseModel):
    winner: RowSummary | None
    browser_best: RowSummary | None
    near_tie: bool = False
    runner_up: RowSummary | None = None
    tie_reason: Literal["browser", "smaller"] | None = None
    # every option is within 1 ms of the best: the choice does not matter for this file
    too_small_to_matter: bool = False


class RowTimes(BaseModel):
    """Time to the user: the three parts (for the delivery chart) and the totals per mode."""

    compress_s: float
    transfer_s: float
    decompress_s: float
    saved_percent: float
    decompress_mbps: float
    static_s: float  # transfer + decompress
    dynamic_s: float  # compress + transfer + decompress


class Recommendation(BaseModel):
    static: ModeRecommendation
    dynamic: ModeRecommendation


class ScoreCell(BaseModel):
    status: Literal["ok", "flagged", "undefined"]
    value: float | None
    note: str  # one line; empty when status is "ok"


class Range(BaseModel):
    min: float
    max: float


class GzipDefault(BaseModel):
    """Where gzip level 6 (the common default) lands, for the gauges' reference tick."""

    saved_percent: float
    decompress_mbps: float
    static_s: float
    dynamic_s: float


class GaugeScales(BaseModel):
    """Scale ends for the scorecard gauges: the fastest and slowest in this run."""

    time_static: Range
    time_dynamic: Range
    decompress_mbps: Range
    gzip_default: GzipDefault | None


class AlreadyCompressed(BaseModel):
    entropy_bits: float
    best_saved_percent: float
    reason: Literal[
        "entropy", "format"
    ]  # entropy > 7.5, or a known packed format (magic bytes / extension)
    message: str  # the banner sentence, worded from the actual results


class Analysis(BaseModel):
    network_mbps: float
    original_bytes: int
    rows: dict[str, RowTimes]  # "compressor/setting" -> time to the user, both modes
    # weissman[unit][baseline]["compressor/setting"]: all 9 unit x baseline tables, precomputed
    weissman: dict[str, dict[str, dict[str, ScoreCell]]]
    gauges: GaugeScales
    recommendation: Recommendation
    already_compressed: AlreadyCompressed | None = None
