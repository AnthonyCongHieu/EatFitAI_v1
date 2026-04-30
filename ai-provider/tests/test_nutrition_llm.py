from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gemini_pool import GeminiUnavailableError
from nutrition_llm import (
    calculate_nutrition_mifflin,
    get_nutrition_advice,
    get_nutrition_advice_gemini,
    try_parse_add_food_regex,
    try_parse_ask_calories_regex,
    try_parse_weight_regex,
)


class NutritionLlmTests(unittest.TestCase):
    def test_formula_matches_backend_targets_for_cut_maintain_and_bulk(self) -> None:
        common = {
            "gender": "male",
            "age": 30,
            "height_cm": 180,
            "weight_kg": 80,
            "activity_level": "moderate",
        }

        cut = calculate_nutrition_mifflin(goal="lose", **common)
        maintain = calculate_nutrition_mifflin(goal="maintain", **common)
        bulk = calculate_nutrition_mifflin(goal="gain", **common)

        self.assertEqual(cut["calories"], 2207)
        self.assertEqual(cut["protein"], 176)
        self.assertEqual(cut["carbs"], 238)
        self.assertEqual(cut["fat"], 61)

        self.assertEqual(maintain["calories"], 2759)
        self.assertEqual(maintain["protein"], 144)
        self.assertEqual(maintain["carbs"], 373)
        self.assertEqual(maintain["fat"], 77)

        self.assertEqual(bulk["calories"], 3035)
        self.assertEqual(bulk["protein"], 144)
        self.assertEqual(bulk["carbs"], 425)
        self.assertEqual(bulk["fat"], 84)

    def test_get_nutrition_advice_falls_back_when_gemini_is_unavailable(self) -> None:
        with patch(
            "nutrition_llm.ensure_gemini_service_available",
            side_effect=GeminiUnavailableError("gemini_unavailable", "gemini down"),
        ):
            result = get_nutrition_advice(
                gender="female",
                age=28,
                height_cm=165,
                weight_kg=58,
                activity_level="light",
                goal="maintain",
            )

        self.assertEqual(result["source"], "formula")
        self.assertTrue(result["offlineMode"])
        self.assertIn("AI", result["message"])

    def test_get_nutrition_advice_gemini_rejects_absurd_outputs(self) -> None:
        with patch(
            "nutrition_llm.query_gemini",
            return_value='{"calories": 15000, "protein": 900, "carbs": 1500, "fat": 400, "explanation": "bad"}',
        ) as query_gemini:
            result = get_nutrition_advice_gemini(
                gender="male",
                age=30,
                height_cm=180,
                weight_kg=80,
                activity_level="moderate",
                goal="gain",
            )

        self.assertEqual(result["source"], "formula_validated")
        self.assertTrue(result["offlineMode"])
        self.assertIn("công thức chuẩn", result["message"])
        query_gemini.assert_called_once()
        self.assertIs(query_gemini.call_args.kwargs.get("use_cache"), False)

    def test_voice_regex_accepts_unaccented_smoke_phrases(self) -> None:
        calories = try_parse_ask_calories_regex("hom nay toi an bao nhieu calo")
        self.assertIsNotNone(calories)
        self.assertEqual(calories["intent"], "ASK_CALORIES")
        self.assertEqual(calories["source"], "regex")

        weight = try_parse_weight_regex("can nang 70 kg")
        self.assertIsNotNone(weight)
        self.assertEqual(weight["intent"], "LOG_WEIGHT")
        self.assertEqual(weight["entities"]["weight"], 70)

    def test_add_food_regex_accepts_unaccented_smoke_phrases(self) -> None:
        command = try_parse_add_food_regex("ghi 1 banana vao bua sang")

        self.assertIsNotNone(command)
        self.assertEqual(command["intent"], "ADD_FOOD")
        self.assertEqual(command["source"], "regex")
        self.assertEqual(command["entities"]["foodName"], "banana")
        self.assertEqual(command["entities"]["quantity"], 1.0)
        self.assertEqual(command["entities"]["mealType"], "Breakfast")

        snack = try_parse_add_food_regex("ghi 1 tao vao bua phu")
        self.assertEqual(snack["entities"]["mealType"], "Snack")


if __name__ == "__main__":
    unittest.main()
