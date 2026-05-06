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
TEST_DIR = Path(__file__).resolve().parent
if str(TEST_DIR) not in sys.path:
    sys.path.insert(0, str(TEST_DIR))

from kaggle_public_drive_raw_audit_kernel import (  # noqa: E402
    KaggleSecretUnavailable,
    build_rclone_copyid_command,
    classify_download_exception,
    classify_rclone_exception,
    classify_secret_exception,
    format_subprocess_error,
    filter_drive_rows_by_scope,
    find_code_dir_under,
    normalize_rclone_config_secret,
    is_safe_kaggle_download_path,
    is_expected_size_blocked,
    public_drive_download_url,
    download_one_public_drive_source,
    write_raw_cache_dataset_metadata,
    should_download_public_drive_source,
    RAW_ZIP_DIR,
)
from test_dataset_v2_source_files import EXPECTED_DRIVE_ZIPS  # noqa: E402


ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DRIVE_SOURCES = ROOT / "ai-provider" / "dataset_v2" / "public_drive_raw_sources.csv"
PUBLIC_KERNEL_METADATA = ROOT / "ai-provider" / "dataset_v2" / "kaggle_public_drive_raw_audit_kernel_metadata.json"
SMOKE_KERNEL_METADATA = ROOT / "ai-provider" / "dataset_v2" / "kaggle_drive_secret_smoke_kernel_metadata.json"
SMOKE_KERNEL = ROOT / "ai-provider" / "dataset_v2" / "kaggle_drive_secret_smoke_kernel.py"
OAUTH_RETRY_SCOPE = ROOT / "ai-provider" / "dataset_v2" / "public_drive_source_scope.oauth_retry_2026-05-05.csv"
OAUTH_CACHE_ALL_SMALL_SCOPE = ROOT / "ai-provider" / "dataset_v2" / "public_drive_source_scope.cache_all_small_2026-05-05.csv"
REQUIREMENTS = ROOT / "ai-provider" / "dataset_v2" / "requirements.dataset_v2.txt"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


