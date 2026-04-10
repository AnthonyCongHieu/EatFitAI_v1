from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("check_mojibake.py")
MODULE_SPEC = importlib.util.spec_from_file_location("check_mojibake", MODULE_PATH)
check_mojibake = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC.loader is not None
MODULE_SPEC.loader.exec_module(check_mojibake)


class MojibakeDetectorTests(unittest.TestCase):
    def test_has_mojibake_flags_high_confidence_sequences(self) -> None:
        samples = (
            "Kh\u00c3ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u",
            "\u00c4\u0090\u00c3 xong b\u01b0\u1edbc x\u00e1c minh",
            "Ti\u00e1\u00bap t\u1ee5c v\u1edbi lane smoke",
            "M\u00c3\u00a3 l\u1ed7i m\u00e1\u00bb\u00a5c ti\u00c3\u00aau b\u1ecb h\u1ecfng",
            "Quote \u00e2\u20ac\u2122 b\u1ecb l\u1ed7i trong text",
            f"K\u00fd t\u1ef1 thay th\u1ebf {check_mojibake.REPLACEMENT_CHARACTER} \u1edf \u0111\u00e2y",
        )

        for sample in samples:
            with self.subTest(sample=sample):
                self.assertTrue(check_mojibake.has_mojibake(sample))

    def test_has_mojibake_does_not_flag_valid_text(self) -> None:
        valid_samples = (
            "Đã tải dữ liệu UTF-8 an toàn",
            "Tiếp tục lane smoke cloud-first",
            "Không thể kết luận lỗi nếu chưa có evidence",
            "Mốc mục tiêu 2000 kcal chỉ là nhãn hiển thị",
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
                "an toan\nKh\u00c3ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u\n",
                encoding="utf-8",
            )
            skipped_path = root / "venv" / "Lib" / "site-packages" / "sample.py"
            skipped_path.parent.mkdir(parents=True, exist_ok=True)
            skipped_path.write_text("Kh\u00c3ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u\n", encoding="utf-8")

            hits = list(check_mojibake.iter_hits(root))

        self.assertEqual(len(hits), 1)
        path, line_no, line = hits[0]
        self.assertEqual(path.name, "service.py")
        self.assertEqual(line_no, 2)
        self.assertEqual(line, "Kh\u00c3ng thể tải dữ liệu")


if __name__ == "__main__":
    unittest.main()
