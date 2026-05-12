import sys
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import sweep_yolo_runtime_thresholds as sweep  # noqa: E402


class DatasetV2RuntimeThresholdSweepTests(unittest.TestCase):
    def test_build_candidates_cross_product(self):
        candidates = sweep.build_candidates([0.05, 0.25], [0.05], [320, 640])

        self.assertEqual(
            candidates,
            [
                sweep.SweepCandidate(0.05, 0.05, 320),
                sweep.SweepCandidate(0.05, 0.05, 640),
                sweep.SweepCandidate(0.25, 0.05, 320),
                sweep.SweepCandidate(0.25, 0.05, 640),
            ],
        )

    def test_command_sets_runtime_env_without_gemini_fallback(self):
        candidate = sweep.SweepCandidate(0.08, 0.05, 640)

        command, env, report_path, errors_path = sweep.command_for_candidate(
            candidate,
            python_executable="python",
            repo_root=Path("E:/repo"),
            old_model=Path("E:/repo/ai-provider/model_backups/yolov8_rollback/best.pt"),
            manifest=Path("E:/repo/_dataset_v2_reports/golden_eval_v1/manifest.csv"),
            out_dir=Path("E:/repo/_dataset_v2_reports/runtime_threshold_sweep"),
            min_images=300,
            min_new_hit_rate=0.72,
            max_new_empty_rate=0.08,
            max_regression_rate=0.10,
        )

        self.assertEqual(env["YOLO_CONFIDENCE_THRESHOLD"], "0.08")
        self.assertEqual(env["YOLO_RECOVERY_CONFIDENCE_THRESHOLD"], "0.05")
        self.assertEqual(env["YOLO_RECOVERY_IMAGE_SIZE"], "640")
        self.assertEqual(env["YOLO_GEMINI_VISION_FALLBACK_ENABLED"], "false")
        self.assertIn("--new-runtime-provider", command)
        self.assertIn("--min-images", command)
        self.assertIn("300", command)
        self.assertEqual(report_path.name, "golden_eval_runtime_primary_0p08__recovery_0p05__size_640.json")
        self.assertEqual(errors_path.name, "golden_eval_runtime_primary_0p08__recovery_0p05__size_640_errors.csv")

    def test_sort_prefers_promote_then_quality_metrics(self):
        rows = [
            {
                "decision_status": "tune_runtime_thresholds_first",
                "overall": {
                    "new_hit_rate": 0.90,
                    "new_empty_image_rate": 0.0,
                    "regression_rate": 0.0,
                    "hit_rate_delta": 0.9,
                },
            },
            {
                "decision_status": "promote_yolo11m_clean_v1",
                "overall": {
                    "new_hit_rate": 0.73,
                    "new_empty_image_rate": 0.07,
                    "regression_rate": 0.05,
                    "hit_rate_delta": 0.2,
                },
            },
        ]

        self.assertEqual(sorted(rows, key=sweep.sort_key)[0]["decision_status"], "promote_yolo11m_clean_v1")


if __name__ == "__main__":
    unittest.main()
