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

import kaggle_yolo11m_train as train_kernel  # noqa: E402


class DatasetV2Yolo11mTrainHandoffTests(unittest.TestCase):
    def test_training_kernel_rejects_non_t4x2_gpu_for_full_run(self):
        class FakeCuda:
            @staticmethod
            def is_available():
                return True

            @staticmethod
            def device_count():
                return 1

            @staticmethod
            def get_device_properties(_idx):
                return types.SimpleNamespace(name="Tesla P100-PCIE-16GB", total_memory=16 * 1024**3)

        fake_torch = types.SimpleNamespace(__version__="test", cuda=FakeCuda)
        with mock.patch.dict(sys.modules, {"torch": fake_torch}):
            with self.assertRaisesRegex(RuntimeError, "Expected Kaggle GPU T4 x2"):
                train_kernel.print_gpu_info()

    def test_training_kernel_extracts_dataset_outside_kaggle_output_by_default(self):
        self.assertNotEqual(train_kernel.DATASET_EXTRACT_DIR, train_kernel.KAGGLE_WORKING)
        self.assertTrue(train_kernel.DATASET_EXTRACT_DIR.as_posix().startswith("/tmp/"))

    def test_training_kernel_finds_clean_build_zip_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            input_root = Path(tmp) / "input"
            archive = input_root / "eatfitai-dataset-v2-clean-build" / "eatfitai_dataset_v2_clean_candidate.zip"
            archive.parent.mkdir(parents=True)
            archive.write_bytes(b"fake zip placeholder")

            self.assertEqual(train_kernel.find_dataset_archive(input_root), archive)

    def test_training_kernel_extracts_clean_build_zip_under_working_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / "input" / "clean-build-output" / "eatfitai_dataset_v2_clean_candidate.zip"
            archive.parent.mkdir(parents=True)
            with zipfile.ZipFile(archive, "w") as zf:
                zf.writestr("kaggle/working/eatfitai_dataset_v2_clean_candidate/data.yaml", "path: .\ntrain: train/images\n")
                zf.writestr("kaggle/working/eatfitai_dataset_v2_clean_candidate/train/images/sample.jpg", "image")
                zf.writestr("kaggle/working/eatfitai_dataset_v2_clean_candidate/train/labels/sample.txt", "0 0.5 0.5 0.2 0.2\n")

            dataset_dir = train_kernel.extract_dataset_archive(archive, root / "working")

            self.assertTrue((dataset_dir / "data.yaml").exists())
            self.assertTrue(str(dataset_dir.resolve()).startswith(str((root / "working").resolve())))

    def test_training_kernel_rejects_unsafe_zip_members(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / "unsafe.zip"
            with zipfile.ZipFile(archive, "w") as zf:
                zf.writestr("../escape/data.yaml", "path: .\n")

            with self.assertRaisesRegex(RuntimeError, "Unsafe zip member path"):
                train_kernel.safe_extract_zip(archive, root / "working")

    def test_training_kernel_rebases_data_yaml_to_extracted_dataset_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            dataset_dir = Path(tmp) / "clean_archive_extract" / "kaggle" / "working" / "eatfitai_dataset_v2_clean_candidate"
            dataset_dir.mkdir(parents=True)
            original = dataset_dir / "data.yaml"
            original.write_text(
                "path: /kaggle/working\ntrain: train/images\nval: valid/images\ntest: test/images\nnames:\n  0: pho\n",
                encoding="utf-8",
            )

            rebased = train_kernel.prepare_training_data_yaml(dataset_dir)

            self.assertEqual(rebased, dataset_dir / "data.rebased.yaml")
            self.assertIn(f"path: {dataset_dir.as_posix()}", rebased.read_text(encoding="utf-8"))

    def test_training_kernel_finds_resume_checkpoint_from_attached_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            input_root = Path(tmp) / "input"
            checkpoint = input_root / "previous-full-run" / "_yolo11m_checkpoints" / "last.pt"
            checkpoint.parent.mkdir(parents=True)
            checkpoint.write_bytes(b"checkpoint")

            self.assertEqual(train_kernel.find_resume_checkpoint(input_root), checkpoint)

    def test_training_kernel_copies_resume_checkpoints_to_kaggle_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            run_dir = root / "runs" / "food-detection" / "yolo11m-eatfitai-clean-v1"
            weights = run_dir / "weights"
            weights.mkdir(parents=True)
            (weights / "last.pt").write_bytes(b"last")
            (weights / "best.pt").write_bytes(b"best")
            (weights / "epoch1.pt").write_bytes(b"epoch")
            (run_dir / "results.csv").write_text("epoch,box_loss\n", encoding="utf-8")
            (run_dir / "args.yaml").write_text("epochs: 150\n", encoding="utf-8")

            checkpoint_dir = root / "working" / "_yolo11m_checkpoints"
            train_kernel.copy_training_artifacts(run_dir, root / "working", checkpoint_dir)

            self.assertEqual((root / "working" / "yolo11m_last.pt").read_bytes(), b"last")
            self.assertEqual((root / "working" / "yolo11m_best.pt").read_bytes(), b"best")
            self.assertEqual((checkpoint_dir / "last.pt").read_bytes(), b"last")
            self.assertTrue((checkpoint_dir / "epoch1.pt").exists())
            self.assertTrue((checkpoint_dir / "results.csv").exists())

    def test_training_kernel_rejects_dataset_extract_when_disk_room_is_insufficient(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            archive = root / "clean.zip"
            with zipfile.ZipFile(archive, "w") as zf:
                zf.writestr("dataset/data.yaml", "path: .\n")
                zf.writestr("dataset/train/images/a.jpg", "x" * 1024)

            fake_usage = types.SimpleNamespace(free=1024)
            with mock.patch.object(train_kernel.shutil, "disk_usage", return_value=fake_usage):
                with mock.patch.object(train_kernel, "MIN_FREE_BYTES_AFTER_EXTRACT", 2048):
                    with self.assertRaisesRegex(RuntimeError, "Not enough disk"):
                        train_kernel.assert_disk_room_for_archive(archive, root / "extract")

    def test_smoke_train_entrypoint_is_self_contained_for_kaggle_code_file(self):
        smoke_source = (DATASET_V2_DIR / "kaggle_yolo11m_smoke_train.py").read_text(encoding="utf-8")

        self.assertNotIn("import kaggle_yolo11m_train", smoke_source)

    def test_smoke_train_entrypoint_forces_skip_full(self):
        import kaggle_yolo11m_smoke_train as smoke_kernel

        with tempfile.TemporaryDirectory() as tmp:
            data_yaml = Path(tmp) / "data.yaml"
            data_yaml.write_text("path: .\n", encoding="utf-8")
            with mock.patch.object(smoke_kernel, "ensure_ultralytics"), mock.patch.object(
                smoke_kernel, "print_gpu_info", return_value=(1, 0, 16)
            ), mock.patch.object(smoke_kernel, "extract_dataset", return_value=Path(tmp)), mock.patch.object(
                smoke_kernel, "verify_dataset_layout", return_value={}
            ), mock.patch.object(
                smoke_kernel, "prepare_training_data_yaml", return_value=data_yaml
            ), mock.patch.object(
                smoke_kernel, "train_model", return_value=None
            ) as train_model:
                self.assertEqual(smoke_kernel.main(), 0)

        train_model.assert_called_once_with(data_yaml, 0, 16, skip_smoke=False, skip_full=True)

    def test_smoke_train_rebases_data_yaml_to_extracted_dataset_dir(self):
        import kaggle_yolo11m_smoke_train as smoke_kernel

        with tempfile.TemporaryDirectory() as tmp:
            dataset_dir = Path(tmp) / "clean_archive_extract" / "kaggle" / "working" / "eatfitai_dataset_v2_clean_candidate"
            dataset_dir.mkdir(parents=True)
            original = dataset_dir / "data.yaml"
            original.write_text(
                "path: /kaggle/working\ntrain: train/images\nval: valid/images\ntest: test/images\nnames:\n  0: pho\n",
                encoding="utf-8",
            )

            rebased = smoke_kernel.prepare_training_data_yaml(dataset_dir)

            self.assertEqual(rebased, dataset_dir / "data.rebased.yaml")
            self.assertIn(f"path: {dataset_dir.as_posix()}", rebased.read_text(encoding="utf-8"))

    def test_smoke_kernel_metadata_uses_clean_build_kernel_output(self):
        metadata = json.loads((DATASET_V2_DIR / "kaggle_yolo11m_smoke_train_metadata.json").read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_yolo11m_smoke_train.py")
        self.assertTrue(metadata["enable_gpu"])
        self.assertEqual(metadata.get("machine_shape"), "NvidiaTeslaT4")
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-clean-build", metadata["kernel_sources"])
        self.assertEqual(metadata.get("dataset_sources", []), [])

    def test_full_train_kernel_metadata_uses_t4_and_clean_build_output(self):
        metadata = json.loads((DATASET_V2_DIR / "kaggle_kernel_metadata.json").read_text(encoding="utf-8"))

        self.assertEqual(metadata["code_file"], "kaggle_yolo11m_train.py")
        self.assertTrue(metadata["enable_gpu"])
        self.assertEqual(metadata.get("machine_shape"), "NvidiaTeslaT4")
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-clean-build", metadata["kernel_sources"])
        self.assertEqual(metadata.get("dataset_sources", []), [])


if __name__ == "__main__":
    unittest.main()
