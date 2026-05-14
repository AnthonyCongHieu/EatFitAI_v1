import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image


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

    def test_annotation_pool_audit_counts_coco_instances_and_unique_images_per_category(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            annotations = root / "annotations.json"
            annotations.write_text(
                json.dumps(
                    {
                        "images": [
                            {"id": 10, "file_name": "a.jpg"},
                            {"id": 11, "file_name": "b.jpg"},
                            {"id": 12, "file_name": "c.jpg"},
                        ],
                        "categories": [
                            {"id": 1, "name": "Banh Bao"},
                            {"id": 2, "name": "Canh Chua"},
                        ],
                        "annotations": [
                            {"id": 1, "image_id": 10, "category_id": 1},
                            {"id": 2, "image_id": 10, "category_id": 1},
                            {"id": 3, "image_id": 11, "category_id": 1},
                            {"id": 4, "image_id": 12, "category_id": 2},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            for name in ("a.jpg", "b.jpg", "c.jpg"):
                (root / name).write_bytes(b"fake image")

            source_row, candidates = audit_kernel.audit_annotation_or_file_pool_source(
                {
                    "dataset_ref": "owner/food-recognition",
                    "source_format": "real_world_food_images_or_annotations",
                    "decision": "PRIORITY_AUDIT",
                },
                root,
            )

            self.assertEqual(source_row["status"], "audited")
            self.assertEqual(source_row["class_count"], 2)
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["banh_bao"]["instances"], 3)
            self.assertEqual(by_name["banh_bao"]["images"], 2)
            self.assertEqual(by_name["canh_chua"]["instances"], 1)
            self.assertEqual(by_name["canh_chua"]["images"], 1)
            self.assertEqual(by_name["banh_bao"]["candidate_origin"], "annotation_category_review")

    def test_foodseg_mask_audit_counts_classes_from_grayscale_masks(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            ann_dir = root / "Images" / "ann_dir" / "train"
            ann_dir.mkdir(parents=True)
            first = Image.new("L", (4, 4), 0)
            first.putpixel((0, 0), 58)  # bread
            first.putpixel((1, 0), 84)  # carrot
            first.save(ann_dir / "0001.png")
            second = Image.new("L", (4, 4), 0)
            second.putpixel((0, 0), 58)  # bread
            second.putpixel((1, 0), 73)  # tomato
            second.save(ann_dir / "0002.png")

            source_row, candidates = audit_kernel.audit_segmentation_source(
                {
                    "dataset_ref": "fontainenathan/foodseg103",
                    "source_format": "semantic_segmentation",
                    "decision": "PRIORITY_AUDIT",
                },
                root,
            )

            self.assertEqual(source_row["status"], "audited")
            self.assertEqual(source_row["audit_mode"], "semantic_segmentation_mask_to_bbox_audit")
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["bread"]["images"], 2)
            self.assertEqual(by_name["bread"]["instances"], 2)
            self.assertEqual(by_name["carrot"]["images"], 1)
            self.assertEqual(by_name["tomato"]["images"], 1)
            self.assertEqual(by_name["bread"]["candidate_origin"], "semantic_mask_to_bbox_review")

    def test_v4_audit_metadata_is_cpu_only_and_mounts_priority_sources(self):
        metadata = json.loads((DATASET_DIR / "kaggle_v4_source_audit_kernel_metadata.json").read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_v4_source_audit_kernel.py")
        self.assertFalse(metadata["enable_gpu"])
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-pipeline-code", metadata["dataset_sources"])
        self.assertIn("karos2504/100-vietnamese-food", metadata["dataset_sources"])
        self.assertIn("fontainenathan/foodseg103", metadata["dataset_sources"])
        self.assertIn("henningheyen/lvis-fruits-and-vegetables-dataset", metadata["dataset_sources"])
        self.assertIn("shashwatwork/segfood-dataset-for-semantic-food-segmentation", metadata["dataset_sources"])
        self.assertIn("warcoder/fruit-recognition-and-calories-estimation", metadata["dataset_sources"])

    def test_v4_bulk_expansion_manifest_marks_safe_and_held_sources(self):
        manifest_path = DATASET_DIR / "clean_v4_external_source_candidates_2026-05-13.csv"
        rows = {
            row["dataset_ref"]: row
            for row in csv.DictReader(manifest_path.read_text(encoding="utf-8").splitlines())
        }

        self.assertEqual(rows["henningheyen/lvis-fruits-and-vegetables-dataset"]["license"], "MIT")
        self.assertEqual(rows["henningheyen/lvis-fruits-and-vegetables-dataset"]["source_format"], "yolo_detection")
        self.assertEqual(rows["henningheyen/lvis-fruits-and-vegetables-dataset"]["decision"], "PRIORITY_AUDIT")
        self.assertEqual(rows["shashwatwork/segfood-dataset-for-semantic-food-segmentation"]["license"], "CC-BY-4.0")
        self.assertEqual(rows["shashwatwork/segfood-dataset-for-semantic-food-segmentation"]["decision"], "PRIORITY_AUDIT")
        self.assertEqual(rows["nguyentrongdai/vietnamese-foods-dataset"]["decision"], "HOLD_LICENSE")
        self.assertEqual(rows["keno31/vietnaemese-food-dataset"]["decision"], "HOLD_LICENSE")
        self.assertEqual(rows["trainingdatapro/food-segmentation"]["decision"], "HOLD_NONCOMMERCIAL_NODERIVATIVE")
        self.assertEqual(rows["thezaza102/tray-food-segmentation"]["decision"], "REJECT_LICENSE")

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
