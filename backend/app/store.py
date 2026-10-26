"""In-memory run store: at most 3 runs, dropped after 10 minutes."""

import threading
import time
import uuid
from dataclasses import dataclass, field

MAX_RUNS = 3
TTL_S = 600


@dataclass
class Run:
    data: bytes
    included: list[str]
    name: str = "file"  # the uploaded file's name, used for download filenames
    outputs: dict[tuple[str, str], bytes] = field(default_factory=dict)
    created_at: float = field(default_factory=time.monotonic)
    running: bool = False
    cancelled: bool = False  # set when the browser disconnects mid-run


class RunStore:
    def __init__(self) -> None:
        self._runs: dict[str, Run] = {}
        self._lock = threading.Lock()

    def _prune(self) -> None:
        now = time.monotonic()
        for rid in [r for r, run in self._runs.items() if now - run.created_at > TTL_S]:
            del self._runs[rid]
        while len(self._runs) > MAX_RUNS:
            del self._runs[min(self._runs, key=lambda r: self._runs[r].created_at)]

    def any_running(self) -> bool:
        with self._lock:
            return any(r.running for r in self._runs.values())

    def create(self, data: bytes, included: list[str], name: str = "file") -> str:
        with self._lock:
            self._prune()
            rid = uuid.uuid4().hex[:12]
            self._runs[rid] = Run(data, included, name)
            self._prune()
            return rid

    def get(self, run_id: str) -> Run | None:
        with self._lock:
            self._prune()
            return self._runs.get(run_id)


store = RunStore()
