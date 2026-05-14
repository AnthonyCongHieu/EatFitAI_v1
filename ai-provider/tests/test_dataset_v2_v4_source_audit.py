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

    def test_classification_imagefolder_audit_maps_numeric_class_dirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for class_id in ("000", "001"):
                class_dir = root / "train600x600" / class_id
                class_dir.mkdir(parents=True)
                (class_dir / "0.jpg").write_bytes(b"fake image")
            class_map = root / "cnfood241_class_names.yaml"
            class_map.write_text(
                "cnfood241:\n"
                "  names:\n"
                "    0: Mapo Tofu\n"
                "    1: Home style sauteed Tofu\n",
                encoding="utf-8",
            )

            source_row, candidates = audit_kernel.audit_classification_imagefolder_source(
                {
                    "dataset_ref": "owner/cnfood-241",
                    "source_format": "classification_imagefolder",
                    "decision": "PRIORITY_AUDIT_PRIVATE_ONLY",
                    "class_names_file": str(class_map),
                    "class_names_key": "cnfood241",
                },
                root,
            )

            self.assertIn("external_class_map_used", source_row["warnings"])
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["mapo_tofu"]["images"], 1)
            self.assertEqual(by_name["home_style_sauteed_tofu"]["images"], 1)

    def test_classification_csv_audit_counts_class_labels(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "train_images" / "train_images").mkdir(parents=True)
            for name in ("a.jpg", "b.jpg", "c.jpg"):
                (root / "train_images" / "train_images" / name).write_bytes(b"fake image")
            (root / "train_img.csv").write_text(
                "ImageId,ClassName\n"
                "a.jpg,pizza-margherita-baked\n"
                "b.jpg,pizza-margherita-baked\n"
                "c.jpg,dark-chocolate\n",
                encoding="utf-8",
            )

            source_row, candidates = audit_kernel.audit_classification_csv_source(
                {
                    "dataset_ref": "owner/food-classification",
                    "source_format": "classification_csv",
                    "decision": "PRIORITY_AUDIT",
                    "csv_label_file": "train_img.csv",
                    "csv_image_column": "ImageId",
                    "csv_class_column": "ClassName",
                    "csv_split": "train",
                },
                root,
            )

            self.assertEqual(source_row["audit_mode"], "classification_csv")
            self.assertEqual(source_row["class_count"], 2)
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["pizza_margherita_baked"]["images"], 2)
            self.assertEqual(by_name["pizza_margherita_baked"]["instances"], 2)
            self.assertIn("train", by_name["pizza_margherita_baked"]["split_counts_json"])

    def test_uecfood_audit_counts_bbox_metadata_with_category_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dataset = root / "UECFOOD256"
            dataset.mkdir()
            (dataset / "category.txt").write_text("id\tname\n1\trice\n2\teels on rice\n", encoding="utf-8")
            for class_id, rows in {
                "1": ["img x1 y1 x2 y2", "1 0 0 100 100", "2 1 1 99 99"],
                "2": ["img x1 y1 x2 y2", "3 0 0 50 50 60 60 100 100"],
            }.items():
                class_dir = dataset / class_id
                class_dir.mkdir()
                (class_dir / "bb_info.txt").write_text("\n".join(rows) + "\n", encoding="utf-8")
                (class_dir / "1.jpg").write_bytes(b"fake image")

            source_row, candidates = audit_kernel.audit_uecfood_source(
                {
                    "dataset_ref": "rkuo2000/uecfood256",
                    "source_format": "uecfood256_bbox",
                    "decision": "HOLD_LICENSE",
                },
                root,
            )

            self.assertEqual(source_row["audit_mode"], "uecfood_bbox_metadata")
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["rice"]["images"], 2)
            self.assertEqual(by_name["rice"]["instances"], 2)
            self.assertEqual(by_name["eels_on_rice"]["images"], 1)
            self.assertEqual(by_name["eels_on_rice"]["instances"], 2)

    def test_yolo_root_detection_finds_nested_data_yaml_with_split_dirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dataset = root / "nested" / "dataset"
            (dataset / "images" / "train").mkdir(parents=True)
            (dataset / "labels" / "train").mkdir(parents=True)
            (dataset / "data.yaml").write_text("names:\n  0: pho\n", encoding="utf-8")

            self.assertEqual(audit_kernel.find_yolo_root(root), dataset)

    def test_yolo_source_without_data_yaml_uses_external_class_map(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mounted = root / "vietfood68"
            image = mounted / "dataset" / "images" / "train" / "sample.jpg"
            label = mounted / "dataset" / "labels" / "train" / "sample.txt"
            image.parent.mkdir(parents=True)
            label.parent.mkdir(parents=True)
            image.write_bytes(b"fake image")
            label.write_text("1 0.5 0.5 0.2 0.2\n", encoding="utf-8")
            class_map = root / "vietfood67_class_names.yaml"
            class_map.write_text(
                "vietfood68:\n"
                "  names:\n"
                "    0: Banh canh\n"
                "    1: Banh chung\n",
                encoding="utf-8",
            )

            source_row, candidates = audit_kernel.audit_source(
                {
                    "dataset_ref": "owner/vietfood68",
                    "source_format": "yolo_detection",
                    "decision": "PRIORITY_AUDIT_PRIVATE_ONLY",
                    "class_names_file": str(class_map),
                    "class_names_key": "vietfood68",
                },
                root=root,
            )

            self.assertEqual(source_row["audit_mode"], "yolo_detection")
            self.assertEqual(source_row["class_count"], 2)
            self.assertEqual(source_row["candidate_count"], 1)
            self.assertIn("external_class_map_used", source_row["warnings"])
            self.assertEqual(candidates[0]["raw_class_name"], "Banh chung")

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

    def test_annotation_pool_audit_counts_vqa_dish_labels_with_unique_images(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            annotations = root / "annotations" / "train.json"
            annotations.parent.mkdir(parents=True)
            annotations.write_text(
                json.dumps(
                    [
                        {"id": "1", "image": "bun_dau_001.jpg", "image_id": "img-1", "dish": "bun_dau_mam_tom"},
                        {"id": "2", "image": "bun_dau_001_aug_0.jpg", "image_id": "img-1", "dish": "bun_dau_mam_tom"},
                        {"id": "3", "image": "xoi_xeo_001.jpg", "image_id": "img-2", "dish": "xoi_xeo"},
                    ]
                ),
                encoding="utf-8",
            )
            for name in ("bun_dau_001.jpg", "bun_dau_001_aug_0.jpg", "xoi_xeo_001.jpg"):
                image = root / "images" / "raw" / "train" / name
                image.parent.mkdir(parents=True, exist_ok=True)
                image.write_bytes(b"fake image")

            source_row, candidates = audit_kernel.audit_annotation_or_file_pool_source(
                {
                    "dataset_ref": "owner/foodlensvn",
                    "source_format": "vqa_image_pool",
                    "decision": "HOLD_PROVENANCE_SAMPLE_ONLY",
                },
                root,
            )

            self.assertEqual(source_row["status"], "audited")
            by_name = {row["normalized_class_name"]: row for row in candidates}
            self.assertEqual(by_name["bun_dau_mam_tom"]["instances"], 2)
            self.assertEqual(by_name["bun_dau_mam_tom"]["images"], 1)
            self.assertEqual(by_name["xoi_xeo"]["images"], 1)
            self.assertEqual(by_name["bun_dau_mam_tom"]["candidate_origin"], "vqa_dish_label_review")

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
        self.assertIn("kyoru4444/foodlensvn", metadata["dataset_sources"])
        self.assertIn("trungquncao/vietnamese-food", metadata["dataset_sources"])

    def test_v4_targeted_vietnamese_audit_metadata_is_cpu_only_and_small_scope(self):
        metadata = json.loads(
            (DATASET_DIR / "kaggle_v4_targeted_vietnamese_source_audit_kernel_metadata.json").read_text(
                encoding="utf-8"
            )
        )

        self.assertEqual(metadata["code_file"], "kaggle_v4_targeted_vietnamese_source_audit_kernel.py")
        self.assertFalse(metadata["enable_gpu"])
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-pipeline-code", metadata["dataset_sources"])
        self.assertIn("thomasnguyen6868/vietfood68", metadata["dataset_sources"])
        self.assertIn("kyoru4444/foodlensvn", metadata["dataset_sources"])
        self.assertNotIn("kmader/food41", metadata["dataset_sources"])
        self.assertNotIn("yihfeng/chinesefoodnet", metadata["dataset_sources"])

    def test_v4_class_expansion_audit_metadata_is_cpu_only_and_mounts_new_sources(self):
        metadata = json.loads(
            (DATASET_DIR / "kaggle_v4_class_expansion_source_audit_kernel_metadata.json").read_text(encoding="utf-8")
        )

        self.assertEqual(metadata["code_file"], "kaggle_v4_class_expansion_source_audit_kernel.py")
        self.assertFalse(metadata["enable_gpu"])
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-pipeline-code", metadata["dataset_sources"])
        self.assertIn("bjoernjostein/food-classification", metadata["dataset_sources"])
        self.assertIn("zachaluza/cnfood-241", metadata["dataset_sources"])
        self.assertIn("rkuo2000/uecfood256", metadata["dataset_sources"])
        self.assertNotIn("rock3yu/dimsum50-0-1", metadata["dataset_sources"])

    def test_v4_class_expansion_clean_build_metadata_is_cpu_only_and_mounts_included_sources(self):
        metadata = json.loads(
            (DATASET_DIR / "kaggle_clean_build_v4_class_expansion_kernel_metadata.json").read_text(encoding="utf-8")
        )

        self.assertEqual(metadata["code_file"], "kaggle_clean_build_v4_class_expansion_kernel.py")
        self.assertFalse(metadata["enable_gpu"])
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-pipeline-code", metadata["dataset_sources"])
        self.assertIn("zachaluza/cnfood-241", metadata["dataset_sources"])
        self.assertIn("bjoernjostein/food-classification", metadata["dataset_sources"])
        self.assertIn("fontainenathan/foodseg103", metadata["dataset_sources"])
        self.assertNotIn("rkuo2000/uecfood256", metadata["dataset_sources"])

    def test_v4_class_expansion_manifest_separates_public_private_and_blocked_sources(self):
        manifest_path = DATASET_DIR / "clean_v4_class_expansion_source_candidates_2026-05-14.csv"
        rows = {
            row["dataset_ref"]: row
            for row in csv.DictReader(manifest_path.read_text(encoding="utf-8").splitlines())
        }

        self.assertEqual(rows["bjoernjostein/food-classification"]["source_format"], "classification_csv")
        self.assertEqual(rows["bjoernjostein/food-classification"]["decision"], "PRIORITY_AUDIT")
        self.assertEqual(rows["bjoernjostein/food-classification"]["csv_label_file"], "train_img.csv")
        self.assertEqual(rows["zachaluza/cnfood-241"]["decision"], "PRIORITY_AUDIT_PRIVATE_ONLY")
        self.assertEqual(rows["zachaluza/cnfood-241"]["class_names_file"], "cnfood241_class_names_2026-05-14.yaml")
        self.assertEqual(rows["rkuo2000/uecfood256"]["decision"], "HOLD_LICENSE")
        self.assertEqual(rows["rkuo2000/uecfood256"]["source_format"], "uecfood256_bbox")
        self.assertEqual(rows["rock3yu/dimsum50-0-1"]["decision"], "REJECT_ADAPTER_PENDING")

    def test_v4_targeted_vietnamese_manifest_marks_license_holds(self):
        manifest_path = DATASET_DIR / "clean_v4_targeted_vietnamese_source_candidates_2026-05-14.csv"
        rows = {
            row["dataset_ref"]: row
            for row in csv.DictReader(manifest_path.read_text(encoding="utf-8").splitlines())
        }

        self.assertEqual(rows["thomasnguyen6868/vietfood68"]["decision"], "PRIORITY_AUDIT_PRIVATE_ONLY")
        self.assertEqual(rows["thomasnguyen6868/vietfood68"]["source_format"], "yolo_detection")
        self.assertEqual(rows["thomasnguyen6868/vietfood68"]["next_gate"], "yolo_source_audit")
        self.assertEqual(rows["thomasnguyen6868/vietfood68"]["class_names_file"], "vietfood67_class_names_2026-05-14.yaml")
        self.assertEqual(rows["thomasnguyen6868/vietfood68"]["class_names_key"], "vietfood68")
        self.assertEqual(rows["kyoru4444/foodlensvn"]["decision"], "HOLD_PROVENANCE_SAMPLE_ONLY")
        self.assertEqual(rows["phvngtngtm/foodlensvn"]["license"], "CC-BY-SA-4.0")
        self.assertEqual(rows["trungquncao/vietnamese-food"]["license"], "MIT")
        self.assertEqual(rows["lenguyentrung/vietnamese-food"]["decision"], "HOLD_LICENSE")

    def test_vietfood67_external_class_map_has_expected_count(self):
        class_map = (DATASET_DIR / "vietfood67_class_names_2026-05-14.yaml").read_text(encoding="utf-8")

        self.assertIn("dataset_ref: thomasnguyen6868/vietfood68", class_map)
        self.assertIn("0: Banh canh", class_map)
        self.assertIn("67: Sup cua", class_map)

    def test_v4_class_expansion_external_class_maps_have_expected_counts(self):
        uec_map = (DATASET_DIR / "uecfood256_class_names_2026-05-14.yaml").read_text(encoding="utf-8")
        cnfood_map = (DATASET_DIR / "cnfood241_class_names_2026-05-14.yaml").read_text(encoding="utf-8")

        self.assertIn("dataset_ref: rkuo2000/uecfood256", uec_map)
        self.assertIn("1: rice", uec_map)
        self.assertIn("256: hot & sour soup", uec_map)
        self.assertIn("dataset_ref: zachaluza/cnfood-241", cnfood_map)
        self.assertIn("0: Mapo Tofu", cnfood_map)
        self.assertIn("240: clay pot rice", cnfood_map)

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
        self.assertEqual(rows["kyoru4444/foodlensvn"]["license"], "MIT")
        self.assertEqual(rows["kyoru4444/foodlensvn"]["decision"], "HOLD_PROVENANCE_SAMPLE_ONLY")
        self.assertEqual(rows["trungquncao/vietnamese-food"]["license"], "MIT")
        self.assertEqual(rows["trungquncao/vietnamese-food"]["decision"], "AUDIT_TINY_REFERENCE")

    def test_v4_policy_requires_high_ceiling_before_gpu_train(self):
        policy = (DATASET_DIR / "clean_v4_target_policy.yaml").read_text(encoding="utf-8")

        self.assertIn("minimum_to_spend_gpu: 300", policy)
        self.assertIn("max_ceiling_goal: 340", policy)
        self.assertIn("hard_stop_above: 420", policy)

    def test_v4_kernel_compiles_from_isolated_entrypoint_without_repo_sys_path(self):
        for script_name in (
            "kaggle_v4_source_audit_kernel.py",
            "kaggle_v4_targeted_vietnamese_source_audit_kernel.py",
            "kaggle_v4_class_expansion_source_audit_kernel.py",
            "kaggle_clean_build_v4_class_expansion_kernel.py",
            "build_clean_dataset_v4_from_kaggle_sources.py",
        ):
            with self.subTest(script_name=script_name):
                result = subprocess.run(
                    [
                        sys.executable,
                        "-m",
                        "py_compile",
                        str(DATASET_DIR / script_name),
                    ],
                    cwd=Path(tempfile.gettempdir()),
                    text=True,
                    capture_output=True,
                    check=False,
                )

                self.assertEqual(result.returncode, 0, result.stderr)

    def test_v4_targeted_kernel_imports_base_from_isolated_entrypoint(self):
        script = DATASET_DIR / "kaggle_v4_targeted_vietnamese_source_audit_kernel.py"
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                f"import runpy; runpy.run_path({str(script)!r})",
            ],
            cwd=Path(tempfile.gettempdir()),
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
