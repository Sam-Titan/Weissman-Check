import io
import random
import zipfile

import pytest

from backend.app.analysis import analyse
from backend.tests.test_recommend import ZSTD_FAST, job


def fake_docx() -> bytes:
    """A small zip shaped like a .docx: a few XML parts packed into a zip container."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("word/document.xml", random.Random(1).randbytes(20_000).hex())
    return buf.getvalue()


def barely_smaller(size=990_000):
    return job("zstd", "fast", size, 0.012, 0.004)


def test_docx_like_zip_gets_the_already_compressed_verdict():
    data = fake_docx()
    packed = analyse([barely_smaller()], data, "report.docx").already_compressed
    assert packed is not None
    assert packed.message.startswith("Already compressed:")
    assert "bits/byte" in packed.message
    assert packed.best_saved_percent == pytest.approx(1.0)
    assert packed.message.endswith("Ship it as is.")


def test_dense_bytes_with_no_known_name_are_caught_by_entropy():
    data = random.Random(2).randbytes(50_000)
    packed = analyse([barely_smaller()], data, "mystery").already_compressed
    assert packed is not None and packed.reason == "entropy" and packed.entropy_bits > 7.5


def test_known_magic_is_caught_even_with_a_misleading_name():
    packed = analyse([barely_smaller()], b"PK\x03\x04" + b"a" * 100, "notes.txt").already_compressed
    assert packed is not None and packed.reason == "format"


def test_plain_text_is_not_flagged():
    data = b"GET /api/users 200 12\n" * 500
    for name in ("app.log", "data.csv", "icon.svg", "main.ts", "page.html"):
        assert analyse([ZSTD_FAST], data, name).already_compressed is None


def test_a_big_saving_changes_the_wording():
    packed = analyse([barely_smaller(600_000)], fake_docx(), "x.zip").already_compressed
    assert packed is not None and "Ship it as is" not in packed.message
