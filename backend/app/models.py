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


class RowTimes(BaseModel):
    static_s: float
    dynamic_s: float


class Recommendation(BaseModel):
    static: ModeRecommendation
    dynamic: ModeRecommendation


class Analysis(BaseModel):
    network_mbps: float
    original_bytes: int
    rows: dict[str, RowTimes]  # "compressor/setting" -> time to the user, both modes
    recommendation: Recommendation
