"""Real benchmark on the bundled samples: the static and dynamic winners must differ somewhere."""

from pathlib import Path

from backend.app.analysis import analyse
from backend.app.benchmark import COMPRESSORS, run_benchmark

SAMPLES = Path(__file__).parent.parent / "app" / "samples"


def test_at_least_one_sample_flips_between_static_and_dynamic():
    outcomes = {}
    for path in sorted(SAMPLES.iterdir()):
        results = [r for r, _ in run_benchmark(path.read_bytes(), COMPRESSORS)]
        rec = analyse(results).recommendation
        outcomes[path.name] = (
            f"{rec.static.winner.compressor}/{rec.static.winner.setting}",
            f"{rec.dynamic.winner.compressor}/{rec.dynamic.winner.setting}",
        )
    print(outcomes)
    assert any(s != d for s, d in outcomes.values()), outcomes
