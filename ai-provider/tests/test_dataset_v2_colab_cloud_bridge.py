import os
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from colab_cloud_bridge import (  # noqa: E402
    CloudPaths,
    ensure_kaggle_credentials,
    resolve_cloud_paths,
)


class ColabCloudBridgeTests(unittest.TestCase):
    def test_resolve_cloud_paths_keeps_all_data_under_cloud_runtime_or_drive(self):
        paths = resolve_cloud_paths(Path("/content/drive/MyDrive/EatFitAI-Training"), Path("/content/repo/ai-provider/dataset_v2"))

        self.assertEqual(paths.raw_dir, Path("/content/drive/MyDrive/EatFitAI-Training/datasets-raw"))
        self.assertEqual(paths.report_dir, Path("/content/drive/MyDrive/EatFitAI-Training/dataset-v2-reports"))
        self.assertEqual(paths.package_root, Path("/content/eatfitai_dataset_v2_kaggle_packages"))
        self.assertEqual(paths.code_dir, Path("/content/repo/ai-provider/dataset_v2"))

    def test_kaggle_api_token_writes_access_token_without_echoing_secret(self):
        with tempfile.TemporaryDirectory() as tmp:
            mode = ensure_kaggle_credentials(
                home_dir=Path(tmp),
                env={"KAGGLE_API_TOKEN": "redacted_secret_token_value"},
            )

            token_path = Path(tmp) / ".kaggle" / "access_token"
            self.assertEqual(mode, "api_token")
            self.assertEqual(token_path.read_text(encoding="utf-8"), "redacted_secret_token_value")

    def test_legacy_kaggle_credentials_write_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            mode = ensure_kaggle_credentials(
                home_dir=Path(tmp),
                env={"KAGGLE_USERNAME": "owner", "KAGGLE_KEY": "secret"},
            )

            kaggle_json = Path(tmp) / ".kaggle" / "kaggle.json"
            self.assertEqual(mode, "legacy_json")
            self.assertIn('"username": "owner"', kaggle_json.read_text(encoding="utf-8"))

    def test_existing_credentials_are_reused(self):
        with tempfile.TemporaryDirectory() as tmp:
            kaggle_dir = Path(tmp) / ".kaggle"
            kaggle_dir.mkdir()
            (kaggle_dir / "access_token").write_text("already-there", encoding="utf-8")

            self.assertEqual(ensure_kaggle_credentials(home_dir=Path(tmp), env={}), "existing")

    def test_missing_credentials_raise_clear_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(RuntimeError, "Kaggle credentials are missing"):
                ensure_kaggle_credentials(home_dir=Path(tmp), env={})


if __name__ == "__main__":
    unittest.main()
