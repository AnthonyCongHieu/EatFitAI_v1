import json
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from audit_sources import is_auditable_manifest_row, source_zip_reference  # noqa: E402
from build_clean_dataset import clean_dataset, filter_audit_rows_by_policy  # noqa: E402
from build_kaggle_training_package import assert_passing_final_audit  # noqa: E402
from kaggle_raw_audit_kernel import find_raw_manifest  # noqa: E402
from make_sample_grids import add_diverse_sample, compact_label, select_diverse_samples, source_class_names  # noqa: E402
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

    def test_clean_build_uses_audit_class_names_when_data_yaml_is_missing(self):
        from PIL import Image  # type: ignore

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "mounted" / "dataset"
            image_dir = source_dir / "images" / "test"
            label_dir = source_dir / "labels" / "test"
            image_dir.mkdir(parents=True)
            label_dir.mkdir(parents=True)
            Image.new("RGB", (64, 64), color=(255, 255, 255)).save(image_dir / "sample.png")
            (label_dir / "sample.txt").write_text("1 0.5 0.5 0.5 0.5\n", encoding="utf-8")
            audit_rows = [
                {
                    "source_slug": "vietfood67",
                    "decision": "ACCEPT_FILTERED",
                    "extracted_path": source_dir.as_posix(),
                    "class_names_raw": json.dumps({"0": "pho", "1": "banh mi"}, ensure_ascii=False),
                }
            ]
            taxonomy = {"classes": ["banh_mi"], "aliases": {"banh_mi": ["banh mi"]}}
            out_dataset = root / "clean"
            out_reports = root / "reports"

            summary = clean_dataset(audit_rows, taxonomy, out_dataset, out_reports)
            labels = list((out_dataset / "train" / "labels").glob("*.txt"))
            labels.extend((out_dataset / "valid" / "labels").glob("*.txt"))
            labels.extend((out_dataset / "test" / "labels").glob("*.txt"))
            label_text = labels[0].read_text(encoding="utf-8") if labels else ""

        self.assertEqual(summary["images"], 1)
        self.assertEqual(summary["retained_instances"], 1)
        self.assertEqual(len(labels), 1)
        self.assertTrue(label_text.startswith("0 "))

    def test_source_policy_filters_default_and_noncommercial_lanes(self):
        audit_rows = [
            {"source_slug": "core", "decision": "ACCEPT_FILTERED"},
            {"source_slug": "held", "decision": "ACCEPT_FILTERED"},
            {"source_slug": "vietfood67", "decision": "ACCEPT_FILTERED"},
        ]
        policy = {
            "core": {
                "include_in_default_clean": "yes",
                "license_lane": "cc_by_4",
                "clean_lane": "FIRST_CLEAN_CORE",
            },
            "held": {
                "include_in_default_clean": "no",
                "license_lane": "cc_by_4",
                "clean_lane": "HOLD",
            },
            "vietfood67": {
                "include_in_default_clean": "yes",
                "license_lane": "noncommercial_only",
                "clean_lane": "NONCOMMERCIAL_PRIVATE_BACKBONE",
            },
        }

        default_rows = filter_audit_rows_by_policy(audit_rows, policy)
        private_rows = filter_audit_rows_by_policy(audit_rows, policy, include_noncommercial=True)

        self.assertEqual([row["source_slug"] for row in default_rows], ["core"])
        self.assertEqual([row["source_slug"] for row in private_rows], ["core", "vietfood67"])
        self.assertEqual(private_rows[1]["clean_lane"], "NONCOMMERCIAL_PRIVATE_BACKBONE")

    def test_sample_grid_uses_audit_class_names_when_data_yaml_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            names = source_class_names(
                {"class_names_raw": json.dumps({"0": "pho", "1": "banh mi"}, ensure_ascii=False)},
                root,
            )

        self.assertEqual(names[1], "banh mi")

    def test_sample_grid_selects_class_diverse_images_before_repeats(self):
        samples = [
            (Path("cheese1.jpg"), [{"class_id": 47}]),
            (Path("cheese2.jpg"), [{"class_id": 47}]),
            (Path("egg.jpg"), [{"class_id": 56}]),
            (Path("rice.jpg"), [{"class_id": 25}]),
        ]

        selected = select_diverse_samples(samples, max_images=3)

        self.assertEqual([path.name for path, _rows in selected], ["cheese1.jpg", "egg.jpg", "rice.jpg"])

    def test_sample_grid_compacts_parenthetical_class_labels(self):
        self.assertEqual(compact_label("Pho mai (Cheese)"), "Pho mai")
        self.assertEqual(compact_label("Banh mi"), "Banh mi")

    def test_sample_grid_streaming_sampler_stops_after_enough_unique_classes(self):
        selected = []
        fallback = []
        covered = set()
        for path, rows in [
            (Path("cheese1.jpg"), [{"class_id": 47}]),
            (Path("cheese2.jpg"), [{"class_id": 47}]),
            (Path("egg.jpg"), [{"class_id": 56}]),
        ]:
            add_diverse_sample(selected, fallback, covered, path, rows, max_images=2)
            if len(selected) >= 2:
                break

        self.assertEqual([path.name for path, _rows in selected], ["cheese1.jpg", "egg.jpg"])
        self.assertEqual([path.name for path, _rows in fallback], ["cheese2.jpg"])


if __name__ == "__main__":
    unittest.main()
