import csv
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import mine_clean_v4_candidates as miner  # noqa: E402


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    fieldnames: list[str] = []
    for row in rows:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


class CleanV4CandidateMiningTests(unittest.TestCase):
    def test_classification_source_needs_higher_threshold_than_detection_source(self):
        source_rows = [
            {
                "source_slug": "viet_dishes",
                "status": "audited",
                "decision": "PRIORITY_AUDIT",
                "license": "apache-2.0",
                "source_format": "classification_imagefolder",
            },
            {
                "source_slug": "food_boxes",
                "status": "audited",
                "decision": "AUDIT_DIRECT_YOLO",
                "license": "MIT",
                "source_format": "yolo_detection",
            },
        ]
        candidate_rows = [
            {
                "source_slug": "viet_dishes",
                "source_format": "classification_imagefolder",
                "candidate_origin": "classification_pseudo_box_review",
                "raw_class_name": "banh-bao",
                "normalized_class_name": "banh_bao",
                "instances": "650",
                "images": "650",
            },
            {
                "source_slug": "food_boxes",
                "source_format": "yolo_detection",
                "candidate_origin": "yolo_detection",
                "raw_class_name": "banh-bao",
                "normalized_class_name": "banh_bao",
                "instances": "530",
                "images": "360",
            },
        ]

        scorecard = miner.score_candidates(
            candidate_rows,
            source_rows=source_rows,
            base_taxonomy={"classes": ["banh_mi"], "aliases": {"banh_mi": ["banh mi"]}},
            policy=miner.DEFAULT_POLICY,
        )

        self.assertEqual(scorecard[0]["candidate_name"], "banh_bao")
        self.assertEqual(scorecard[0]["decision"], "accept")
        self.assertEqual(scorecard[0]["append_to_taxonomy"], True)
        self.assertEqual(scorecard[0]["source_count"], 2)
        self.assertEqual(scorecard[0]["dominant_candidate_origin"], "classification_pseudo_box_review")

    def test_noncommercial_and_unknown_license_sources_are_not_default_training_accepts(self):
        source_rows = [
            {
                "source_slug": "private_vnfood",
                "status": "audited",
                "decision": "PRIORITY_AUDIT_PRIVATE_ONLY",
                "license": "CC-BY-NC-SA-4.0",
                "source_format": "classification_imagefolder",
            },
            {
                "source_slug": "unknown_food",
                "status": "audited",
                "decision": "HOLD_LICENSE",
                "license": "unknown",
                "source_format": "classification_imagefolder",
            },
        ]
        candidate_rows = [
            {
                "source_slug": "private_vnfood",
                "source_format": "classification_imagefolder",
                "candidate_origin": "classification_pseudo_box_review",
                "raw_class_name": "bun-bo-hue",
                "normalized_class_name": "bun_bo_hue",
                "instances": "1767",
                "images": "1767",
            },
            {
                "source_slug": "unknown_food",
                "source_format": "classification_imagefolder",
                "candidate_origin": "classification_pseudo_box_review",
                "raw_class_name": "banh-mi",
                "normalized_class_name": "banh_mi",
                "instances": "1700",
                "images": "1700",
            },
        ]

        scorecard = miner.score_candidates(
            candidate_rows,
            source_rows=source_rows,
            base_taxonomy={"classes": []},
            policy=miner.DEFAULT_POLICY,
        )
        by_name = {row["candidate_name"]: row for row in scorecard}

        self.assertEqual(by_name["bun_bo_hue"]["decision"], "hold_private_or_license")
        self.assertEqual(by_name["banh_mi"]["decision"], "hold_private_or_license")
        self.assertFalse(by_name["bun_bo_hue"]["append_to_taxonomy"])
        self.assertFalse(by_name["banh_mi"]["append_to_taxonomy"])

    def test_generic_nutrition_bucket_labels_are_held_even_when_large(self):
        source_rows = [
            {
                "source_slug": "nutrition_dataset_yolo",
                "status": "audited",
                "decision": "AUDIT_DIRECT_YOLO",
                "license": "MIT",
                "source_format": "yolo_detection",
            }
        ]
        candidate_rows = [
            {
                "source_slug": "nutrition_dataset_yolo",
                "source_format": "yolo_detection",
                "candidate_origin": "yolo_detection",
                "raw_class_name": "protein",
                "normalized_class_name": "protein",
                "instances": "10096",
                "images": "5214",
            }
        ]

        scorecard = miner.score_candidates(
            candidate_rows,
            source_rows=source_rows,
            base_taxonomy={"classes": []},
            policy=miner.DEFAULT_POLICY,
        )

        self.assertEqual(scorecard[0]["decision"], "hold_generic_label")
        self.assertEqual(scorecard[0]["append_to_taxonomy"], False)

    def test_beverage_and_sauce_labels_are_held_for_manual_nutrition_mapping(self):
        source_rows = [
            {
                "source_slug": "food_recognition",
                "status": "audited",
                "decision": "PRIORITY_AUDIT",
                "license": "CC0-1.0",
                "source_format": "real_world_food_images_or_annotations",
            }
        ]
        candidate_rows = [
            {
                "source_slug": "food_recognition",
                "source_format": "real_world_food_images_or_annotations",
                "candidate_origin": "annotation_category_review",
                "raw_class_name": "water",
                "normalized_class_name": "water",
                "instances": "5360",
                "images": "3002",
            },
            {
                "source_slug": "food_recognition",
                "source_format": "real_world_food_images_or_annotations",
                "candidate_origin": "annotation_category_review",
                "raw_class_name": "tomato-sauce",
                "normalized_class_name": "tomato_sauce",
                "instances": "479",
                "images": "470",
            },
        ]

        scorecard = miner.score_candidates(
            candidate_rows,
            source_rows=source_rows,
            base_taxonomy={"classes": []},
            policy=miner.DEFAULT_POLICY,
        )
        by_name = {row["candidate_name"]: row for row in scorecard}

        self.assertEqual(by_name["water"]["decision"], "hold_manual_mapping")
        self.assertEqual(by_name["tomato_sauce"]["decision"], "hold_manual_mapping")
        self.assertFalse(by_name["water"]["append_to_taxonomy"])

    def test_build_expanded_taxonomy_preserves_base_order_and_records_v4_metadata(self):
        base_taxonomy = {
            "classes": ["banh_mi", "pho"],
            "aliases": {"banh_mi": ["banh mi"], "pho": ["pho"]},
        }
        scorecard = [
            {
                "candidate_name": "banh_bao",
                "decision": "accept",
                "append_to_taxonomy": True,
                "raw_labels": "banh-bao|banh_bao",
            },
            {
                "candidate_name": "protein",
                "decision": "hold_generic_label",
                "append_to_taxonomy": False,
                "raw_labels": "protein",
            },
        ]

        expanded = miner.build_expanded_taxonomy(base_taxonomy, scorecard, source_policy="clean_candidate_sources_v4.csv")

        self.assertEqual(expanded["classes"], ["banh_mi", "pho", "banh_bao"])
        self.assertEqual(expanded["aliases"]["banh_bao"], ["banh-bao", "banh_bao"])
        self.assertEqual(expanded["source_policy"], "clean_candidate_sources_v4.csv")
        self.assertEqual(expanded["version"], "2026-05-13-clean-v4-expanded")

    def test_cli_writes_scorecard_summary_taxonomy_and_source_policy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidates = root / "class_candidates_v4.csv"
            source_audit = root / "v4_source_audit.csv"
            taxonomy = root / "base.yaml"
            scorecard = root / "scorecard.csv"
            summary = root / "summary.json"
            expanded = root / "expanded.yaml"
            source_policy = root / "sources.csv"

            write_csv(
                source_audit,
                [
                    {
                        "source_slug": "food_boxes",
                        "status": "audited",
                        "decision": "AUDIT_DIRECT_YOLO",
                        "license": "MIT",
                        "source_format": "yolo_detection",
                    }
                ],
            )
            write_csv(
                candidates,
                [
                    {
                        "source_slug": "food_boxes",
                        "source_format": "yolo_detection",
                        "candidate_origin": "yolo_detection",
                        "raw_class_name": "banh-bao",
                        "normalized_class_name": "banh_bao",
                        "instances": "530",
                        "images": "360",
                    }
                ],
            )
            taxonomy.write_text("classes:\n  - banh_mi\naliases:\n  banh_mi:\n    - banh mi\n", encoding="utf-8")

            exit_code = miner.main(
                [
                    "--class-candidates",
                    str(candidates),
                    "--source-audit",
                    str(source_audit),
                    "--base-taxonomy",
                    str(taxonomy),
                    "--scorecard-out",
                    str(scorecard),
                    "--summary-out",
                    str(summary),
                    "--expanded-taxonomy-out",
                    str(expanded),
                    "--source-policy-out",
                    str(source_policy),
                    "--write-taxonomy",
                ]
            )

            self.assertEqual(exit_code, 0)
            self.assertIn("banh_bao", scorecard.read_text(encoding="utf-8"))
            self.assertIn('"final_class_count_if_applied"', summary.read_text(encoding="utf-8"))
            self.assertIn("banh_bao", expanded.read_text(encoding="utf-8"))
            self.assertIn("food_boxes", source_policy.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
