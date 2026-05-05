import sys
import unittest
from pathlib import Path
from unittest.mock import patch


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from discover_roboflow_sources import (  # noqa: E402
    VIETNAMESE_CLASS_TERMS,
    RoboflowCandidate,
    candidate_from_search_result,
    count_matching_classes,
    enrich_candidate,
    latest_version_from_project,
    score_candidate,
)


class RoboflowDiscoveryTests(unittest.TestCase):
    def test_vietnamese_detector_scores_top_tier(self):
        candidate = RoboflowCandidate(
            source_ref="roboflow:aiapplication-gzusw/detection_15_vietnamese_food_v2",
            name="detection_15_vietnamese_food_v2",
            url="https://universe.roboflow.com/aiapplication-gzusw/detection_15_vietnamese_food_v2",
            workspace="aiapplication-gzusw",
            project="detection_15_vietnamese_food_v2",
            latest_version="1",
            project_type="object-detection",
            license="CC BY 4.0",
            images=3036,
            class_count=15,
            classes=[
                "Bitter melon soup",
                "Caramelized fish in clay pot",
                "Chicken rice with oily scallion topping",
                "Crab paste vermicelli soup",
                "Cylindrical sticky rice cake",
                "Fresh spring rolls",
                "Fried rice",
                "Grilled beef wrapped in betel leaf",
                "Hollow fried sesame donut",
                "Pumpkin soup",
                "Purple yam soup",
                "Sizzling beef steak",
                "Steamed pork belly with taro",
                "Vietnamese baguette sandwich",
                "Vietnamese beef noodle soup",
            ],
        )

        scored = score_candidate(candidate)

        self.assertEqual(scored.tier, "TOP_TIER_AUDIT")
        self.assertEqual(scored.lane, "BACKBONE_AUDIT")
        self.assertIn("vietnamese_class_signal", scored.reasons)

    def test_ingredient_only_detector_is_supplement_not_top_tier(self):
        candidate = RoboflowCandidate(
            source_ref="roboflow:food-4pya3/food-ingredient-3qyxj",
            name="food ingredient",
            url="https://universe.roboflow.com/food-4pya3/food-ingredient-3qyxj",
            workspace="food-4pya3",
            project="food-ingredient-3qyxj",
            latest_version="5",
            project_type="object-detection",
            license="CC BY 4.0",
            images=23983,
            class_count=10,
            classes=["garlic", "chicken", "chili", "egg", "kimchi", "onion", "potato", "beef", "leek", "carrot"],
            downloads=5,
            stars=1,
        )

        scored = score_candidate(candidate)

        self.assertEqual(scored.lane, "INGREDIENT_SUPPLEMENT_AUDIT")
        self.assertEqual(scored.tier, "SUPPLEMENT_AUDIT")

    def test_spice_detector_is_supplement_even_with_non_english_labels(self):
        candidate = RoboflowCandidate(
            source_ref="roboflow:spiceso/spice-caezr",
            name="spice",
            url="https://universe.roboflow.com/spiceso/spice-caezr",
            workspace="spiceso",
            project="spice-caezr",
            latest_version="1",
            project_type="object-detection",
            license="CC BY 4.0",
            images=4383,
            class_count=12,
            classes=["bawang besar", "bawang putih", "biji ketumbar", "halia", "lengkuas"],
        )

        scored = score_candidate(candidate)

        self.assertEqual(scored.lane, "INGREDIENT_SUPPLEMENT_AUDIT")

    def test_small_vietnamese_detector_is_booster_not_backbone(self):
        candidate = RoboflowCandidate(
            source_ref="roboflow:nhh/vietnamese-food",
            name="Vietnamese Food",
            url="https://universe.roboflow.com/nhh/vietnamese-food",
            workspace="nhh",
            project="vietnamese-food",
            latest_version="1",
            project_type="object-detection",
            license="CC BY 4.0",
            images=1000,
            class_count=5,
            classes=["Banh-Mi", "Bot Chien", "Bun", "Goi-Cuon", "Pho"],
        )

        scored = score_candidate(candidate)

        self.assertEqual(scored.lane, "BOOSTER_AUDIT")
        self.assertEqual(scored.tier, "BOOSTER_AUDIT")

    def test_vietnamese_class_matching_uses_tokens_not_substrings(self):
        hits = count_matching_classes(
            ["complete_food", "chard", "combination_meal", "Banh mi", "Cha gio"],
            VIETNAMESE_CLASS_TERMS,
        )

        self.assertEqual(hits, 2)

    def test_non_food_detection_result_is_rejected(self):
        candidate = RoboflowCandidate(
            source_ref="roboflow:vn/traffic-signs",
            name="Vietnam traffic signs",
            url="https://universe.roboflow.com/vn/traffic-signs",
            workspace="vn",
            project="traffic-signs",
            latest_version="1",
            project_type="object-detection",
            license="CC BY 4.0",
            images=5000,
            class_count=12,
            classes=["speed limit", "stop sign", "warning"],
        )

        scored = score_candidate(candidate)

        self.assertEqual(scored.tier, "REJECT_METADATA")
        self.assertEqual(scored.score, 0.0)
        self.assertIn("not_food_domain", scored.reasons)

    def test_empty_enrichment_classes_do_not_overwrite_search_classes(self):
        candidate = RoboflowCandidate(
            source_ref="roboflow:workspace/project",
            name="Vietnamese Food",
            url="https://universe.roboflow.com/workspace/project",
            workspace="workspace",
            project="project",
            latest_version="1",
            classes=["Banh Mi", "Pho"],
            class_count=2,
        )

        def fake_fetch(url, api_key, params=None):
            if url.endswith("/workspace/project/1"):
                return {"version": {"images": 1000, "classes": [], "exports": ["yolov8"]}}
            return {
                "project": {
                    "type": "object-detection",
                    "license": "CC BY 4.0",
                    "images": 1000,
                    "classes": {},
                }
            }

        with patch("discover_roboflow_sources.fetch_json", side_effect=fake_fetch):
            enriched = enrich_candidate(candidate, "secret")

        self.assertEqual(enriched.classes, ["Banh Mi", "Pho"])
        self.assertEqual(enriched.exports, ["yolov8"])
        self.assertEqual(enriched.metadata_status, "enriched")

    def test_latest_version_uses_highest_numeric_project_version(self):
        self.assertEqual(latest_version_from_project({"versions": [1, 3, 2]}), "3")
        self.assertEqual(latest_version_from_project({"versions": {"1": {}, "4": {}}}), "4")
        self.assertEqual(latest_version_from_project({"versions": [{"version": 1}, {"version": 3}]}), "3")
        self.assertEqual(latest_version_from_project({"versions": [{"id": 2}, {"id": 5}]}), "5")

    def test_search_result_extracts_workspace_and_project_slug(self):
        candidate = candidate_from_search_result(
            {
                "name": "Food Ingredient",
                "url": "https://universe.roboflow.com/food-4pya3/food-ingredient-3qyxj",
                "workspace": {"url": "food-4pya3"},
                "latestVersion": 5,
                "type": "object-detection",
                "classes": ["garlic", "chicken"],
            },
            "food ingredient object detection",
        )

        self.assertEqual(candidate.workspace, "food-4pya3")
        self.assertEqual(candidate.project, "food-ingredient-3qyxj")
        self.assertEqual(candidate.latest_version, "5")


if __name__ == "__main__":
    unittest.main()
