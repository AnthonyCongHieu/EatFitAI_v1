import csv
import json
import sys
import tempfile
import unittest
import types
from collections import Counter
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import evaluate_golden_set as golden_eval  # noqa: E402


def make_result(scenario: str, expected: str, old_counts: Counter[str], new_counts: Counter[str]) -> dict:
    return {
        "image_path": f"{scenario}.jpg",
        "scenario": scenario,
        "expected_objects": expected,
        "notes": "",
        "old_predictions": dict(old_counts),
        "new_predictions": dict(new_counts),
        "old_score": golden_eval.score_expected(old_counts, expected),
        "new_score": golden_eval.score_expected(new_counts, expected),
        "comparison": golden_eval.compare_expected(expected, old_counts, new_counts),
    }


class DatasetV2GoldenEvalTests(unittest.TestCase):
    def test_score_expected_counts_duplicate_expected_objects(self):
        predicted = Counter({"rice": 1, "egg": 2})

        score = golden_eval.score_expected(predicted, "rice, rice; egg | tofu")

        self.assertEqual(score, {"expected": 4, "hits": 2, "predicted_total": 3})

    def test_compare_expected_tracks_regressions_and_new_gains(self):
        comparison = golden_eval.compare_expected(
            "rice, egg, tofu",
            Counter({"rice": 1, "egg": 1}),
            Counter({"rice": 1, "tofu": 1}),
        )

        self.assertEqual(comparison["new_missing_expected"], {"egg": 1})
        self.assertEqual(comparison["regressions_vs_old"], {"egg": 1})
        self.assertEqual(comparison["new_gains_vs_old"], {"tofu": 1})

    def test_decision_promotes_clean_v1_when_all_gates_pass(self):
        results = [
            make_result("common_meal", "rice, egg", Counter({"rice": 1}), Counter({"rice": 1, "egg": 1})),
            make_result("common_meal", "tofu", Counter({"tofu": 1}), Counter({"tofu": 1})),
        ]
        summary = golden_eval.summarize_results(results)

        decision = golden_eval.decide_next_step(
            summary,
            min_images=2,
            min_new_hit_rate=0.80,
            max_hit_rate_drop=0.02,
            max_new_empty_rate=0.10,
            max_regression_rate=0.10,
        )

        self.assertEqual(decision["status"], "promote_yolo11m_clean_v1")
        self.assertTrue(all(decision["gates"].values()))

    def test_decision_routes_large_regressions_to_clean_v2(self):
        results = [
            make_result("multi_dish", "rice, egg", Counter({"rice": 1, "egg": 1}), Counter()),
            make_result("ingredient", "tofu", Counter({"tofu": 1}), Counter()),
        ]
        summary = golden_eval.summarize_results(results)

        decision = golden_eval.decide_next_step(
            summary,
            min_images=2,
            min_new_hit_rate=0.80,
            max_hit_rate_drop=0.02,
            max_new_empty_rate=0.10,
            max_regression_rate=0.10,
        )

        self.assertEqual(decision["status"], "build_yolo11m_clean_v2")
        self.assertFalse(decision["gates"]["new_hit_rate_floor"])
        self.assertIn("YOLO11m Clean V2", decision["next_step"])

    def test_error_csv_contains_only_missing_or_regressed_images(self):
        results = [
            make_result("pass", "rice", Counter({"rice": 1}), Counter({"rice": 1})),
            make_result("fail", "egg", Counter({"egg": 1}), Counter()),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "errors.csv"
            golden_eval.write_error_csv(results, out)

            with out.open("r", encoding="utf-8", newline="") as f:
                rows = list(csv.DictReader(f))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["image_path"], "fail.jpg")
        self.assertEqual(json.loads(rows[0]["regressions_vs_old"]), {"egg": 1})

    def test_provider_runtime_counts_uses_yolo_recovery_without_gemini(self):
        calls = []

        def fake_detect(path, confidence_threshold, image_size):
            calls.append((path, confidence_threshold, image_size))
            if len(calls) == 1:
                return []
            return [
                {"label": "tomato", "confidence": 0.21},
                {"label": "garlic", "confidence": 0.99},
            ]

        fake_app = types.SimpleNamespace(
            YOLO_CONFIDENCE_THRESHOLD=0.40,
            YOLO_ONNX_IMAGE_SIZE=640,
            YOLO_RECOVERY_CONFIDENCE_THRESHOLD=0.05,
            YOLO_RECOVERY_IMAGE_SIZE=320,
            _detect_with_onnx=fake_detect,
            _should_run_yolo_recovery=lambda detections: not detections,
            _filter_recovery_detections=lambda detections: [
                detection
                for detection in detections
                if detection["label"] == "tomato" and detection["confidence"] >= 0.20
            ],
            _merge_detections=lambda primary, candidates: [*primary, *candidates],
            _should_run_crop_recovery=lambda detections: False,
            _detect_with_onnx_crops=lambda path, confidence_threshold, image_size: [],
        )

        counts = golden_eval.predict_provider_runtime_counts(fake_app, Path("tomato.jpg"))

        self.assertEqual(counts, Counter({"tomato": 1}))
        self.assertEqual(calls, [("tomato.jpg", 0.40, 640), ("tomato.jpg", 0.05, 320)])

    def test_resolve_rollback_model_path_falls_back_to_current_backup_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            backup_dir = repo_root / "ai-provider" / "model_backups" / "yolov8_2026-05-08"
            backup_dir.mkdir(parents=True)
            current_backup = backup_dir / "best.yolov8-or-previous.pt"
            current_backup.write_bytes(b"fake model")

            resolved = golden_eval.resolve_rollback_model_path(
                repo_root,
                Path("ai-provider/model_backups/yolov8_rollback/best.pt"),
            )

        self.assertEqual(resolved, current_backup)


if __name__ == "__main__":
    unittest.main()
