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
