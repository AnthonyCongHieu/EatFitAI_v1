import io
from types import SimpleNamespace
import unittest
from unittest.mock import patch

try:
    import app as app_module
except ModuleNotFoundError as exc:
    app_module = None
    import_error = exc


class LazyYoloModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if app_module is None:
            raise unittest.SkipTest(f"AI provider app dependencies unavailable: {import_error.name}")

    def setUp(self):
        self.previous_model = app_module.model
        self.previous_model_file = app_module.model_file
        self.previous_model_load_error = app_module.model_load_error
        app_module.model = None
        app_module.model_file = ""
        app_module.model_load_error = None
        self.client = app_module.app.test_client()

    def tearDown(self):
        app_module.model = self.previous_model
        app_module.model_file = self.previous_model_file
        app_module.model_load_error = self.previous_model_load_error

    def test_healthz_does_not_load_yolo_model(self):
        with patch.object(
            app_module,
            "_load_yolo_model",
            side_effect=AssertionError("healthz must not load YOLO"),
        ):
            response = self.client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertFalse(payload["model_loaded"])
        self.assertEqual(payload["model_file"], "not-loaded")
        self.assertEqual(payload["model_type"], "not-loaded")

    def test_detect_returns_503_when_lazy_model_load_fails(self):
        app_module.model_load_error = "model boot failed"

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "_detect_with_gemini_vision", return_value=None),
            patch.object(app_module, "_load_yolo_model", return_value=None),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "food.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 503)
        payload = response.get_json()
        self.assertEqual(payload["error"], "model unavailable")
        self.assertEqual(payload["detail"], "model boot failed")

    def test_detect_uses_gemini_vision_before_yolo_model(self):
        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(
                app_module,
                "_detect_with_gemini_vision",
                return_value=[{"label": "raw chicken", "confidence": 0.93}],
            ),
            patch.object(
                app_module,
                "_load_yolo_model",
                side_effect=AssertionError("YOLO should not load when Gemini vision detects food"),
            ),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "chicken.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["detections"], [{"label": "raw chicken", "confidence": 0.93}])

    def test_detect_falls_back_to_yolo_when_gemini_returns_empty(self):
        fake_model = lambda *args, **kwargs: [
            SimpleNamespace(
                names={0: "banana"},
                boxes=[SimpleNamespace(cls=0, conf=0.88)],
            )
        ]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "_detect_with_gemini_vision", return_value=[]),
            patch.object(app_module, "_load_yolo_model", return_value=fake_model),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "banana.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["detections"], [{"label": "banana", "confidence": 0.88}])


if __name__ == "__main__":
    unittest.main()