class PublicDriveKernelTests(unittest.TestCase):
    def test_public_drive_source_manifest_covers_current_raw_zips(self):
        rows = read_csv(PUBLIC_DRIVE_SOURCES)
        zips = {row["drive_zip_name"] for row in rows}

        self.assertEqual(zips, EXPECTED_DRIVE_ZIPS)
        self.assertTrue(all(row["drive_file_id"] for row in rows))

    def test_public_drive_manifest_records_known_oversized_vietfood67(self):
        rows = read_csv(PUBLIC_DRIVE_SOURCES)
        vietfood67 = next(row for row in rows if row["drive_zip_name"] == "VietFood67.ZIP")

        self.assertGreater(int(vietfood67["expected_size_bytes"]), 20_000_000_000)
        self.assertTrue(is_expected_size_blocked(vietfood67, max_bytes=20_000_000_000))

    def test_oauth_retry_scope_contains_only_eight_small_unresolved_sources(self):
        rows = read_csv(OAUTH_RETRY_SCOPE)
        slugs = [row["source_slug"] for row in rows]

        self.assertEqual(
            slugs,
            [
                "food_prethesis",
                "rawdata_my_khanh",
                "npg_project",
                "thai_food",
                "food_detection_64",
                "uecfood256",
                "vegetable_detection",
                "food_kcmrd",
            ],
        )
        self.assertNotIn("vietfood67", slugs)
        self.assertNotIn("food_data_truongvo", slugs)

    def test_oauth_cache_all_small_scope_contains_all_non_deferred_non_quarantine_sources(self):
        rows = read_csv(OAUTH_CACHE_ALL_SMALL_SCOPE)
        slugs = [row["source_slug"] for row in rows]

        self.assertEqual(
            slugs,
            [
                "food_detection_bobotnhan",
                "food_prethesis",
                "food_ai_tong_hop",
                "banh_dan_gian_mien_tay",
                "banh_dan_gian_nb",
                "canteen_menu",
                "food_prethesis_v3",
                "food_items",
                "rawdata_my_khanh",
                "vietnamese_food_calories",
                "food_detection_xt7yz",
                "npg_project",
                "thai_food",
                "food_detection_64",
                "uecfood256",
                "fish",
                "vegetable_detection",
                "food_kcmrd",
                "vietnamese_food_5",
            ],
        )
        self.assertNotIn("vietfood67", slugs)
        self.assertNotIn("food_data_truongvo", slugs)
        self.assertNotIn("food_union_fruit_old", slugs)
        self.assertNotIn("food_detection_3_old", slugs)
        self.assertTrue({row["source_slug"] for row in read_csv(OAUTH_RETRY_SCOPE)}.issubset(set(slugs)))

    def test_raw_zip_dir_is_not_kaggle_output_artifact(self):
        self.assertFalse(str(RAW_ZIP_DIR).startswith("/kaggle/working"))

    def test_rclone_download_command_rejects_local_workspace_or_windows_paths(self):
        self.assertTrue(is_safe_kaggle_download_path(Path("/tmp/eatfitai_dataset_v2_public_drive/raw_zips/a.zip")))
        self.assertTrue(is_safe_kaggle_download_path(Path("/kaggle/working/a.zip")))
        self.assertFalse(is_safe_kaggle_download_path(Path("E:/tool edit/eatfitai_v1/a.zip")))
        self.assertFalse(is_safe_kaggle_download_path(Path("relative/a.zip")))

        with self.assertRaises(ValueError):
            build_rclone_copyid_command(
                rclone_binary="rclone",
                config_path=Path("/tmp/eatfitai_rclone/rclone.conf"),
                drive_file_id="file-id",
                output=Path("E:/tool edit/eatfitai_v1/a.zip"),
            )

        command = build_rclone_copyid_command(
            rclone_binary="rclone",
            config_path=Path("/tmp/eatfitai_rclone/rclone.conf"),
            drive_file_id="file-id",
            output=Path("/tmp/eatfitai_dataset_v2_public_drive/raw_zips/a.zip"),
        )
        self.assertEqual(command[-2:], ["file-id", "/tmp/eatfitai_dataset_v2_public_drive/raw_zips/a.zip"])
        self.assertIn("--config", command)

    def test_rclone_config_secret_normalizes_escaped_newlines(self):
        config = normalize_rclone_config_secret("[eatfitai_drive]\\ntype = drive\\ntoken = redacted")

        self.assertIn("[eatfitai_drive]\ntype = drive\n", config)
        self.assertTrue(config.endswith("\n"))

    def test_secret_missing_is_reported_without_download_attempt(self):
        called = {"runner": False}

        def command_runner(command: list[str]) -> None:
            called["runner"] = True

        with tempfile.TemporaryDirectory() as tmp:
            row = download_one_public_drive_source(
                {"source_slug": "retry_one", "drive_zip_name": "retry.zip", "drive_file_id": "file-id"},
                {"public_decision": "ACCEPT_TO_RAW_AUDIT"},
                Path(tmp),
                secret_getter=lambda label: None,
                rclone_binary_getter=lambda: "rclone",
                command_runner=command_runner,
            )

        self.assertEqual(row["download_status"], "drive_secret_missing")
        self.assertFalse(called["runner"])

    def test_secret_connection_error_is_reported_without_download_attempt(self):
        called = {"runner": False}

        def secret_getter(label: str) -> str | None:
            raise KaggleSecretUnavailable(label, "drive_secret_unreachable", ConnectionError("service down"))

        def command_runner(command: list[str]) -> None:
            called["runner"] = True

        with tempfile.TemporaryDirectory() as tmp:
            row = download_one_public_drive_source(
                {"source_slug": "retry_one", "drive_zip_name": "retry.zip", "drive_file_id": "file-id"},
                {"public_decision": "ACCEPT_TO_RAW_AUDIT"},
                Path(tmp),
                secret_getter=secret_getter,
                rclone_binary_getter=lambda: "rclone",
                command_runner=command_runner,
            )

        self.assertEqual(row["download_status"], "drive_secret_unreachable")
        self.assertFalse(called["runner"])

    def test_secret_exception_classification_preserves_connection_errors(self):
        class NotFoundError(Exception):
            pass

        class CredentialError(Exception):
            pass

        self.assertEqual(classify_secret_exception(ConnectionError("service down")), "drive_secret_unreachable")
        self.assertEqual(classify_secret_exception(CredentialError("bad token")), "drive_secret_auth_failed")
        self.assertEqual(classify_secret_exception(NotFoundError("missing label")), "drive_secret_missing")

    def test_raw_cache_dataset_metadata_uses_unknown_license(self):
        with tempfile.TemporaryDirectory() as tmp:
            metadata_path = write_raw_cache_dataset_metadata(
                Path(tmp),
                dataset_id="hiuinhcng/eatfitai-dataset-v2-raw-audit-cache",
            )

            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))

        self.assertEqual(metadata["id"], "hiuinhcng/eatfitai-dataset-v2-raw-audit-cache")
        self.assertEqual(metadata["licenses"], [{"name": "unknown"}])
        self.assertIn("private raw audit cache", metadata["description"])

    def test_oauth_drive_requirements_do_not_include_gdown_fallback(self):
        requirements = REQUIREMENTS.read_text(encoding="utf-8").splitlines()

        self.assertNotIn("gdown", requirements)

    def test_drive_quota_errors_are_source_level_download_blocks(self):
        exc = RuntimeError("Too many users have viewed or downloaded this file recently.")

        self.assertEqual(classify_download_exception(exc), "download_blocked_drive_quota")

    def test_rclone_error_includes_captured_output_for_diagnosis(self):
        exc = subprocess.CalledProcessError(
            1,
            ["rclone", "lsd"],
            output="Failed to create file system for eatfitai_drive:: invalid_grant",
        )

        self.assertIn("invalid_grant", format_subprocess_error(exc))
        self.assertEqual(classify_rclone_exception(exc), "drive_oauth_failed")

    def test_public_drive_download_url_uses_file_id(self):
        self.assertEqual(
            public_drive_download_url("abc123"),
            "https://drive.google.com/uc?id=abc123",
        )

    def test_find_code_dir_does_not_depend_on_kaggle_input_folder_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mounted = root / "datasets"
            mounted.mkdir()
            (mounted / "audit_sources.py").write_text("print('audit')\n", encoding="utf-8")
            (mounted / "public_drive_raw_sources.csv").write_text("source_slug,drive_zip_name,drive_file_id\n", encoding="utf-8")

            self.assertEqual(find_code_dir_under(root), mounted)

    def test_public_drive_scope_file_filters_retry_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            scope = Path(tmp) / "scope.csv"
            scope.write_text("source_slug\nretry_two\nretry_one\n", encoding="utf-8")
            rows = [
                {"source_slug": "already_done", "drive_zip_name": "done.zip"},
                {"source_slug": "retry_one", "drive_zip_name": "one.zip"},
                {"source_slug": "retry_two", "drive_zip_name": "two.zip"},
            ]

            self.assertEqual(
                filter_drive_rows_by_scope(rows, scope),
                [
                    {"source_slug": "retry_one", "drive_zip_name": "one.zip"},
                    {"source_slug": "retry_two", "drive_zip_name": "two.zip"},
                ],
            )

    def test_public_drive_kernel_skips_quarantine_reject_and_missing_ids(self):
        self.assertTrue(
            should_download_public_drive_source(
                {"drive_zip_name": "keep.zip", "drive_file_id": "file-id"},
                {"public_decision": "ACCEPT_TO_RAW_AUDIT"},
            )
        )
        self.assertFalse(
            should_download_public_drive_source(
                {"drive_zip_name": "bad.zip", "drive_file_id": "file-id"},
                {"public_decision": "QUARANTINE"},
            )
        )
        self.assertFalse(
            should_download_public_drive_source(
                {"drive_zip_name": "reject.zip", "drive_file_id": "file-id"},
                {"public_decision": "REJECT_PUBLIC_METADATA"},
            )
        )
        self.assertFalse(
            should_download_public_drive_source(
                {"drive_zip_name": "missing-id.zip", "drive_file_id": ""},
                {"public_decision": "ACCEPT_TO_RAW_AUDIT"},
            )
        )

    def test_public_drive_kernel_metadata_mounts_pipeline_code_and_cache(self):
        metadata = json.loads(PUBLIC_KERNEL_METADATA.read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_public_drive_raw_audit_kernel.py")
        self.assertEqual(
            metadata["dataset_sources"],
            [
                "hiuinhcng/eatfitai-dataset-v2-pipeline-code",
                "hiuinhcng/eatfitai-dataset-v2-raw-audit-cache",
            ],
        )
        self.assertTrue(metadata["enable_internet"])

    def test_drive_secret_smoke_kernel_metadata_uses_pipeline_code_only(self):
        metadata = json.loads(SMOKE_KERNEL_METADATA.read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_drive_secret_smoke_kernel.py")
        self.assertEqual(metadata["dataset_sources"], ["hiuinhcng/eatfitai-dataset-v2-pipeline-code"])
        self.assertTrue(metadata["is_private"])
        self.assertTrue(metadata["enable_internet"])

    def test_drive_secret_smoke_kernel_is_self_contained_for_kaggle_script_runner(self):
        script = SMOKE_KERNEL.read_text(encoding="utf-8")

        self.assertNotIn("from kaggle_public_drive_raw_audit_kernel import", script)


if __name__ == "__main__":
    unittest.main()
