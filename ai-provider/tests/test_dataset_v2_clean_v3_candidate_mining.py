import csv
import sys
import tempfile
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import mine_clean_v3_candidates as miner  # noqa: E402


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


class CleanV3CandidateMiningTests(unittest.TestCase):
    def test_normalizes_vietnamese_and_preparation_labels_to_ascii_ids(self):
        self.assertEqual(miner.normalize_candidate_name("Ga-Chien"), "ga_chien")
        self.assertEqual(miner.normalize_candidate_name("Bún thịt nướng"), "bun_thit_nuong")
        self.assertEqual(miner.normalize_candidate_name("Chicken breast"), "chicken_breast")
        self.assertEqual(miner.normalize_candidate_name("Heo quay (Roast pork)"), "heo_quay")
        self.assertEqual(miner.normalize_candidate_name("ye_bun_cha_ca"), "bun_cha_ca")

    def test_existing_base_classes_are_preserved_and_not_accepted_as_new(self):
        rows = [
            {
                "source_slug": "source_a",
                "raw_class_name": "chicken",
                "normalized_class_name": "chicken",
                "instances": "1200",
                "images": "900",
            }
        ]

        scorecard = miner.score_candidates(rows, base_classes=["chicken"], policy=miner.DEFAULT_POLICY)

        self.assertEqual(scorecard[0]["candidate_name"], "chicken")
        self.assertEqual(scorecard[0]["decision"], "existing")
        self.assertEqual(scorecard[0]["append_to_taxonomy"], False)

    def test_base_taxonomy_aliases_are_not_reintroduced_as_new_classes(self):
        base_taxonomy = {
            "classes": ["chicken"],
            "aliases": {
                "chicken": ["Thit ga", "Thit ga (Chicken)", "chicken"],
            },
        }
        rows = [
            {
                "source_slug": "vietfood67",
                "raw_class_name": "Thit ga (Chicken)",
                "normalized_class_name": "thit_ga_chicken",
                "instances": "14887",
                "images": "12718",
            }
        ]

        scorecard = miner.score_candidates(rows, base_taxonomy=base_taxonomy, policy=miner.DEFAULT_POLICY)

        self.assertEqual(scorecard[0]["candidate_name"], "thit_ga")
        self.assertEqual(scorecard[0]["decision"], "existing")
        self.assertEqual(scorecard[0]["existing_canonical_class"], "chicken")
        self.assertEqual(scorecard[0]["append_to_taxonomy"], False)

    def test_base_reject_aliases_stay_rejected_even_with_high_volume(self):
        base_taxonomy = {
            "classes": ["chicken"],
            "aliases": {"chicken": ["chicken"]},
            "reject_aliases": ["salad", "Pho mai", "Pho mai (Cheese)"],
        }
        rows = [
            {
                "source_slug": "vietfood67",
                "raw_class_name": "Pho mai (Cheese)",
                "normalized_class_name": "pho_mai_cheese",
                "instances": "6900",
                "images": "6300",
            }
        ]

        scorecard = miner.score_candidates(rows, base_taxonomy=base_taxonomy, policy=miner.DEFAULT_POLICY)

        self.assertEqual(scorecard[0]["candidate_name"], "pho_mai")
        self.assertEqual(scorecard[0]["decision"], "reject")
        self.assertEqual(scorecard[0]["reject_reason"], "base_reject_alias")
        self.assertEqual(scorecard[0]["append_to_taxonomy"], False)

    def test_groups_parenthetical_and_source_prefix_variants_into_one_candidate(self):
        rows = [
            {
                "source_slug": "vietfood67",
                "raw_class_name": "Heo quay (Roast pork)",
                "normalized_class_name": "heo_quay_roast_pork",
                "instances": "12108",
                "images": "9934",
            },
            {
                "source_slug": "food_items",
                "raw_class_name": "heo-quay",
                "normalized_class_name": "heo_quay",
                "instances": "2100",
                "images": "1800",
            },
            {
                "source_slug": "yolo_food",
                "raw_class_name": "ye_heo_quay",
                "normalized_class_name": "ye_heo_quay",
                "instances": "200",
                "images": "190",
            },
        ]

        scorecard = miner.score_candidates(rows, base_classes=["pork"], policy=miner.DEFAULT_POLICY)

        self.assertEqual(len(scorecard), 1)
        self.assertEqual(scorecard[0]["candidate_name"], "heo_quay")
        self.assertEqual(scorecard[0]["images"], 11924)
        self.assertEqual(scorecard[0]["source_count"], 3)

    def test_accepts_high_volume_nutrition_relevant_preparation_class(self):
        rows = [
            {
                "source_slug": "food_items",
                "raw_class_name": "ga-chien",
                "normalized_class_name": "ga_chien",
                "instances": "1193",
                "images": "1170",
            },
            {
                "source_slug": "canteen_menu",
                "raw_class_name": "ga_chien",
                "normalized_class_name": "ga_chien",
                "instances": "331",
                "images": "321",
            },
        ]

        scorecard = miner.score_candidates(rows, base_classes=["chicken"], policy=miner.DEFAULT_POLICY)

        self.assertEqual(scorecard[0]["candidate_name"], "ga_chien")
        self.assertEqual(scorecard[0]["decision"], "priority_accept")
        self.assertEqual(scorecard[0]["parent_class"], "chicken")
        self.assertEqual(scorecard[0]["append_to_taxonomy"], True)

    def test_holds_low_volume_useful_classes_and_rejects_blocked_labels(self):
        rows = [
            {
                "source_slug": "food_items",
                "raw_class_name": "ga-kho",
                "normalized_class_name": "ga_kho",
                "instances": "24",
                "images": "24",
            },
            {
                "source_slug": "food_ai_tong_hop",
                "raw_class_name": "label",
                "normalized_class_name": "label",
                "instances": "930",
                "images": "806",
            },
        ]

        scorecard = miner.score_candidates(rows, base_classes=["chicken"], policy=miner.DEFAULT_POLICY)
        by_name = {row["candidate_name"]: row for row in scorecard}

        self.assertEqual(by_name["ga_kho"]["decision"], "hold_more_data")
        self.assertEqual(by_name["label"]["decision"], "reject")
        self.assertEqual(by_name["label"]["reject_reason"], "blocked_label")

    def test_build_expanded_taxonomy_appends_accepted_classes_without_reordering_base(self):
        base_taxonomy = {
            "classes": ["chicken", "beef"],
            "aliases": {
                "chicken": ["chicken"],
                "beef": ["beef"],
            },
        }
        scorecard = [
            {
                "candidate_name": "ga_chien",
                "decision": "priority_accept",
                "append_to_taxonomy": True,
                "raw_labels": "ga-chien|ga_chien",
            },
            {
                "candidate_name": "ga_kho",
                "decision": "hold_more_data",
                "append_to_taxonomy": False,
                "raw_labels": "ga-kho",
            },
        ]

        expanded = miner.build_expanded_taxonomy(base_taxonomy, scorecard)

        self.assertEqual(expanded["classes"], ["chicken", "beef", "ga_chien"])
        self.assertEqual(expanded["aliases"]["ga_chien"], ["ga-chien", "ga_chien"])

    def test_cli_writes_scorecard_and_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            candidates = root / "class_candidates.csv"
            taxonomy = root / "taxonomy.yaml"
            out_csv = root / "scorecard.csv"
            out_json = root / "summary.json"
            write_csv(
                candidates,
                [
                    {
                        "source_slug": "food_items",
                        "raw_class_name": "ga-chien",
                        "normalized_class_name": "ga_chien",
                        "instances": "1193",
                        "images": "1170",
                    }
                ],
            )
            taxonomy.write_text("classes:\n  - chicken\naliases:\n  chicken:\n    - chicken\n", encoding="utf-8")

            exit_code = miner.main(
                [
                    "--class-candidates",
                    str(candidates),
                    "--base-taxonomy",
                    str(taxonomy),
                    "--scorecard-out",
                    str(out_csv),
                    "--summary-out",
                    str(out_json),
                ]
            )

            self.assertEqual(exit_code, 0)
            self.assertIn("ga_chien", out_csv.read_text(encoding="utf-8"))
            self.assertIn('"accepted_new_classes"', out_json.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
