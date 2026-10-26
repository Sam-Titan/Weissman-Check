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
