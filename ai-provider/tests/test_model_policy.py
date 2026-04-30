import unittest

from model_policy import (
    allow_generic_yolo_fallback,
    is_cloud_runtime,
    pending_model_readiness_error,
    supabase_model_download_requested,
)


class ModelPolicyTests(unittest.TestCase):
    def test_render_runtime_disables_generic_fallback_by_default(self):
        env = {"RENDER": "true"}

        self.assertTrue(is_cloud_runtime(env))
        self.assertFalse(allow_generic_yolo_fallback(env))

    def test_local_runtime_allows_generic_fallback_by_default(self):
        self.assertFalse(is_cloud_runtime({}))
        self.assertTrue(allow_generic_yolo_fallback({}))

    def test_explicit_false_disables_generic_fallback_locally(self):
        self.assertFalse(allow_generic_yolo_fallback({"ALLOW_GENERIC_YOLO_FALLBACK": "false"}))

    def test_pending_error_when_production_model_secrets_are_missing(self):
        env = {"RENDER": "true"}

        error = pending_model_readiness_error(
            best_model_exists=False,
            model_loaded=False,
            model_load_error=None,
            env=env,
        )

        self.assertIsNotNone(error)
        self.assertIn("best.pt or best.onnx is required", error)

    def test_pending_error_is_clear_after_load_failure(self):
        error = pending_model_readiness_error(
            best_model_exists=False,
            model_loaded=False,
            model_load_error="download failed",
            env={"RENDER": "true", "SUPABASE_URL": "x", "SUPABASE_SERVICE_KEY": "y"},
        )

        self.assertEqual(error, "download failed")

    def test_pending_error_requires_packaged_model_even_when_supabase_is_configured(self):
        error = pending_model_readiness_error(
            best_model_exists=False,
            model_loaded=False,
            model_load_error=None,
            env={"RENDER": "true", "SUPABASE_URL": "x", "SUPABASE_SERVICE_KEY": "y"},
        )

        self.assertIn("packaged with the service", error)

    def test_supabase_download_flag_is_reported_as_removed(self):
        env = {"RENDER": "true", "ALLOW_SUPABASE_MODEL_DOWNLOAD": "true"}

        self.assertTrue(supabase_model_download_requested(env))
        self.assertEqual(
            pending_model_readiness_error(
                best_model_exists=False,
                model_loaded=False,
                model_load_error=None,
                env=env,
            ),
            "Supabase model download has been removed; package best.pt or best.onnx with the service",
        )


if __name__ == "__main__":
    unittest.main()
