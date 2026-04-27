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
        self.previous_onnx_enabled = app_module.YOLO_ONNX_ENABLED
        app_module.model = None
        app_module.model_file = ""
        app_module.model_load_error = None
        app_module.YOLO_ONNX_ENABLED = False
        self.client = app_module.app.test_client()

    def tearDown(self):
        app_module.model = self.previous_model
        app_module.model_file = self.previous_model_file
        app_module.model_load_error = self.previous_model_load_error
        app_module.YOLO_ONNX_ENABLED = self.previous_onnx_enabled

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

    def test_detect_runs_yolo_recovery_pass_when_primary_is_empty(self):
        calls = []

        def fake_model(*args, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                return [SimpleNamespace(names={0: "beef"}, boxes=[])]
            return [
                SimpleNamespace(
                    names={0: "beef", 1: "papaya"},
                    boxes=[
                        SimpleNamespace(cls=0, conf=0.07),
                        SimpleNamespace(cls=1, conf=0.40),
                    ],
                )
            ]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "_load_yolo_model", return_value=fake_model),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "beef.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["detections"], [{"label": "beef", "confidence": 0.07}])
        self.assertEqual(calls[0]["conf"], app_module.YOLO_CONFIDENCE_THRESHOLD)
        self.assertEqual(calls[1]["conf"], app_module.YOLO_RECOVERY_CONFIDENCE_THRESHOLD)
        self.assertEqual(calls[1]["augment"], app_module.YOLO_RECOVERY_AUGMENT)

    def test_detect_does_not_run_recovery_when_primary_detects_food(self):
        calls = []

        def fake_model(*args, **kwargs):
            calls.append(kwargs)
            return [
                SimpleNamespace(
                    names={0: "banana"},
                    boxes=[SimpleNamespace(cls=0, conf=0.82)],
                )
            ]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module, "_load_yolo_model", return_value=fake_model),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "banana.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["detections"], [{"label": "banana", "confidence": 0.82}])
        self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
