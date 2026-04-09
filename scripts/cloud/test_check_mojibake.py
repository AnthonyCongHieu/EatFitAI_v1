from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("check_mojibake.py")
MODULE_SPEC = importlib.util.spec_from_file_location(
    "check_mojibake", MODULE_PATH
)
check_mojibake = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC.loader is not None
MODULE_SPEC.loader.exec_module(check_mojibake)


class MojibakeDetectorTests(unittest.TestCase):
    def test_has_mojibake_flags_high_confidence_sequences(self) -> None:
        samples = (
            "Chuỗi lỗi Ä‘iển hình",
            "Chuỗi lỗi Æ°u tiên",
            "Chuỗi lỗi á»©ng dụng",
            "Chuỗi lỗi áº¥n tượng",
            "Quote lỗi â€™ trong text",
            f"Ký tự thay thế {check_mojibake.REPLACEMENT_CHARACTER} ở đây",
        )

        for sample in samples:
            with self.subTest(sample=sample):
                self.assertTrue(check_mojibake.has_mojibake(sample))

    def test_has_mojibake_does_not_flag_valid_text(self) -> None:
        valid_samples = (
            "ĐÃ TẢI dữ liệu UTF-8 an toàn",
            "TẢI dữ liệu tiếng Việt bình thường",
            "ÀÁÂÃÄÅÆÇ là chuỗi Latin-extended hợp lệ",
        )

        for sample in valid_samples:
            with self.subTest(sample=sample):
                self.assertFalse(check_mojibake.has_mojibake(sample))

    def test_should_scan_excludes_local_env_paths(self) -> None:
        repo_root = check_mojibake.REPO_ROOT
        excluded_paths = (
            repo_root / "ai-provider" / "venv" / "Lib" / "site-packages" / "sample.py",
            repo_root / "ai-provider" / ".venv" / "Lib" / "site-packages" / "sample.py",
            repo_root / "ai-provider" / "src" / "site-packages" / "sample.py",
        )

        for path in excluded_paths:
            with self.subTest(path=path):
                self.assertFalse(check_mojibake.should_scan(path))

    def test_iter_hits_reports_repo_owned_files_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            source_path = root / "service.py"
            source_path.write_text(
                "an toàn\nChuỗi lỗi Ä‘ây rồi\n",
                encoding="utf-8",
            )
            skipped_path = root / "venv" / "Lib" / "site-packages" / "sample.py"
            skipped_path.parent.mkdir(parents=True, exist_ok=True)
            skipped_path.write_text("Chuỗi lỗi Ä‘ây rồi\n", encoding="utf-8")

            hits = list(check_mojibake.iter_hits(root))

        self.assertEqual(len(hits), 1)
        path, line_no, line = hits[0]
        self.assertEqual(path.name, "service.py")
        self.assertEqual(line_no, 2)
        self.assertEqual(line, "Chuỗi lỗi Ä‘ây rồi")


if __name__ == "__main__":
    unittest.main()
