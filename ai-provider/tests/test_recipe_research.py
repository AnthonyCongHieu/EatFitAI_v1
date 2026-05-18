from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nutrition_llm import get_cooking_guide


class RecipeResearchTests(unittest.TestCase):
    def test_get_cooking_guide_accepts_grounded_result_with_sources(self) -> None:
        with (
            patch.dict("os.environ", {"TRUSTED_RECIPE_DOMAINS": "example.com"}),
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch(
                "nutrition_llm.query_gemini",
                return_value=(
                    '{"steps":["Sơ chế","Nấu chín","Hoàn thiện"],'
                    '"cookingTimeMinutes":25,"difficulty":"Dễ",'
                    '"tips":["Nêm sau"],"sourceUrls":["https://example.com/recipe"]}'
                ),
            ),
            patch(
                "nutrition_llm._find_youtube_video",
                return_value={
                    "videoId": "abc",
                    "title": "Cách nấu",
                    "channelTitle": "Trusted",
                    "url": "https://www.youtube.com/watch?v=abc",
                    "thumbnailUrl": "https://i.ytimg.com/vi/abc/hqdefault.jpg",
                },
            ),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "generated")
        self.assertEqual(result["steps"][0], "Sơ chế")
        self.assertEqual(result["youtubeVideo"]["videoId"], "abc")

    def test_get_cooking_guide_falls_back_without_trusted_sources(self) -> None:
        with (
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch(
                "nutrition_llm.query_gemini",
                return_value='{"steps":["Sơ chế","Nấu"],"sourceUrls":[]}',
            ),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "fallback")
        self.assertGreaterEqual(len(result["steps"]), 3)


if __name__ == "__main__":
    unittest.main()
