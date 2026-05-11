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

    def test_detect_with_onnx_keeps_overlapping_different_labels(self):
        class_count = len(app_module.YOLO_CLASS_NAMES)

        def prediction(cx, cy, width, height, class_id, confidence):
            row = np.zeros(4 + class_count, dtype=np.float32)
            row[:4] = [cx, cy, width, height]
            row[4 + class_id] = confidence
            return row

        output = np.stack(
            [
                prediction(100, 100, 100, 100, 0, 0.91),
                prediction(102, 102, 100, 100, 1, 0.89),
                prediction(104, 104, 100, 100, 1, 0.78),
            ],
            axis=0,
        )

        class FakeInput:
            name = "images"
            shape = [1, 3, 640, 640]

        class FakeSession:
            def get_inputs(self):
                return [FakeInput()]

            def run(self, output_names, feeds):
                return [output]

        with (
            patch.object(app_module, "_load_onnx_model", return_value=FakeSession()),
            patch.object(app_module.cv2, "imread", return_value=np.zeros((640, 640, 3), dtype=np.uint8)),
        ):
            detections = app_module._detect_with_onnx("multi-food.jpg", 0.35, 640)

        self.assertEqual(
            [item["label"] for item in detections],
            app_module.YOLO_CLASS_NAMES[:2],
        )
        self.assertEqual(
            [round(float(item["confidence"]), 2) for item in detections],
            [0.91, 0.89],
        )

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
            patch.object(app_module, "NUTRITION_LLM_AVAILABLE", False, create=True),
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
            patch.object(app_module, "NUTRITION_LLM_AVAILABLE", False, create=True),
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

    def test_detect_merges_sparse_recovery_when_primary_has_only_staple(self):
        calls = []

        def fake_detect(path, confidence_threshold, image_size):
            calls.append(
                {
                    "confidence_threshold": confidence_threshold,
                    "image_size": image_size,
                }
            )
            if len(calls) == 1:
                return [{"label": "rice", "confidence": 0.85}]
            return [
                {"label": "rice", "confidence": 0.30},
                {"label": "egg", "confidence": 0.11},
                {"label": "chicken", "confidence": 0.09},
                {"label": "cucumber", "confidence": 0.04},
            ]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module.os.path, "exists", return_value=True),
            patch.object(app_module, "_detect_with_onnx", side_effect=fake_detect),
            patch.object(app_module, "NUTRITION_LLM_AVAILABLE", False, create=True),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "rice-meal.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(
            payload["detections"],
            [
                {"label": "rice", "confidence": 0.85},
                {"label": "egg", "confidence": 0.11},
                {"label": "chicken", "confidence": 0.09},
            ],
        )
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1]["confidence_threshold"], app_module.YOLO_RECOVERY_CONFIDENCE_THRESHOLD)
        self.assertEqual(calls[1]["image_size"], app_module.YOLO_RECOVERY_IMAGE_SIZE)

    def test_detect_uses_gemini_vision_fallback_when_yolo_remains_sparse(self):
        calls = []

        def fake_detect(path, confidence_threshold, image_size):
            calls.append(
                {
                    "confidence_threshold": confidence_threshold,
                    "image_size": image_size,
                }
            )
            return [{"label": "rice", "confidence": 0.85}]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module.os.path, "exists", return_value=True),
            patch.object(app_module, "_detect_with_onnx", side_effect=fake_detect),
            patch.object(app_module, "NUTRITION_LLM_AVAILABLE", True, create=True),
            patch.object(app_module, "YOLO_GEMINI_VISION_FALLBACK_ENABLED", True, create=True),
            patch.object(
                app_module,
                "_query_gemini_vision_detections",
                return_value=[
                    {"label": "chicken", "confidence": 0.62},
                    {"label": "egg", "confidence": 0.62},
                    {"label": "water_spinach", "confidence": 0.62},
                ],
                create=True,
            ) as gemini_detect,
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "rice-meal.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(
            [item["label"] for item in payload["detections"]],
            ["rice", "chicken", "egg", "water_spinach"],
        )
        self.assertEqual(len(calls), 2)
        gemini_detect.assert_called_once()

    def test_detect_logs_timing_breakdown(self):
        def fake_detect(path, confidence_threshold, image_size):
            return [{"label": "banana", "confidence": 0.82}]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module.os.path, "exists", return_value=True),
            patch.object(app_module, "_detect_with_onnx", side_effect=fake_detect),
            patch.object(app_module, "NUTRITION_LLM_AVAILABLE", False, create=True),
        ):
            with self.assertLogs(app_module.logger, level="INFO") as logs:
                response = self.client.post(
                    "/detect",
                    data={"file": (io.BytesIO(b"image-bytes"), "banana.jpg")},
                    content_type="multipart/form-data",
                )

        self.assertEqual(response.status_code, 200)
        joined_logs = "\n".join(logs.output)
        self.assertIn("AI provider detect timing", joined_logs)
        self.assertIn("download_ms=", joined_logs)
        self.assertIn("primary_onnx_ms=", joined_logs)
        self.assertIn("total_ms=", joined_logs)
        self.assertIn("image_bytes=", joined_logs)

    def test_detect_merges_crop_recovery_when_full_recovery_still_sparse(self):
        calls = []

        def fake_detect(path, confidence_threshold, image_size):
            calls.append(
                {
                    "confidence_threshold": confidence_threshold,
                    "image_size": image_size,
                }
            )
            if len(calls) == 1:
                return [{"label": "rice", "confidence": 0.85}]
            return [
                {"label": "rice", "confidence": 0.30},
                {"label": "chicken", "confidence": 0.29},
            ]

        with (
            patch.object(app_module, "_is_internal_request_authorized", return_value=True),
            patch.object(app_module.os.path, "exists", return_value=True),
            patch.object(app_module, "_detect_with_onnx", side_effect=fake_detect),
            patch.object(
                app_module,
                "_detect_with_onnx_crops",
                return_value=[{"label": "egg", "confidence": 0.07}],
                create=True,
            ) as crop_detect,
            patch.object(app_module, "NUTRITION_LLM_AVAILABLE", False, create=True),
        ):
            response = self.client.post(
                "/detect",
                data={"file": (io.BytesIO(b"image-bytes"), "rice-meal.jpg")},
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(
            [item["label"] for item in payload["detections"]],
            ["rice", "chicken", "egg"],
        )
        crop_detect.assert_called_once()


if __name__ == "__main__":
    unittest.main()
