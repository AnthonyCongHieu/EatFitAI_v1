import io
import unittest
from unittest.mock import patch

import numpy as np

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
        self.previous_onnx_model = app_module.onnx_model
        self.previous_model_file = app_module.model_file
        self.previous_onnx_model_file = app_module.YOLO_ONNX_MODEL_FILE
        self.previous_onnx_model_load_error = app_module.onnx_model_load_error
        self.previous_onnx_enabled = app_module.YOLO_ONNX_ENABLED
        app_module.onnx_model = None
        app_module.model_file = ""
        app_module.onnx_model_load_error = None
        app_module.YOLO_ONNX_ENABLED = True
        self.client = app_module.app.test_client()

    def tearDown(self):
        app_module.onnx_model = self.previous_onnx_model
        app_module.model_file = self.previous_model_file
        app_module.YOLO_ONNX_MODEL_FILE = self.previous_onnx_model_file
        app_module.onnx_model_load_error = self.previous_onnx_model_load_error
        app_module.YOLO_ONNX_ENABLED = self.previous_onnx_enabled

    def test_healthz_does_not_load_onnx_model(self):
        with patch.object(
            app_module,
            "_load_onnx_model",
            side_effect=AssertionError("healthz must not load YOLO"),
        ):
            response = self.client.get("/healthz")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertFalse(payload["model_loaded"])
        self.assertEqual(payload["model_file"], "not-loaded")
        self.assertEqual(payload["model_type"], "not-loaded")
        self.assertTrue(payload["yolo_onnx_low_memory"])

    def test_onnx_session_options_use_low_memory_defaults(self):
        previous_low_memory = app_module.YOLO_ONNX_LOW_MEMORY
        try:
            app_module.YOLO_ONNX_LOW_MEMORY = True
            options = app_module._build_onnx_session_options()

            self.assertEqual(options.execution_mode, app_module.ort.ExecutionMode.ORT_SEQUENTIAL)
            self.assertFalse(options.enable_cpu_mem_arena)
            self.assertFalse(options.enable_mem_pattern)
            self.assertEqual(
                options.graph_optimization_level,
                app_module.ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED,
            )
        finally:
            app_module.YOLO_ONNX_LOW_MEMORY = previous_low_memory

    def test_detect_with_onnx_respects_static_model_input_size(self):
        observed = {}

        class FakeInput:
            name = "images"
            shape = [1, 3, 640, 640]

        class FakeSession:
            input_calls = 0

            def get_inputs(self):
                self.input_calls += 1
                return [FakeInput()]

            def run(self, output_names, feeds):
                observed["blob_shape"] = feeds["images"].shape
                return [np.zeros((1, 4 + len(app_module.YOLO_CLASS_NAMES), 0), dtype=np.float32)]

        def fake_blob_from_image(image, scalefactor, size, swapRB):
            observed["blob_size"] = size
            return np.zeros((1, 3, size[1], size[0]), dtype=np.float32)

        fake_session = FakeSession()

        with (
            patch.object(app_module, "_load_onnx_model", return_value=fake_session),
            patch.object(app_module.cv2, "imread", return_value=np.zeros((50, 80, 3), dtype=np.uint8)),
            patch.object(app_module.cv2.dnn, "blobFromImage", side_effect=fake_blob_from_image),
        ):
            detections = app_module._detect_with_onnx("food.jpg", 0.05, 320)

        self.assertEqual(detections, [])
        self.assertEqual(observed["blob_size"], (640, 640))
        self.assertEqual(observed["blob_shape"], (1, 3, 640, 640))
        self.assertEqual(fake_session.input_calls, 1)

    def test_detect_returns_503_when_onnx_model_is_missing(self):
        app_module.YOLO_ONNX_MODEL_FILE = "missing-test-model.onnx"
        app_module.onnx_model_load_error = "model boot failed"

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
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

    def test_detect_runs_onnx_recovery_pass_when_primary_is_empty(self):
        calls = []

        def fake_detect(path, confidence_threshold, image_size):
            calls.append(
                {
                    "confidence_threshold": confidence_threshold,
                    "image_size": image_size,
                }
            )
            if len(calls) == 1:
                return []
            return [{"label": "beef", "confidence": 0.07}]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module.os.path, "exists", return_value=True),
            patch.object(app_module, "_detect_with_onnx", side_effect=fake_detect),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "beef.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["detections"], [{"label": "beef", "confidence": 0.07}])
        self.assertEqual(calls[0]["confidence_threshold"], app_module.YOLO_CONFIDENCE_THRESHOLD)
        self.assertEqual(calls[0]["image_size"], app_module.YOLO_ONNX_IMAGE_SIZE)
        self.assertEqual(calls[1]["confidence_threshold"], app_module.YOLO_RECOVERY_CONFIDENCE_THRESHOLD)
        self.assertEqual(calls[1]["image_size"], app_module.YOLO_RECOVERY_IMAGE_SIZE)

    def test_detect_does_not_run_recovery_when_primary_detects_food(self):
        calls = []

        def fake_detect(path, confidence_threshold, image_size):
            calls.append(
                {
                    "confidence_threshold": confidence_threshold,
                    "image_size": image_size,
                }
            )
            return [{"label": "banana", "confidence": 0.82}]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module.os.path, "exists", return_value=True),
            patch.object(app_module, "_detect_with_onnx", side_effect=fake_detect),
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
