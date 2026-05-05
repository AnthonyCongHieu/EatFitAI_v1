import csv
import sys
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

from common import load_yaml  # noqa: E402


ROOT = Path(__file__).resolve().parents[2]
DECISIONS = ROOT / "ai-provider" / "dataset_v2" / "source_decisions.public_review.csv"
MANIFEST = ROOT / "ai-provider" / "dataset_v2" / "source_manifest.seed.csv"
REGISTRY = ROOT / "ai-provider" / "dataset_v2" / "raw_source_registry.yaml"
OAUTH_SHORTLIST = ROOT / "ai-provider" / "dataset_v2" / "source_shortlist.oauth_audit_2026-05-05.csv"
TOP_TIER_SHORTLIST = ROOT / "ai-provider" / "dataset_v2" / "top_tier_dataset_candidates_2026-05-05.csv"


EXPECTED_DRIVE_ZIPS = {
    "VietFood67.ZIP",
    "Food-Detection-bobotnhan.v7i.yolov11.zip",
    "Food.v6i.yolov11.zip",
    "Food_AI_Tong_Hop.v1-banh_mi.yolov11.zip",
    "Banh dan gian mien Tay.v5i.yolov11.zip",
    "banh-dan-gian-nb.v1i.yolov11.zip",
    "canteen_menu.v4i.yolov11.zip",
    "Food.v3i.yolov11.zip",
    "Food Items.v11i.yolov11.zip",
    "RawData.v12i.yolov11.zip",
    "vietnamese-food-calories.v1i.yolov11.zip",
    "17_food_union_fruit.zip",
    "16_food_detection_xt7yz.zip",
    "15_npg_project.zip",
    "12_thai_food.zip",
    "10_food_detection_64.zip",
    "11_food_detection_3.zip",
    "07_uecfood256.zip",
    "06_fish.zip",
    "05_vegetable_detection.zip",
    "04_food_kcmrd.zip",
    "03_vietnamese_food_5.zip",
    "01_food_data_vn.zip.zip",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


class DatasetV2SourceFileTests(unittest.TestCase):
    def test_public_decisions_cover_all_current_drive_zips(self):
        rows = read_csv(DECISIONS)
        present_zips = {row["drive_zip_name"] for row in rows if row["drive_status"] == "present"}

        self.assertEqual(present_zips, EXPECTED_DRIVE_ZIPS)

    def test_seed_manifest_includes_top_audit_sources_and_quarantines(self):
        rows = read_csv(MANIFEST)
        by_slug = {row["source_slug"]: row for row in rows}

        for slug in [
            "food_data_truongvo",
            "food_detection_bobotnhan",
            "food_items",
            "food_kcmrd",
            "canteen_menu",
            "vegetable_detection",
            "fish",
            "food_detection_3_old",
            "food_union_fruit_old",
        ]:
            self.assertIn(slug, by_slug)

        self.assertEqual(by_slug["food_detection_3_old"]["initial_decision"], "QUARANTINE")
        self.assertEqual(by_slug["food_union_fruit_old"]["initial_decision"], "QUARANTINE")

    def test_raw_registry_tracks_download_candidates(self):
        registry = load_yaml(REGISTRY)
        roboflow_sources = registry.get("roboflow_sources", {})

        for slug in [
            "detection_15_vietnamese_food_v2",
            "food_ingredients_v1",
            "vegetable_object_detection_ybszt",
            "food_ingredient_recognition",
            "food_ingredient_3qyxj",
            "mon_chung",
            "vietnamese_food_nhh",
            "spice_caezr",
            "ingredient_v0h5a",
        ]:
            self.assertIn(slug, roboflow_sources)

    def test_oauth_shortlist_tracks_all_present_drive_zips_and_cache_state(self):
        rows = read_csv(OAUTH_SHORTLIST)
        by_slug = {row["source_slug"]: row for row in rows}
        zips = {row["zip_name"] for row in rows}

        self.assertEqual(zips, EXPECTED_DRIVE_ZIPS)
        for slug in [
            "food_prethesis",
            "rawdata_my_khanh",
            "npg_project",
            "thai_food",
            "food_detection_64",
            "uecfood256",
            "vegetable_detection",
            "food_kcmrd",
        ]:
            self.assertEqual(by_slug[slug]["source_state"], "cached_audited")

        self.assertEqual(by_slug["food_data_truongvo"]["source_state"], "deferred_oversize")
        self.assertEqual(by_slug["vietfood67"]["source_state"], "deferred_oversize_license_risk")
        self.assertEqual(by_slug["food_detection_3_old"]["clean_tier"], "quarantine")
        self.assertEqual(by_slug["food_union_fruit_old"]["clean_tier"], "quarantine")

    def test_top_tier_shortlist_has_reproducible_scoring_columns(self):
        rows = read_csv(TOP_TIER_SHORTLIST)
        required = {
            "source_ref",
            "lane",
            "score",
            "license",
            "project_type",
            "images",
            "class_count",
            "vietnamese_class_hits",
            "vietnamese_class_ratio",
            "ingredient_class_hits",
            "ingredient_class_ratio",
            "exports",
            "metadata_status",
            "matched_queries",
        }

        self.assertTrue(rows)
        self.assertTrue(required.issubset(rows[0].keys()))

    def test_new_roboflow_shortlist_entries_are_registry_ready_or_deferred(self):
        rows = read_csv(TOP_TIER_SHORTLIST)
        registry = load_yaml(REGISTRY)
        roboflow_sources = registry.get("roboflow_sources", {})

        for row in rows:
            if row["origin"] != "roboflow_api" or not row["next_action"].lower().startswith("download"):
                continue
            if row["stage"].startswith("deferred"):
                continue
            self.assertIn(row["source_slug"], roboflow_sources)


if __name__ == "__main__":
    unittest.main()
