import sys
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from discover_kaggle_sources import (  # noqa: E402
    DatasetCandidate,
    decide_candidate,
    rank_candidates,
)


class KaggleDiscoveryTests(unittest.TestCase):
    def test_food_yolo_dataset_is_audit_candidate(self):
        candidate = DatasetCandidate(
            ref="owner/fruit-detection-yolo",
            title="Fruit Detection YOLO",
            subtitle="YOLO object detection dataset",
            description="Fruit images with YOLO labels.",
            license="CC0: Public Domain",
            download_count=100,
            vote_count=10,
            usability_rating=0.75,
        )

        decision = decide_candidate(candidate)

        self.assertEqual(decision.public_decision, "KAGGLE_AUDIT_CANDIDATE")
        self.assertGreater(decision.quality_score, 0)
        self.assertIn("detection", decision.reason.lower())

    def test_vietnamese_food_without_bbox_signal_requires_format_verify(self):
        candidate = DatasetCandidate(
            ref="owner/vietnamese-food",
            title="100 Vietnamese Food",
            subtitle="Vietnamese dish image classification",
            description="Images of Vietnamese food classes.",
            license="CC BY 4.0",
            download_count=20,
            vote_count=3,
            usability_rating=0.6,
        )

        decision = decide_candidate(candidate)

        self.assertEqual(decision.public_decision, "CLASSIFICATION_OR_FORMAT_VERIFY")
        self.assertIn("bbox", decision.reason.lower())

    def test_non_detector_or_unrelated_dataset_is_rejected(self):
        candidate = DatasetCandidate(
            ref="owner/food-reviews",
            title="Vietnamese sentiment food reviews",
            subtitle="Text reviews",
            description="Restaurant review sentiment analysis.",
            license="CC0",
            download_count=900,
            vote_count=50,
            usability_rating=1.0,
        )

        decision = decide_candidate(candidate)

        self.assertEqual(decision.public_decision, "REJECT_METADATA")
        self.assertEqual(decision.quality_score, 0)

    def test_matched_query_does_not_make_unrelated_dataset_food_domain(self):
        candidate = DatasetCandidate(
            ref="owner/yellow-sticky-traps",
            title="Yellow sticky traps",
            subtitle="Agricultural insect trap detection",
            description="Object detection for trap monitoring.",
            license="CC0",
            vote_count=20,
            download_count=1000,
            matched_queries=["fruit vegetable object detection"],
        )

        decision = decide_candidate(candidate)

        self.assertEqual(decision.public_decision, "REJECT_METADATA")
        self.assertEqual(decision.quality_score, 0)

    def test_ranking_prefers_audit_candidates_then_score(self):
        weak_audit = decide_candidate(
            DatasetCandidate(
                ref="owner/food-detection-low",
                title="Food object detection",
                description="YOLO food detection",
                vote_count=0,
                download_count=1,
            )
        )
        strong_audit = decide_candidate(
            DatasetCandidate(
                ref="owner/fruit-detection-strong",
                title="Fruit object detection",
                description="YOLO fruit detection",
                vote_count=20,
                download_count=3000,
                usability_rating=0.8,
            )
        )
        format_verify = decide_candidate(
            DatasetCandidate(
                ref="owner/vietfood",
                title="Vietnamese Food",
                description="Vietnamese food images",
                vote_count=100,
                download_count=10000,
            )
        )

        ranked = rank_candidates([weak_audit, format_verify, strong_audit])

        self.assertEqual([item.ref for item in ranked], ["owner/fruit-detection-strong", "owner/food-detection-low", "owner/vietfood"])


if __name__ == "__main__":
    unittest.main()
