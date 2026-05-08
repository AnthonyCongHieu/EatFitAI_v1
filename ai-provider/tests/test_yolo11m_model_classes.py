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

    def test_yolo11m_clean_v1_class_list_matches_exported_model(self):
        self.assertEqual(105, len(app_module.YOLO_CLASS_NAMES))
        self.assertEqual("banh_mi", app_module.YOLO_CLASS_NAMES[0])
        self.assertEqual("rice", app_module.YOLO_CLASS_NAMES[49])
        self.assertEqual("lime", app_module.YOLO_CLASS_NAMES[104])
        self.assertNotIn("apple", app_module.YOLO_CLASS_NAMES)

    def test_yolo11m_onnx_default_image_size_matches_fixed_export_shape(self):
        self.assertEqual(640, app_module.YOLO_ONNX_IMAGE_SIZE)


if __name__ == "__main__":
    unittest.main()
