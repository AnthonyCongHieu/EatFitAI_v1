import json
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from audit_sources import is_auditable_manifest_row, source_zip_reference  # noqa: E402
from build_kaggle_training_package import assert_passing_final_audit  # noqa: E402
from kaggle_raw_audit_kernel import find_raw_manifest  # noqa: E402
from validate_clean_dataset import validate  # noqa: E402


class DatasetV2PipelineHandoffTests(unittest.TestCase):
    def test_audit_manifest_prefers_package_path_and_skips_non_copied_rows(self):
        self.assertEqual(
            source_zip_reference(
                {
                    "source_slug": "keep",
                    "drive_zip_name": "Drive Name.zip",
                    "package_path": "nested/keep.zip",
                }
            ),
            "nested/keep.zip",
        )
        self.assertEqual(source_zip_reference({"source_slug": "audit_row", "zip_name": "audit.zip"}), "audit.zip")
        self.assertTrue(is_auditable_manifest_row({"status": "copied"}))
        self.assertTrue(is_auditable_manifest_row({"status": ""}))
        self.assertFalse(is_auditable_manifest_row({"status": "missing_local_zip"}))
        self.assertFalse(is_auditable_manifest_row({"status": "skipped_quarantine"}))

    def test_raw_audit_kernel_finds_raw_source_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assertIsNone(find_raw_manifest(root))

            manifest = root / "raw_source_manifest.csv"
            manifest.write_text("source_slug,package_path\nkeep,keep.zip\n", encoding="utf-8")

            self.assertEqual(find_raw_manifest(root), manifest)

    def test_empty_clean_dataset_splits_fail_hard_gate(self):
        with tempfile.TemporaryDirectory() as tmp:
            dataset = Path(tmp) / "clean_dataset"
            for split in ("train", "valid", "test"):
                (dataset / split / "images").mkdir(parents=True)
                (dataset / split / "labels").mkdir(parents=True)
            (dataset / "data.yaml").write_text(
                "path: .\ntrain: train/images\nval: valid/images\ntest: test/images\nnames:\n  0: banh_mi\n",
                encoding="utf-8",
            )

            summary = validate(dataset)

            self.assertFalse(summary["hard_gate_passed"])
            self.assertIn({"empty_splits": ["train", "valid", "test"]}, summary["warnings"])

    def test_training_package_requires_passing_final_audit(self):
        with tempfile.TemporaryDirectory() as tmp:
            reports = Path(tmp) / "reports"
            reports.mkdir()

            with self.assertRaises(FileNotFoundError):
                assert_passing_final_audit(reports)

            (reports / "final_audit_summary.json").write_text(
                json.dumps({"hard_gate_passed": False}, ensure_ascii=False),
                encoding="utf-8",
            )
            with self.assertRaises(RuntimeError):
                assert_passing_final_audit(reports)

            (reports / "final_audit_summary.json").write_text(
                json.dumps({"hard_gate_passed": True}, ensure_ascii=False),
                encoding="utf-8",
            )
            self.assertEqual(assert_passing_final_audit(reports)["hard_gate_passed"], True)


if __name__ == "__main__":
    unittest.main()
