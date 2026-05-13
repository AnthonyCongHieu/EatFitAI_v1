import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import kaggle_v4_source_audit_kernel as audit_kernel  # noqa: E402


ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = ROOT / "ai-provider" / "dataset_v2"


class DatasetV2V4SourceAuditTests(unittest.TestCase):
    def test_classification_imagefolder_audit_counts_classes_and_splits(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for split in ("train", "val", "test"):
                for class_name, count in {"Ga Chien": 2, "Bun-Bo-Hue": 1}.items():
                    class_dir = root / split / class_name
                    class_dir.mkdir(parents=True)
                    for idx in range(count):
                        (class_dir / f"{idx}.jpg").write_bytes(b"fake image")

            source_row, candidates = audit_kernel.audit_classification_imagefolder_source(
                {
                    "dataset_ref": "owner/example",
                    "source_format": "classification_imagefolder",
                    "decision": "PRIORITY_AUDIT",
                },
                root,
            )

            self.assertEqual(source_row["status"], "audited")
            self.assertEqual(source_row["class_count"], 2)
            self.assertEqual(source_row["image_count"], 9)
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["ga_chien"]["images"], 6)
            self.assertEqual(by_name["bun_bo_hue"]["images"], 3)
            self.assertIn("train", by_name["ga_chien"]["split_counts_json"])
            self.assertEqual(by_name["ga_chien"]["candidate_origin"], "classification_pseudo_box_review")

    def test_yolo_root_detection_finds_nested_data_yaml_with_split_dirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dataset = root / "nested" / "dataset"
            (dataset / "images" / "train").mkdir(parents=True)
            (dataset / "labels" / "train").mkdir(parents=True)
            (dataset / "data.yaml").write_text("names:\n  0: pho\n", encoding="utf-8")

            self.assertEqual(audit_kernel.find_yolo_root(root), dataset)

    def test_v4_audit_metadata_is_cpu_only_and_mounts_priority_sources(self):
        metadata = json.loads((DATASET_DIR / "kaggle_v4_source_audit_kernel_metadata.json").read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_v4_source_audit_kernel.py")
        self.assertFalse(metadata["enable_gpu"])
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-pipeline-code", metadata["dataset_sources"])
        self.assertIn("karos2504/100-vietnamese-food", metadata["dataset_sources"])
        self.assertIn("fontainenathan/foodseg103", metadata["dataset_sources"])

    def test_v4_policy_requires_high_ceiling_before_gpu_train(self):
        policy = (DATASET_DIR / "clean_v4_target_policy.yaml").read_text(encoding="utf-8")

        self.assertIn("minimum_to_spend_gpu: 300", policy)
        self.assertIn("max_ceiling_goal: 340", policy)
        self.assertIn("hard_stop_above: 420", policy)

    def test_v4_kernel_compiles_from_isolated_entrypoint_without_repo_sys_path(self):
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "py_compile",
                str(DATASET_DIR / "kaggle_v4_source_audit_kernel.py"),
            ],
            cwd=Path(tempfile.gettempdir()),
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
