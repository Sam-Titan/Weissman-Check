import math

import pytest

from backend.app.analysis import BASELINES, UNITS, analyse, weissman_cell
from backend.app.models import JobResult


def job(compressor, setting, size, compress_s, *, baseline=False, status="ok"):
    return JobResult(
        compressor=compressor,
        setting=setting,
        level_label="x",
        status=status,
        original_bytes=1_000_000,
        compressed_bytes=size,
        compress_s=compress_s,
        decompress_s=0.004,
        is_baseline=baseline,
    )


# The spec's worked example: zstd (fast) against gzip level 6.
GZIP6 = job("gzip", "baseline", 210_000, 0.030, baseline=True)
GZIP1 = job("gzip", "fast", 280_000, 0.012, baseline=True)
ZSTD3 = job("zstd", "baseline", 220_000, 0.010, baseline=True)
ZSTD_FAST = job("zstd", "fast", 230_000, 0.012)
ALL = [GZIP6, GZIP1, ZSTD3, ZSTD_FAST]


def test_worked_example_in_three_units():
    t = analyse(ALL).weissman
    seconds = t["s"]["gzip6"]["zstd/fast"]
    assert seconds.status == "flagged" and round(seconds.value, 2) == 0.72
    millis = t["ms"]["gzip6"]["zstd/fast"]
    assert millis.status == "ok" and round(millis.value, 2) == 1.25
    micros = t["us"]["gzip6"]["zstd/fast"]
    assert micros.status == "ok" and round(micros.value, 2) == 1.00


def test_all_nine_tables_present_and_filled():
    t = analyse(ALL).weissman
    assert set(t) == set(UNITS)
    for unit in UNITS:
        assert set(t[unit]) == set(BASELINES)
        for baseline in BASELINES:
            assert set(t[unit][baseline]) == {"zstd/fast"}


def test_baseline_scores_one_against_itself():
    gzip_fast = job("gzip", "fast", 280_000, 0.012)  # a normal row that is also the gzip1 baseline
    t = analyse([GZIP6, gzip_fast, ZSTD3]).weissman
    assert t["ms"]["gzip1"]["gzip/fast"].value == pytest.approx(1.0)
    assert t["ms"]["gzip1"]["gzip/fast"].status == "ok"


@pytest.mark.parametrize(
    ("t", "t_base", "note"),
    [
        (0.0, 5.0, "zero"),
        (-1.0, 5.0, "zero"),
        (5.0, 0.0, "zero"),
        (5.0, -2.0, "zero"),
        (1.0, 5.0, "divides by zero"),
        (5.0, 1.0, "Baseline time equals exactly 1 unit"),
        (0.5, 5.0, "under 1 unit and the other over"),
        (5.0, 0.5, "under 1 unit and the other over"),
        (math.nan, 5.0, "zero"),
        (math.inf, 5.0, "zero"),
    ],
)
def test_undefined_branches(t, t_base, note):
    cell = weissman_cell(4.0, t, 4.0, t_base)
    assert cell.status == "undefined" and cell.value is None
    assert note in cell.note


def test_flagged_when_both_times_under_one_unit():
    cell = weissman_cell(4.0, 0.2, 4.0, 0.5)
    assert cell.status == "flagged" and cell.value is not None and cell.note


def test_ok_when_both_times_over_one_unit():
    cell = weissman_cell(8.0, 20.0, 4.0, 30.0)
    assert cell.status == "ok" and cell.note == ""
    assert cell.value == pytest.approx(2.0 * math.log(30) / math.log(20))


def test_zero_size_baseline_is_undefined_not_a_crash():
    assert weissman_cell(4.0, 5.0, 0.0, 5.0).status == "undefined"


def test_failed_baseline_makes_its_table_undefined():
    t = analyse([GZIP1, ZSTD3, ZSTD_FAST]).weissman  # no gzip6
    cell = t["ms"]["gzip6"]["zstd/fast"]
    assert cell.status == "undefined" and "baseline" in cell.note
    assert t["ms"]["zstd3"]["zstd/fast"].status == "ok"


def test_no_nan_or_infinity_anywhere():
    rows = [ZSTD_FAST, job("xz", "strong", 120_000, 2.5), job("lz4", "fast", 400_000, 0.0)]
    for unit in analyse(ALL + rows).weissman.values():
        for table in unit.values():
            for cell in table.values():
                assert cell.value is None or math.isfinite(cell.value)
