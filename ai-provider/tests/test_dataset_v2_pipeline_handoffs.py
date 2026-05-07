import json
import sys
import tempfile
import types
import unittest
import zipfile
from pathlib import Path
from unittest import mock


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from audit_sources import is_auditable_manifest_row, source_zip_reference  # noqa: E402
from build_clean_dataset import clean_dataset, filter_audit_rows_by_policy  # noqa: E402
from build_kaggle_training_package import assert_passing_final_audit  # noqa: E402
from kaggle_raw_audit_kernel import find_raw_manifest  # noqa: E402
from kaggle_clean_build_kernel import (  # noqa: E402
    cache_source_yolo_root,
    collect_cache_entries,
    collect_cache_entries_from_dirs,
    find_input_dir,
    resolve_cache_source_path,
    source_policy_included_slugs,
    strip_zip_suffixes,
)
import kaggle_public_drive_raw_audit_kernel as public_drive_kernel  # noqa: E402
from kaggle_public_drive_raw_audit_kernel import seed_existing_raw_cache_dataset  # noqa: E402
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

    def test_clean_build_kernel_resolves_mounted_cache_folder_names(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache_dir = Path(tmp) / "cache"
            source_dir = cache_dir / "Food.v6i.yolov11"
            source_dir.mkdir(parents=True)

            cache_entries = collect_cache_entries(cache_dir)
            resolved = resolve_cache_source_path(
                "food_prethesis",
                {"food_prethesis": {"expected_name": "Food.v6i.yolov11.zip"}},
                cache_entries,
            )

        self.assertEqual(strip_zip_suffixes("Food.v6i.yolov11.zip.zip"), "Food.v6i.yolov11")
        self.assertEqual(strip_zip_suffixes("Food.v6i.yolov11.zip.cache"), "Food.v6i.yolov11")
        self.assertEqual(resolved, source_dir)

    def test_clean_build_kernel_merges_cache_inputs_with_later_dirs_preferred(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            seed_cache = root / "seed_cache"
            large_cache = root / "large_cache"
            old_source = seed_cache / "food_data_truongvo"
            new_source = large_cache / "food_data_truongvo"
            old_source.mkdir(parents=True)
            new_source.mkdir(parents=True)

            cache_entries, duplicate_rows = collect_cache_entries_from_dirs([seed_cache, large_cache])
            resolved = resolve_cache_source_path("food_data_truongvo", {}, cache_entries)

        self.assertEqual(resolved, new_source)
        self.assertTrue(any(row["cache_key"] == "food_data_truongvo" for row in duplicate_rows))

    def test_clean_build_kernel_policy_includes_private_vietfood_lane(self):
        rows = [
            {"source_slug": "food_data_truongvo", "include_in_default_clean": "yes"},
            {"source_slug": "vietfood67", "include_in_default_clean": "yes", "license_lane": "private_noncommercial_accepted"},
            {"source_slug": "vegetable_detection", "include_in_default_clean": "no"},
        ]

        self.assertEqual(source_policy_included_slugs(rows), ["food_data_truongvo", "vietfood67"])

    def test_clean_build_kernel_finds_nested_kaggle_input_dataset_dirs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            nested = root / "datasets" / "hiuinhcng" / "eatfitai-dataset-v2-raw-audit-cache-v2"
            nested.mkdir(parents=True)

            self.assertEqual(find_input_dir(root, "eatfitai-dataset-v2-raw-audit-cache-v2"), nested)

    def test_public_drive_kernel_finds_direct_nested_cache_input_without_rglob(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            nested = root / "datasets" / "hiuinhcng" / "eatfitai-dataset-v2-raw-audit-cache-v2"
            nested.mkdir(parents=True)

            with mock.patch.object(Path, "rglob", side_effect=AssertionError("rglob should not be needed")):
                self.assertEqual(public_drive_kernel.find_input_dir(root, "eatfitai-dataset-v2-raw-audit-cache-v2"), nested)

    def test_raw_cache_upload_can_seed_existing_mounted_cache(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            existing = root / "datasets" / "hiuinhcng" / "eatfitai-dataset-v2-raw-audit-cache-v2" / "existing_source"
            existing.mkdir(parents=True)
            (existing / "marker.txt").write_text("ok\n", encoding="utf-8")
            cache_dir = root / "new_cache_package"

            result = seed_existing_raw_cache_dataset(cache_dir, input_root=root)

            self.assertEqual(result["seed_status"], "seeded_existing_cache")
            self.assertEqual(result["seeded_entries"], 1)
            wrapper = cache_dir / "existing_source.zip.cache"
            self.assertTrue(wrapper.exists())
            with zipfile.ZipFile(wrapper) as zf:
                self.assertIn("existing_source/marker.txt", zf.namelist())
            self.assertTrue((cache_dir / "dataset-metadata.json").exists())

    def test_raw_cache_upload_can_seed_existing_cache_from_remote_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            remote_cache = root / "downloaded_cache"
            existing = remote_cache / "existing_source"
            existing.mkdir(parents=True)
            (existing / "marker.txt").write_text("ok\n", encoding="utf-8")
            cache_dir = root / "new_cache_package"

            result = seed_existing_raw_cache_dataset(
                cache_dir,
                input_root=root / "missing_mount",
                remote_cache_getter=lambda: remote_cache,
            )

            self.assertEqual(result["seed_status"], "seeded_existing_cache_remote")
            self.assertEqual(result["seeded_entries"], 1)
            wrapper = cache_dir / "existing_source.zip.cache"
            self.assertTrue(wrapper.exists())
            with zipfile.ZipFile(wrapper) as zf:
                self.assertIn("existing_source/marker.txt", zf.namelist())
            self.assertTrue((cache_dir / "dataset-metadata.json").exists())

    def test_raw_cache_upload_fails_when_dataset_version_does_not_advance(self):
        class FakeApi:
            def __init__(self):
                self.create_calls = 0

            def authenticate(self):
                return None

            def dataset_list(self, search: str, user: str):
                return [
                    types.SimpleNamespace(
                        ref="hiuinhcng/eatfitai-dataset-v2-raw-audit-cache-v2",
                        id=10333160,
                        current_version_number=4,
                        total_bytes=123,
                        last_updated="2026-05-06T00:00:00Z",
                    )
                ]

            def dataset_list_files(self, dataset_id: str, page_token=None, page_size: int = 1000):
                return types.SimpleNamespace(files=[types.SimpleNamespace(name="old_source/file.txt")], next_page_token=None)

            def dataset_status(self, dataset_id: str):
                return "ready"

            def dataset_create_version(self, *args, **kwargs):
                self.create_calls += 1
                return types.SimpleNamespace(status="ok")

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cache_dir = root / "cache_package"
            cache_dir.mkdir()
            (cache_dir / "new_source.zip.cache").write_bytes(b"zip-bytes")
            fake_api = FakeApi()

            result = public_drive_kernel.upload_raw_cache_dataset(
                cache_dir=cache_dir,
                dataset_id="hiuinhcng/eatfitai-dataset-v2-raw-audit-cache-v2",
                secret_getter=lambda _label: "token",
                api_factory=lambda: fake_api,
                remote_cache_getter=lambda: None,
                verify_timeout_seconds=0,
                verify_interval_seconds=0,
                sleep_fn=lambda _seconds: None,
            )

        self.assertEqual(result["cache_status"], "cache_upload_failed")
        self.assertIn("publish was not verified", result["error"])
        self.assertEqual(fake_api.create_calls, 1)
        self.assertEqual(result["pre_upload"]["current_version_number"], 4)
        self.assertEqual(result["post_upload"]["current_version_number"], 4)

    def test_raw_cache_upload_can_create_immutable_batch_without_seeding(self):
        class FakeApi:
            def __init__(self):
                self.create_new_calls = 0

            def authenticate(self):
                return None

            def dataset_list(self, search: str, user: str):
                return [
                    types.SimpleNamespace(
                        ref="hiuinhcng/other-cache",
                        id=1,
                        current_version_number=1,
                        total_bytes=1,
                        last_updated="2026-05-06T00:00:00Z",
                    )
                ]

            def dataset_list_files(self, dataset_id: str, page_token=None, page_size: int = 1000):
                return types.SimpleNamespace(files=[types.SimpleNamespace(name="new_source/file.txt")], next_page_token=None)

            def dataset_status(self, dataset_id: str):
                return "ready"

            def dataset_create_new(self, *args, **kwargs):
                self.create_new_calls += 1
                return types.SimpleNamespace(status="ok")

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cache_dir = root / "cache_package"
            cache_dir.mkdir()
            (cache_dir / "new_source.zip.cache").write_bytes(b"zip-bytes")
            fake_api = FakeApi()

            result = public_drive_kernel.upload_raw_cache_dataset(
                cache_dir=cache_dir,
                dataset_id="hiuinhcng/new-immutable-cache",
                secret_getter=lambda _label: "token",
                api_factory=lambda: fake_api,
                seed_existing=False,
                verify_timeout_seconds=0,
                verify_interval_seconds=0,
                sleep_fn=lambda _seconds: None,
            )

        self.assertEqual(fake_api.create_new_calls, 1)
        self.assertEqual(result["seed_status"], "seed_skipped")
        self.assertEqual(result["cache_status"], "cache_upload_failed")
        self.assertEqual(result["dataset_id"], "hiuinhcng/new-immutable-cache")

    def test_public_drive_cache_package_wraps_zip_by_source_slug(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cache_dir = root / "cache"
            zip_path = root / "Food.v6i.yolov11.zip"
            zip_path.write_bytes(b"zip-bytes")

            with mock.patch.object(public_drive_kernel, "RAW_CACHE_PACKAGE_DIR", cache_dir):
                row = public_drive_kernel.add_raw_zip_to_cache_package(
                    {"source_slug": "food_prethesis", "drive_zip_name": zip_path.name},
                    zip_path,
                )

            wrapper = cache_dir / "food_prethesis.zip.cache"
            self.assertEqual(row["cache_path"], wrapper.name)
            self.assertTrue(wrapper.exists())
            self.assertFalse((cache_dir / zip_path.name).exists())
            with zipfile.ZipFile(wrapper) as zf:
                self.assertEqual(zf.namelist(), ["food_prethesis/Food.v6i.yolov11.zip"])

    def test_clean_build_extracts_wrapped_nested_cache_zip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cache_dir = root / "cache"
            cache_dir.mkdir()
            raw_zip = root / "Food.v6i.yolov11.zip"
            with zipfile.ZipFile(raw_zip, "w") as zf:
                zf.writestr("Food.v6i.yolov11/data.yaml", "names:\n  0: pho\n")
                zf.writestr("Food.v6i.yolov11/train/images/sample.jpg", b"image")
                zf.writestr("Food.v6i.yolov11/train/labels/sample.txt", "0 0.5 0.5 0.5 0.5\n")
            wrapper = cache_dir / "food_prethesis.zip.cache"
            with zipfile.ZipFile(wrapper, "w") as zf:
                zf.write(raw_zip, "food_prethesis/Food.v6i.yolov11.zip")

            cache_entries = collect_cache_entries(cache_dir)
            resolved = resolve_cache_source_path(
                "food_prethesis",
                {"food_prethesis": {"expected_name": raw_zip.name}},
                cache_entries,
            )
            yolo_root = cache_source_yolo_root("food_prethesis", resolved, extract_root=root / "extract")

            self.assertEqual(resolved, wrapper)
            self.assertEqual(yolo_root.name, "Food.v6i.yolov11")
            self.assertTrue((yolo_root / "train" / "images").is_dir())

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
