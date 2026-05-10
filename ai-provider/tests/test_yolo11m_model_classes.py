import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    import app as app_module
except ModuleNotFoundError as exc:
    app_module = None
    import_error = exc


class Yolo11mModelClassTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if app_module is None:
            raise unittest.SkipTest(f"AI provider app dependencies unavailable: {import_error.name}")
        cls.model_file = str(Path(__file__).resolve().parents[1] / "best.onnx")

    def test_yolo11m_clean_v1_class_list_matches_expected_catalog(self):
        self.assertEqual(105, len(app_module.YOLO_CLASS_NAMES))
        self.assertEqual("banh_mi", app_module.YOLO_CLASS_NAMES[0])
        self.assertEqual("rice", app_module.YOLO_CLASS_NAMES[49])
        self.assertEqual("lime", app_module.YOLO_CLASS_NAMES[104])
        self.assertNotIn("apple", app_module.YOLO_CLASS_NAMES)

    def test_yolo11m_clean_v1_class_list_matches_exported_model_metadata(self):
        previous_model_file = app_module.YOLO_ONNX_MODEL_FILE
        previous_model = app_module.onnx_model
        previous_error = app_module.onnx_model_load_error
        try:
            app_module.YOLO_ONNX_MODEL_FILE = self.model_file
            app_module.onnx_model = None
            app_module.onnx_model_load_error = None

            model = app_module._load_onnx_model()
            self.assertIsNotNone(model)

            metadata_names = app_module._get_onnx_metadata_class_names(model)

            self.assertEqual(app_module.YOLO_CLASS_NAMES, metadata_names)
        finally:
            app_module.YOLO_ONNX_MODEL_FILE = previous_model_file
            app_module.onnx_model = previous_model
            app_module.onnx_model_load_error = previous_error

    def test_yolo11m_class_name_validation_rejects_mismatch(self):
        with self.assertRaisesRegex(RuntimeError, "YOLO class metadata mismatch"):
            app_module._validate_onnx_class_names(["banh_mi", "pho"], ["pho", "banh_mi"])

    def test_yolo11m_onnx_default_image_size_matches_fixed_export_shape(self):
        self.assertEqual(640, app_module.YOLO_ONNX_IMAGE_SIZE)


if __name__ == "__main__":
    unittest.main()
