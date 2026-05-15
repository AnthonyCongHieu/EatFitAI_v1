import json
import os
import importlib
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

    def test_training_kernel_default_checkpoint_plan_resumes_completed_runs(self):
        checkpoint = Path("/kaggle/input/previous-run/_yolo11m_checkpoints/last.pt")
        with mock.patch.dict(os.environ, {}, clear=False):
            plan = train_kernel.resolve_checkpoint_plan(checkpoint)

        self.assertEqual(plan.model_source, checkpoint)
        self.assertTrue(plan.resume_training)
        self.assertTrue(plan.skip_when_target_reached)

    def test_training_kernel_finetune_checkpoint_plan_starts_new_run_from_checkpoint(self):
        checkpoint = Path("/kaggle/input/previous-run/_yolo11m_checkpoints/last.pt")
        with mock.patch.dict(os.environ, {"EATFITAI_YOLO_CHECKPOINT_MODE": "finetune"}):
            plan = train_kernel.resolve_checkpoint_plan(checkpoint)

        self.assertEqual(plan.model_source, checkpoint)
        self.assertFalse(plan.resume_training)
        self.assertFalse(plan.skip_when_target_reached)

    def test_training_kernel_finetune_mode_trains_even_if_checkpoint_reached_target(self):
        checkpoint = Path("/kaggle/input/previous-run/_yolo11m_checkpoints/last.pt")
        calls = []

        class FakeYOLO:
            def __init__(self, source):
                calls.append(("init", source))

            def train(self, **kwargs):
                calls.append(("train", kwargs))

        fake_ultralytics = types.SimpleNamespace(YOLO=FakeYOLO)
        with tempfile.TemporaryDirectory() as tmp:
            data_yaml = Path(tmp) / "data.yaml"
            data_yaml.write_text("path: .\n", encoding="utf-8")
            with mock.patch.dict(sys.modules, {"ultralytics": fake_ultralytics}), mock.patch.dict(
                os.environ, {"EATFITAI_YOLO_CHECKPOINT_MODE": "finetune"}
            ), mock.patch.object(train_kernel, "find_resume_checkpoint", return_value=checkpoint), mock.patch.object(
                train_kernel, "resume_checkpoint_reached_target", return_value=True
            ), mock.patch.object(
                train_kernel, "register_checkpoint_callbacks"
            ), mock.patch.object(
                train_kernel, "copy_training_artifacts"
            ):
                train_kernel.train_model(data_yaml, device=0, batch=2, skip_smoke=True, skip_full=False)

        self.assertIn(("init", str(checkpoint)), calls)
        train_call = next(payload for name, payload in calls if name == "train")
        self.assertFalse(train_call["resume"])

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
            self.assertFalse((weights / "epoch1.pt").exists())
            self.assertFalse((checkpoint_dir / "epoch1.pt").exists())
            self.assertFalse((root / "working" / "epoch1.pt").exists())
            self.assertTrue((checkpoint_dir / "results.csv").exists())

    def test_training_kernel_writes_unambiguous_resume_bundle_manifest(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            run_dir = root / "runs" / "food-detection" / "yolo11m-eatfitai-clean-v1"
            weights = run_dir / "weights"
            weights.mkdir(parents=True)
            (weights / "last.pt").write_bytes(b"last")
            (weights / "best.pt").write_bytes(b"best")
            (weights / "best.onnx").write_bytes(b"onnx")
            (run_dir / "results.csv").write_text("epoch,box_loss\n0,1.2\n1,0.9\n", encoding="utf-8")

            checkpoint_dir = root / "working" / "_yolo11m_checkpoints"
            train_kernel.copy_training_artifacts(run_dir, root / "working", checkpoint_dir)

            manifest_path = root / "working" / "yolo11m_resume_manifest.json"
            self.assertTrue(manifest_path.exists())
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

            self.assertEqual((root / "working" / "yolo11m_resume_last.pt").read_bytes(), b"last")
            self.assertEqual((root / "working" / "yolo11m_resume_best.pt").read_bytes(), b"best")
            self.assertEqual(manifest["status"], "checkpoint_available")
            self.assertEqual(manifest["last_checkpoint"], "yolo11m_resume_last.pt")
            self.assertEqual(manifest["best_checkpoint"], "yolo11m_resume_best.pt")
            self.assertEqual(manifest["onnx_export"], "best.onnx")
            self.assertEqual(manifest["last_recorded_epoch"], 1)

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

    def test_clean_v2_entrypoints_are_self_contained_for_kaggle_code_files(self):
        clean_source = (DATASET_V2_DIR / "kaggle_clean_build_v2_kernel.py").read_text(encoding="utf-8")
        train_source = (DATASET_V2_DIR / "kaggle_yolo11m_clean_v2_train.py").read_text(encoding="utf-8")

        self.assertNotIn("kaggle_clean_build_kernel", clean_source)
        self.assertNotIn("kaggle_yolo11m_train", train_source)

    def test_clean_v3_entrypoints_are_self_contained_and_point_to_v3_assets(self):
        clean_source = (DATASET_V2_DIR / "kaggle_clean_build_v3_kernel.py").read_text(encoding="utf-8")
        train_source = (DATASET_V2_DIR / "kaggle_yolo11m_clean_v3_train.py").read_text(encoding="utf-8")

        self.assertNotIn("kaggle_clean_build_kernel", clean_source)
        self.assertNotIn("kaggle_yolo11m_train", train_source)
        self.assertIn("clean_candidate_sources_v3_2026-05-13.csv", clean_source)
        self.assertIn("class_taxonomy.clean_v3_expanded_2026-05-13.yaml", clean_source)
        self.assertIn('"80000"', clean_source)
        self.assertIn("eatfitai_clean_v3", train_source)
        self.assertIn("yolo11m-eatfitai-clean-v3", train_source)

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
        self.assertIn("hiuinhcng/eatfitai-yolo11m-clean-v1-checkpoint", metadata["dataset_sources"])

    def test_clean_build_kernel_supports_dated_policy_and_taxonomy_override(self):
        import kaggle_clean_build_kernel as clean_kernel

        with mock.patch.dict(
            os.environ,
            {
                "EATFITAI_CLEAN_SOURCE_POLICY": "clean_candidate_sources_v2_2026-05-13.csv",
                "EATFITAI_CLEAN_TAXONOMY": "class_taxonomy.clean_v2_2026-05-13.yaml",
                "EATFITAI_CLEAN_MAX_IMAGES": "40000",
            },
        ):
            clean_kernel = importlib.reload(clean_kernel)

        try:
            self.assertEqual(clean_kernel.CLEAN_SOURCE_POLICY, "clean_candidate_sources_v2_2026-05-13.csv")
            self.assertEqual(clean_kernel.CLEAN_TAXONOMY, "class_taxonomy.clean_v2_2026-05-13.yaml")
            self.assertEqual(clean_kernel.CLEAN_MAX_IMAGES, 40000)
        finally:
            importlib.reload(clean_kernel)

    def test_clean_v2_kernel_metadata_uses_dedicated_clean_build_and_finetune_train(self):
        clean_metadata = json.loads((DATASET_V2_DIR / "kaggle_clean_build_v2_kernel_metadata.json").read_text(encoding="utf-8"))
        train_metadata = json.loads((DATASET_V2_DIR / "kaggle_yolo11m_clean_v2_train_metadata.json").read_text(encoding="utf-8"))

        self.assertEqual(clean_metadata["code_file"], "kaggle_clean_build_v2_kernel.py")
        self.assertEqual(clean_metadata["id"], "hiuinhcng/eatfitai-dataset-v2-clean-build-v2")
        self.assertEqual(train_metadata["code_file"], "kaggle_yolo11m_clean_v2_train.py")
        self.assertEqual(train_metadata["id"], "hiuinhcng/eatfitai-yolo11m-clean-v2")
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-clean-build-v2", train_metadata["kernel_sources"])
        self.assertIn("hiuinhcng/eatfitai-yolo11m-clean-v1-checkpoint", train_metadata["dataset_sources"])

    def test_clean_v3_kernel_metadata_uses_dedicated_clean_build_and_finetune_train(self):
        clean_metadata = json.loads((DATASET_V2_DIR / "kaggle_clean_build_v3_kernel_metadata.json").read_text(encoding="utf-8"))
        train_metadata = json.loads((DATASET_V2_DIR / "kaggle_yolo11m_clean_v3_train_metadata.json").read_text(encoding="utf-8"))

        self.assertEqual(clean_metadata["code_file"], "kaggle_clean_build_v3_kernel.py")
        self.assertEqual(clean_metadata["id"], "hiuinhcng/eatfitai-dataset-v2-clean-build-v3")
        self.assertEqual(train_metadata["code_file"], "kaggle_yolo11m_clean_v3_train.py")
        self.assertEqual(train_metadata["id"], "hiuinhcng/eatfitai-yolo11m-clean-v3")
        self.assertIn("hiuinhcng/eatfitai-dataset-v2-clean-build-v3", train_metadata["kernel_sources"])
        self.assertIn("hiuinhcng/eatfitai-yolo11m-clean-v1-checkpoint", train_metadata["dataset_sources"])

    def test_clean_v4_class_expansion_train_kernel_uses_mounted_output_and_finetune_train(self):
        import kaggle_yolo11m_clean_v4_class_expansion_train as v4_train

        train_source = (DATASET_V2_DIR / "kaggle_yolo11m_clean_v4_class_expansion_train.py").read_text(encoding="utf-8")
        train_metadata = json.loads(
            (DATASET_V2_DIR / "kaggle_yolo11m_clean_v4_class_expansion_train_metadata.json").read_text(encoding="utf-8")
        )

        self.assertNotIn("kaggle_yolo11m_train", train_source)
        self.assertIn("find_mounted_dataset_dir", train_source)
        self.assertIn("eatfitai_dataset_v2_clean_v4_class_expansion_candidate", train_source)
        self.assertIn("eatfitai_clean_v4_class_expansion", train_source)
        self.assertIn("yolo11m-eatfitai-clean-v4-class-expansion", train_source)
        self.assertEqual(train_metadata["code_file"], "kaggle_yolo11m_clean_v4_class_expansion_train.py")
        self.assertEqual(train_metadata["id"], "hiuinhcng/eatfitai-yolo11m-clean-v4-class-expansion")
        self.assertIn("hiuinhcng/eatfitai-v4-clean-train-artifact", train_metadata["kernel_sources"])
        self.assertIn("hiuinhcng/eatfitai-yolo11m-clean-v1-checkpoint", train_metadata["dataset_sources"])
        self.assertEqual(v4_train.RUN_NAME, "yolo11m-eatfitai-clean-v4-class-expansion")

    def test_clean_v4_train_finds_mounted_clean_build_directory(self):
        import kaggle_yolo11m_clean_v4_class_expansion_train as v4_train

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            dataset = root / "kernel-output" / "eatfitai_dataset_v2_clean_v4_class_expansion_candidate"
            (dataset / "images" / "train").mkdir(parents=True)
            (dataset / "labels" / "train").mkdir(parents=True)
            (dataset / "data.yaml").write_text("path: .\ntrain: images/train\nval: images/valid\ntest: images/test\n", encoding="utf-8")

            self.assertEqual(v4_train.find_mounted_dataset_dir(root), dataset)


if __name__ == "__main__":
    unittest.main()
