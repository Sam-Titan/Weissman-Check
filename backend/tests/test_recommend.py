from backend.app.analysis import analyse
from backend.app.models import JobResult


def job(compressor, setting, size, compress_s, decompress_s, *, status="ok", baseline=False):
    return JobResult(
        compressor=compressor,
        setting=setting,
        level_label="x",
        status=status,
        original_bytes=1_000_000,
        compressed_bytes=size,
        compress_s=compress_s,
        decompress_s=decompress_s,
        is_baseline=baseline,
    )


# The spec's worked example: 1,000,000 bytes at 20 Mbit/s.
ZSTD_FAST = job("zstd", "fast", 230_000, 0.012, 0.004)
BROTLI_STRONG = job("brotli", "strong", 150_000, 1.100, 0.006)


def test_worked_example_flips_between_static_and_dynamic():
    rec = analyse([ZSTD_FAST, BROTLI_STRONG]).recommendation
    assert rec.static.winner.compressor == "brotli"
    assert rec.dynamic.winner.compressor == "zstd"
    assert round(rec.static.winner.delivery_s, 3) == 0.066
    assert round(rec.dynamic.winner.delivery_s, 3) == 0.108


def test_banner_fields_and_assumed_speed():
    result = analyse([ZSTD_FAST, BROTLI_STRONG])
    assert result.network_mbps == 20
    w = result.recommendation.static.winner
    assert w.percent_saved == 85.0
    assert round(w.decompress_mbps) == round(1 / 0.006)


def test_browser_best_ignores_non_browser_compressors():
    xz = job("xz", "strong", 100_000, 0.5, 0.01)
    rec = analyse([xz, BROTLI_STRONG, ZSTD_FAST]).recommendation
    assert rec.static.winner.compressor == "xz"
    assert rec.static.browser_best.compressor == "brotli"


def test_browser_best_equals_winner_when_winner_is_browser_supported():
    rec = analyse([ZSTD_FAST, BROTLI_STRONG]).recommendation
    assert rec.static.browser_best == rec.static.winner


def test_failed_and_baseline_rows_are_ignored():
    failed = job("xz", "strong", 1, 0.0, 0.0, status="failed")
    base = job("gzip", "baseline", 1, 0.0, 0.0, baseline=True)
    rec = analyse([failed, base, ZSTD_FAST]).recommendation
    assert rec.static.winner.compressor == "zstd"


def test_all_failed_returns_null_winners():
    failed = job("xz", "strong", 0, 0.0, 0.0, status="failed")
    rec = analyse([failed]).recommendation
    assert rec.static.winner is None and rec.dynamic.winner is None
    assert rec.static.browser_best is None


def test_near_tie_prefers_browser_supported_then_smaller():
    # 20 Mbit/s = 2.5 MB/s. a: 150,000 B -> 0.060 + 0.006 = 0.066 s; b: 152,000 B -> 0.0668 s.
    brotli = job("brotli", "strong", 150_000, 1.0, 0.006)
    zstd = job("zstd", "strong", 152_000, 1.0, 0.006)
    rec = analyse([zstd, brotli]).recommendation.static
    assert rec.near_tie and rec.winner.compressor == "brotli"
    assert rec.runner_up.compressor == "zstd" and rec.tie_reason == "smaller"


def test_near_tie_browser_supported_beats_slightly_faster_non_browser():
    xz = job("xz", "strong", 148_000, 1.0, 0.006)  # fastest by a hair
    brotli = job("brotli", "strong", 150_000, 1.0, 0.006)
    rec = analyse([xz, brotli]).recommendation.static
    assert rec.near_tie and rec.winner.compressor == "brotli"
    assert rec.runner_up.compressor == "xz" and rec.tie_reason == "browser"


def test_no_tie_outside_five_percent():
    rec = analyse([ZSTD_FAST, BROTLI_STRONG]).recommendation
    assert not rec.static.near_tie and rec.static.runner_up is None
    assert not rec.dynamic.near_tie


def test_tie_applies_to_dynamic_too():
    a = job("zstd", "fast", 200_000, 0.010, 0.004)
    b = job("gzip", "fast", 200_000, 0.0102, 0.004)
    rec = analyse([a, b]).recommendation.dynamic
    assert rec.near_tie and rec.winner.compressor in {"zstd", "gzip"}


def test_per_row_times_are_exposed():
    result = analyse([ZSTD_FAST, BROTLI_STRONG])
    assert result.original_bytes == 1_000_000
    t = result.rows["brotli/strong"]
    assert round(t.static_s, 3) == 0.066 and round(t.dynamic_s, 3) == 1.166


def test_chart_parts_add_up_to_the_totals():
    t = analyse([ZSTD_FAST, BROTLI_STRONG]).rows["zstd/fast"]
    assert (t.compress_s, round(t.transfer_s, 3), t.decompress_s) == (0.012, 0.092, 0.004)
    assert t.static_s == t.transfer_s + t.decompress_s
    assert t.dynamic_s == t.compress_s + t.transfer_s + t.decompress_s


def tiny(compressor, setting, size, compress_s, decompress_s):
    r = job(compressor, setting, size, compress_s, decompress_s)
    return r.model_copy(update={"original_bytes": 2_000})


def test_tiny_file_is_too_small_to_matter():
    # 2 KB file: every option reaches a user in well under 1 ms of the best, in both modes.
    rows = [
        tiny("gzip", "fast", 900, 0.00005, 0.00002),
        tiny("brotli", "strong", 700, 0.00030, 0.00003),
        tiny("zstd", "fast", 800, 0.00004, 0.00002),
    ]
    rec = analyse(rows).recommendation
    assert rec.static.too_small_to_matter and rec.dynamic.too_small_to_matter
    assert rec.static.winner is not None  # still the fastest, for the gauges' default


def test_normal_file_is_not_too_small():
    rec = analyse([ZSTD_FAST, BROTLI_STRONG]).recommendation
    assert not rec.static.too_small_to_matter and not rec.dynamic.too_small_to_matter


def test_too_small_is_judged_per_mode():
    # Static times are equal (same size, same decompress) but dynamic differs by 50 ms.
    slow = tiny("gzip", "strong", 800, 0.050, 0.00002)
    fast = tiny("zstd", "fast", 800, 0.00004, 0.00002)
    rec = analyse([slow, fast]).recommendation
    assert rec.static.too_small_to_matter and not rec.dynamic.too_small_to_matter


def test_one_compressor_alone_is_never_too_small_to_matter():
    rec = analyse([tiny("gzip", "fast", 900, 0.0001, 0.00002)]).recommendation
    assert not rec.static.too_small_to_matter


def test_gauge_data_is_precomputed():
    gzip6 = job("gzip", "baseline", 210_000, 0.030, 0.005, baseline=True)
    result = analyse([gzip6, ZSTD_FAST, BROTLI_STRONG])
    row = result.rows["zstd/fast"]
    assert row.saved_percent == 77.0
    assert round(row.decompress_mbps) == 250
    g = result.gauges
    assert round(g.time_static.min, 3) == 0.066 and round(g.time_static.max, 3) == 0.096
    assert round(g.time_dynamic.max, 3) == 1.166
    assert g.gzip_default is not None and g.gzip_default.saved_percent == 79.0
    assert analyse([ZSTD_FAST]).gauges.gzip_default is None
