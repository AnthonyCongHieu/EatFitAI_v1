from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("food_catalog_image_sync.py")
MODULE_SPEC = importlib.util.spec_from_file_location("food_catalog_image_sync", MODULE_PATH)
food_catalog_image_sync = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC.loader is not None
sys.modules[MODULE_SPEC.name] = food_catalog_image_sync
MODULE_SPEC.loader.exec_module(food_catalog_image_sync)


class FoodCatalogImageSyncTests(unittest.TestCase):
    def test_normalize_key_preserves_vietnamese_matching_without_mojibake(self) -> None:
        self.assertEqual(food_catalog_image_sync.normalize_key("Bánh bột lọc.png"), "banh bot loc")
        self.assertEqual(food_catalog_image_sync.normalize_key("cài thìa.png"), "cai thia")
        self.assertNotIn("Ã", food_catalog_image_sync.normalize_key("Bánh mì.png"))

    def test_build_variant_keys_uses_stable_label_paths(self) -> None:
        keys = food_catalog_image_sync.build_variant_keys("banh_mi")

        self.assertEqual(keys.thumb_key, "food-images/v2/thumb/banh_mi.webp")
        self.assertEqual(keys.medium_key, "food-images/v2/medium/banh_mi.webp")
        self.assertEqual(
            keys.thumb_url("https://media.example.com/"),
            "https://media.example.com/food-images/v2/thumb/banh_mi.webp",
        )

    def test_build_sync_plan_maps_drive_names_to_all_catalog_labels(self) -> None:
        catalog = [
            food_catalog_image_sync.CatalogEntry(
                label="bun",
                display_name_vi="Bún",
                aliases=["bún", "bun", "rice vermicelli"],
            ),
            food_catalog_image_sync.CatalogEntry(
                label="noodles",
                display_name_vi="Mì/bún/phở",
                aliases=["mì", "mi", "bún", "bun", "phở", "pho", "noodles"],
            ),
            food_catalog_image_sync.CatalogEntry(
                label="grilled_pork_belly",
                display_name_vi="Thịt ba chỉ nướng",
                aliases=["thịt ba chỉ nướng", "thit ba chi nuong", "grilled pork belly"],
            ),
            food_catalog_image_sync.CatalogEntry(
                label="sizzling_beef_steak",
                display_name_vi="Bò bít tết",
                aliases=["bò bít tết", "bo bit tet", "sizzling beef steak"],
            ),
            food_catalog_image_sync.CatalogEntry(
                label="bokchoy",
                display_name_vi="Cải thìa",
                aliases=["cải thìa", "cai thia", "bok choy", "bokchoy"],
            ),
            food_catalog_image_sync.CatalogEntry(
                label="hu_tieu",
                display_name_vi="Hủ tiếu",
                aliases=["hủ tiếu", "hu tieu"],
            ),
        ]
        drive_files = [
            food_catalog_image_sync.DriveImage(file_id="1", name="bún.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="2", name="mì.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="3", name="thit heo ba chỉ nướng.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="4", name="bò né.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="5", name="cài thìa.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="6", name="hủ tíu.png", mime_type="image/png"),
        ]

        plan = food_catalog_image_sync.build_sync_plan(
            catalog,
            drive_files,
            public_base_url="https://media.example.com",
        )

        self.assertEqual(plan.summary["catalogCount"], 6)
        self.assertEqual(plan.summary["mappedCount"], 6)
        self.assertEqual(plan.summary["missingCount"], 0)
        self.assertEqual(plan.by_label["bun"].source_name, "bún.png")
        self.assertEqual(plan.by_label["noodles"].source_name, "mì.png")
        self.assertEqual(plan.by_label["grilled_pork_belly"].source_name, "thit heo ba chỉ nướng.png")
        self.assertEqual(plan.by_label["sizzling_beef_steak"].source_name, "bò né.png")
        self.assertEqual(plan.by_label["bokchoy"].source_name, "cài thìa.png")
        self.assertEqual(plan.by_label["hu_tieu"].source_name, "hủ tíu.png")

    def test_read_r2_settings_requires_real_values_when_apply_is_enabled(self) -> None:
        with self.assertRaises(SystemExit) as error:
            food_catalog_image_sync.read_r2_settings({}, apply=True)

        self.assertIn("Missing R2 setting(s)", str(error.exception))

    def test_db_only_mode_is_available_for_database_relink_after_upload(self) -> None:
        args = food_catalog_image_sync.build_parser().parse_args(["--db-only"])

        self.assertTrue(args.db_only)
        self.assertFalse(args.apply)
        self.assertFalse(args.upload_only)

    def test_upload_only_mode_is_available_without_database_relink(self) -> None:
        args = food_catalog_image_sync.build_parser().parse_args(["--upload-only"])

        self.assertTrue(args.upload_only)
        self.assertFalse(args.db_only)
        self.assertFalse(args.apply)

    def test_load_recipe_catalog_entries_exposes_dedicated_recipe_images(self) -> None:
        catalog = food_catalog_image_sync.load_recipe_catalog_entries()
        entries_by_label = {entry.label: entry for entry in catalog}

        self.assertEqual(len(catalog), 107)
        self.assertIn("com-tam-suon", entries_by_label)
        self.assertIn("canh-cai-thia", entries_by_label)
        self.assertIn("canh cai thao thit bam", {
            food_catalog_image_sync.normalize_key(alias)
            for alias in entries_by_label["canh-cai-thia"].aliases
        })

    def test_recipe_catalog_mapping_uses_recipe_image_keys(self) -> None:
        catalog = [
            food_catalog_image_sync.CatalogEntry(
                label="com-tam-suon",
                display_name_vi="Cơm tấm sườn",
                aliases=["Cơm tấm sườn", "com tam suon"],
            )
        ]
        drive_files = [
            food_catalog_image_sync.DriveImage(file_id="1", name="Cơm tấm sườn.png", mime_type="image/png")
        ]

        plan = food_catalog_image_sync.build_sync_plan(
            catalog,
            drive_files,
            public_base_url="https://media.example.com",
            object_prefix="recipe-images/v1",
        )

        item = plan.by_label["com-tam-suon"]
        self.assertEqual(item.thumb_key, "recipe-images/v1/thumb/com-tam-suon.webp")
        self.assertEqual(item.medium_key, "recipe-images/v1/medium/com-tam-suon.webp")

    def test_recipe_catalog_mapping_handles_safe_generated_filename_variants(self) -> None:
        catalog = food_catalog_image_sync.load_recipe_catalog_entries()
        drive_files = [
            food_catalog_image_sync.DriveImage(file_id="1", name="phở bò.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="2", name="hủ tíu xào.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="3", name="bánh tráng cuốn thịt heo.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="4", name="bò né.png", mime_type="image/png"),
            food_catalog_image_sync.DriveImage(file_id="5", name="canh cải thìa.png", mime_type="image/png"),
        ]

        plan = food_catalog_image_sync.build_sync_plan(
            catalog,
            drive_files,
            public_base_url="https://media.example.com",
            object_prefix="recipe-images/v1",
        )

        self.assertEqual(plan.by_label["pho-bo"].source_name, "phở bò.png")
        self.assertEqual(plan.by_label["hu-tieu-xao"].source_name, "hủ tíu xào.png")
        self.assertEqual(plan.by_label["cuon-banh-trang-thit-heo"].source_name, "bánh tráng cuốn thịt heo.png")
        self.assertEqual(plan.by_label["bo-ne"].source_name, "bò né.png")
        self.assertEqual(plan.by_label["canh-cai-thia"].source_name, "canh cải thìa.png")
        self.assertNotIn("canh-cai-thao-thit-bam", plan.by_label)


if __name__ == "__main__":
    unittest.main()
