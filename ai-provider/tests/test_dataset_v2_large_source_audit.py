import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from common import load_yaml  # noqa: E402
from kaggle_large_source_audit_kernel import (  # noqa: E402
    LARGE_SOURCE_SCOPE,
    KAGGLE_LARGE_REPORTS_ZIP,
    add_large_source_to_cache_package,
    build_kaggle_direct_manifest_row,
    build_roboflow_export_endpoint,
    find_kaggle_dataset_source_dir,
    is_safe_cloud_path,
    should_cache_large_source,
)


ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "ai-provider" / "dataset_v2" / "raw_source_registry.yaml"
LARGE_SCOPE = ROOT / "ai-provider" / "dataset_v2" / "large_source_scope.2026-05-05.csv"
LARGE_KERNEL_METADATA = ROOT / "ai-provider" / "dataset_v2" / "kaggle_large_source_audit_kernel_metadata.json"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


class DatasetV2LargeSourceAuditTests(unittest.TestCase):
    def test_large_source_scope_records_two_special_lanes(self):
        rows = read_csv(LARGE_SCOPE)
        by_slug = {row["source_slug"]: row for row in rows}

        self.assertEqual(set(by_slug), {"food_data_truongvo", "vietfood67"})
        self.assertEqual(by_slug["food_data_truongvo"]["audit_mode"], "roboflow_export")
        self.assertEqual(by_slug["food_data_truongvo"]["cache_policy"], "cache_after_audit")
        self.assertEqual(by_slug["vietfood67"]["audit_mode"], "kaggle_dataset_direct")
        self.assertEqual(by_slug["vietfood67"]["cache_policy"], "no_raw_cache")
        self.assertIn("CC BY-NC-SA", by_slug["vietfood67"]["license"])

    def test_registry_has_food_data_truongvo_export_metadata(self):
        registry = load_yaml(REGISTRY)
        row = registry["roboflow_sources"]["food_data_truongvo"]

        self.assertEqual(row["workspace"], "truongvo")
        self.assertEqual(row["project"], "food-data-e2kl5-vqaqp")
        self.assertEqual(row["version"], 1)
        self.assertEqual(row["format"], "yolov11")
        self.assertLess(int(row["expected_export_size_bytes"]), 20_000_000_000)

    def test_roboflow_endpoint_uses_export_path_without_secret_value(self):
        endpoint = build_roboflow_export_endpoint(
            {"workspace": "truongvo", "project": "food-data-e2kl5-vqaqp", "version": "1", "format": "yolov11"}
        )

        self.assertEqual(endpoint, "https://api.roboflow.com/truongvo/food-data-e2kl5-vqaqp/1/yolov11")
        self.assertNotIn("api_key", endpoint)

    def test_large_source_cache_policy_only_caches_roboflow_lane(self):
        self.assertTrue(should_cache_large_source({"source_slug": "food_data_truongvo", "cache_policy": "cache_after_audit"}))
        self.assertFalse(should_cache_large_source({"source_slug": "vietfood67", "cache_policy": "no_raw_cache"}))

    def test_large_kernel_metadata_mounts_vietfood67_directly(self):
        metadata = json.loads(LARGE_KERNEL_METADATA.read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_large_source_audit_kernel.py")
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-pipeline-code", metadata["dataset_sources"])
        self.assertIn("thomasnguyen6868/vietfood68", metadata["dataset_sources"])
        self.assertTrue(metadata["enable_internet"])
        self.assertTrue(metadata["is_private"])

    def test_kaggle_dataset_source_dir_finds_dataset_subfolder(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dataset = root / "vietfood68" / "dataset"
            (dataset / "images" / "train").mkdir(parents=True)
            (dataset / "labels" / "train").mkdir(parents=True)
            (dataset / "data.yaml").write_text("names: ['pho']\n", encoding="utf-8")

            self.assertEqual(find_kaggle_dataset_source_dir(root, "vietfood68", "dataset"), dataset)

    def test_kaggle_dataset_source_dir_finds_nested_datasets_mount(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dataset = root / "datasets" / "thomasnguyen6868" / "vietfood68" / "dataset"
            (dataset / "images" / "test").mkdir(parents=True)
            (dataset / "labels" / "test").mkdir(parents=True)
            (dataset / "data.yaml").write_text("names: ['pho']\n", encoding="utf-8")

            self.assertEqual(find_kaggle_dataset_source_dir(root, "vietfood68", "dataset"), dataset)

    def test_kaggle_direct_manifest_row_uses_extracted_path_and_no_raw_cache(self):
        row = build_kaggle_direct_manifest_row(
            {"source_slug": "vietfood67", "initial_decision": "LICENSE_RISK_AUDIT_ONLY"},
            Path("/kaggle/input/vietfood68/dataset"),
        )

        self.assertEqual(row["source_slug"], "vietfood67")
        self.assertEqual(row["extracted_path"], "/kaggle/input/vietfood68/dataset")
        self.assertEqual(row["status"], "found")
        self.assertEqual(row["cache_policy"], "no_raw_cache")

    def test_cloud_paths_reject_windows_and_relative_destinations(self):
        self.assertTrue(is_safe_cloud_path(Path("/tmp/eatfitai_large/a.zip")))
        self.assertTrue(is_safe_cloud_path(Path("/kaggle/working/report.zip")))
        self.assertFalse(is_safe_cloud_path(Path("E:/tool edit/eatfitai_v1/raw.zip")))
        self.assertFalse(is_safe_cloud_path(Path("relative/raw.zip")))
        self.assertEqual(KAGGLE_LARGE_REPORTS_ZIP.as_posix(), "/kaggle/working/dataset_v2_large_source_audit_reports.zip")
        self.assertEqual(LARGE_SOURCE_SCOPE, "large_source_scope.2026-05-05.csv")

    def test_large_source_cache_package_uses_requested_cache_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            zip_path = root / "food_data_truongvo.v1i.yolov11.zip"
            zip_path.write_bytes(b"zip-bytes")
            cache_dir = root / "cache"

            row = add_large_source_to_cache_package(
                {"source_slug": "food_data_truongvo", "license": "CC BY 4.0"},
                zip_path,
                cache_dir=cache_dir,
            )

            self.assertEqual(row["cache_path"], zip_path.name)
            self.assertTrue((cache_dir / zip_path.name).exists())
            self.assertTrue((cache_dir / "dataset-metadata.json").exists())

    def test_audit_sources_accepts_extracted_path_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "mounted" / "dataset"
            image_dir = source_dir / "train" / "images"
            label_dir = source_dir / "train" / "labels"
            image_dir.mkdir(parents=True)
            label_dir.mkdir(parents=True)
            (source_dir / "data.yaml").write_text("names:\n  0: pho\n", encoding="utf-8")
            image_bytes = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
                b"\x00\x05\xfe\x02\xfeA\xe2`\x82\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            (image_dir / "sample.png").write_bytes(image_bytes)
            (label_dir / "sample.txt").write_text("0 0.5 0.5 0.5 0.5\n", encoding="utf-8")
            manifest = root / "manifest.csv"
            manifest.write_text(
                "source_slug,extracted_path,status,initial_decision,audit_image_limit\n"
                f"mounted_viet,{source_dir.as_posix()},found,PENDING_AUDIT,\n",
                encoding="utf-8",
            )
            out_dir = root / "reports"
            work_dir = root / "work"

            subprocess.run(
                [
                    sys.executable,
                    str(DATASET_V2_DIR / "audit_sources.py"),
                    "--manifest",
                    str(manifest),
                    "--work-dir",
                    str(work_dir),
                    "--out-dir",
                    str(out_dir),
                ],
                check=True,
            )
            rows = json.loads((out_dir / "source_audit.json").read_text(encoding="utf-8"))

        self.assertEqual(rows[0]["source_slug"], "mounted_viet")
        self.assertEqual(rows[0]["package_path"], source_dir.as_posix())
        self.assertEqual(rows[0]["image_count"], 1)
        self.assertEqual(rows[0]["detect_row_count"], 1)

    def test_audit_sources_accepts_images_split_labels_split_layout(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "mounted" / "dataset"
            image_dir = source_dir / "images" / "test"
            label_dir = source_dir / "labels" / "test"
            image_dir.mkdir(parents=True)
            label_dir.mkdir(parents=True)
            (source_dir / "data.yaml").write_text("names:\n  0: pho\n", encoding="utf-8")
            image_bytes = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
                b"\x00\x05\xfe\x02\xfeA\xe2`\x82\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            (image_dir / "sample.png").write_bytes(image_bytes)
            (label_dir / "sample.txt").write_text("0 0.5 0.5 0.5 0.5\n", encoding="utf-8")
            manifest = root / "manifest.csv"
            manifest.write_text(
                "source_slug,extracted_path,status,initial_decision,audit_image_limit\n"
                f"mounted_viet,{source_dir.as_posix()},found,PENDING_AUDIT,\n",
                encoding="utf-8",
            )
            out_dir = root / "reports"

            subprocess.run(
                [
                    sys.executable,
                    str(DATASET_V2_DIR / "audit_sources.py"),
                    "--manifest",
                    str(manifest),
                    "--work-dir",
                    str(root / "work"),
                    "--out-dir",
                    str(out_dir),
                ],
                check=True,
            )
            rows = json.loads((out_dir / "source_audit.json").read_text(encoding="utf-8"))

        self.assertEqual(rows[0]["image_count"], 1)
        self.assertEqual(rows[0]["detect_row_count"], 1)

    def test_audit_sources_uses_manifest_class_map_when_data_yaml_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "mounted" / "dataset"
            image_dir = source_dir / "images" / "test"
            label_dir = source_dir / "labels" / "test"
            image_dir.mkdir(parents=True)
            label_dir.mkdir(parents=True)
            image_bytes = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
                b"\x00\x05\xfe\x02\xfeA\xe2`\x82\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            (image_dir / "sample.png").write_bytes(image_bytes)
            (label_dir / "sample.txt").write_text("1 0.5 0.5 0.5 0.5\n", encoding="utf-8")
            class_map = root / "source_class_maps.yaml"
            class_map.write_text(
                "vietfood67:\n"
                "  names:\n"
                "    - pho\n"
                "    - banh mi\n",
                encoding="utf-8",
            )
            manifest = root / "manifest.csv"
            manifest.write_text(
                "source_slug,extracted_path,status,initial_decision,class_names_file,class_names_key\n"
                f"vietfood67,{source_dir.as_posix()},found,LICENSE_RISK_AUDIT_ONLY,{class_map.as_posix()},vietfood67\n",
                encoding="utf-8",
            )
            out_dir = root / "reports"

            subprocess.run(
                [
                    sys.executable,
                    str(DATASET_V2_DIR / "audit_sources.py"),
                    "--manifest",
                    str(manifest),
                    "--work-dir",
                    str(root / "work"),
                    "--out-dir",
                    str(out_dir),
                ],
                check=True,
            )
            rows = json.loads((out_dir / "source_audit.json").read_text(encoding="utf-8"))
            with (out_dir / "class_candidates.csv").open("r", encoding="utf-8") as f:
                candidates = list(csv.DictReader(f))

        self.assertFalse(rows[0]["data_yaml_found"])
        self.assertEqual(rows[0]["class_count"], 2)
        self.assertEqual(rows[0]["class_names_external_found"], True)
        self.assertNotEqual(rows[0]["decision"], "QUARANTINE")
        self.assertEqual(candidates[0]["raw_class_name"], "banh mi")

    def test_audit_sources_respects_manifest_image_limit_for_large_mounts(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "mounted" / "dataset"
            image_dir = source_dir / "images" / "test"
            label_dir = source_dir / "labels" / "test"
            image_dir.mkdir(parents=True)
            label_dir.mkdir(parents=True)
            (source_dir / "data.yaml").write_text("names:\n  0: pho\n", encoding="utf-8")
            image_bytes = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
                b"\x00\x05\xfe\x02\xfeA\xe2`\x82\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            for index in range(2):
                (image_dir / f"sample{index}.png").write_bytes(image_bytes)
                (label_dir / f"sample{index}.txt").write_text("0 0.5 0.5 0.5 0.5\n", encoding="utf-8")
            manifest = root / "manifest.csv"
            manifest.write_text(
                "source_slug,extracted_path,status,initial_decision,audit_image_limit\n"
                f"mounted_viet,{source_dir.as_posix()},found,PENDING_AUDIT,1\n",
                encoding="utf-8",
            )
            out_dir = root / "reports"

            subprocess.run(
                [
                    sys.executable,
                    str(DATASET_V2_DIR / "audit_sources.py"),
                    "--manifest",
                    str(manifest),
                    "--work-dir",
                    str(root / "work"),
                    "--out-dir",
                    str(out_dir),
                ],
                check=True,
            )
            rows = json.loads((out_dir / "source_audit.json").read_text(encoding="utf-8"))

        self.assertEqual(rows[0]["image_count"], 1)
        self.assertEqual(rows[0]["audit_image_limit"], 1)
        self.assertEqual(rows[0]["audit_image_count_skipped"], 1)
        self.assertEqual(rows[0]["audit_scope"], "sampled")

    def test_audit_sources_fast_sample_does_not_require_exact_skip_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_dir = root / "mounted" / "dataset"
            image_dir = source_dir / "images" / "test"
            label_dir = source_dir / "labels" / "test"
            image_dir.mkdir(parents=True)
            label_dir.mkdir(parents=True)
            (source_dir / "data.yaml").write_text("names:\n  0: pho\n", encoding="utf-8")
            image_bytes = (
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
                b"\x00\x05\xfe\x02\xfeA\xe2`\x82\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            for index in range(2):
                (image_dir / f"sample{index}.png").write_bytes(image_bytes)
                (label_dir / f"sample{index}.txt").write_text("0 0.5 0.5 0.5 0.5\n", encoding="utf-8")
            manifest = root / "manifest.csv"
            manifest.write_text(
                "source_slug,extracted_path,status,initial_decision,audit_image_limit,audit_fast_sample\n"
                f"mounted_viet,{source_dir.as_posix()},found,PENDING_AUDIT,1,true\n",
                encoding="utf-8",
            )
            out_dir = root / "reports"

            subprocess.run(
                [
                    sys.executable,
                    str(DATASET_V2_DIR / "audit_sources.py"),
                    "--manifest",
                    str(manifest),
                    "--work-dir",
                    str(root / "work"),
                    "--out-dir",
                    str(out_dir),
                ],
                check=True,
            )
            rows = json.loads((out_dir / "source_audit.json").read_text(encoding="utf-8"))

        self.assertEqual(rows[0]["image_count"], 1)
        self.assertEqual(rows[0]["audit_scope"], "sampled")
        self.assertEqual(rows[0]["audit_fast_sample"], True)
        self.assertEqual(rows[0]["audit_image_count_skipped"], "")


if __name__ == "__main__":
    unittest.main()
