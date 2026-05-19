from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nutrition_llm import get_cooking_guide
from nutrition_llm import _is_reachable_source_url


class RecipeResearchTests(unittest.TestCase):
    def test_source_reachability_treats_network_errors_as_inconclusive_for_trusted_urls(self) -> None:
        with patch("nutrition_llm.requests.head", side_effect=requests.ConnectionError("reset")):
            self.assertTrue(_is_reachable_source_url("https://example.com/recipe"))

    def test_get_cooking_guide_accepts_grounded_result_with_sources(self) -> None:
        with (
            patch.dict("os.environ", {"TRUSTED_RECIPE_DOMAINS": "example.com"}),
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch(
                "nutrition_llm.query_gemini",
                return_value=(
                    '{"prepItems":["Rửa rau","Cắt hành"],'
                    '"steps":["Sơ chế","Nấu chín","Hoàn thiện"],'
                    '"cookingTimeMinutes":25,"difficulty":"Dễ",'
                    '"tips":["Nêm sau"],"sourceUrls":["https://example.com/recipe"]}'
                ),
            ),
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
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
        self.assertEqual(result["prepItems"], ["Rửa rau", "Cắt hành"])
        self.assertEqual(result["steps"][0], "Sơ chế")
        self.assertEqual(result["youtubeVideo"]["videoId"], "abc")

    def test_get_cooking_guide_falls_back_without_trusted_sources(self) -> None:
        with (
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch(
                "nutrition_llm.query_gemini",
                return_value='{"steps":["Sơ chế","Nấu"],"sourceUrls":[]}',
            ),
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "fallback")
        self.assertGreaterEqual(len(result["steps"]), 3)

    def test_get_cooking_guide_accepts_source_backed_result_without_live_youtube_video(self) -> None:
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
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
            patch("nutrition_llm._find_youtube_video", return_value=None),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "generated")
        self.assertIsNone(result["youtubeVideo"])
        self.assertEqual(result["sourceUrls"], ["https://example.com/recipe"])

    def test_get_cooking_guide_accepts_google_grounding_redirect_sources(self) -> None:
        grounding_url = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/demo"
        with (
            patch.dict("os.environ", {"TRUSTED_RECIPE_DOMAINS": "example.com"}),
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch(
                "nutrition_llm.query_gemini",
                return_value=(
                    '{"steps":["Sơ chế","Nấu chín","Hoàn thiện"],'
                    '"cookingTimeMinutes":25,"difficulty":"Dễ",'
                    f'"tips":["Nêm sau"],"sourceUrls":["{grounding_url}"]}}'
                ),
            ),
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
            patch("nutrition_llm._find_youtube_video", return_value=None),
        ):
            result = get_cooking_guide("Gà kho gừng", [{"foodName": "Thịt gà", "grams": 250}])

        self.assertEqual(result["guideStatus"], "generated")
        self.assertEqual(result["sourceUrls"], [grounding_url])

    def test_get_cooking_guide_retries_without_tools_when_grounded_response_is_empty(self) -> None:
        calls = []

        def query_response(*_args, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                return None
            return (
                '{"steps":["Sơ chế","Nấu chín","Hoàn thiện"],'
                '"cookingTimeMinutes":25,"difficulty":"Dễ",'
                '"tips":["Nêm sau"],"sourceUrls":["https://example.com/recipe"]}'
            )

        with (
            patch.dict("os.environ", {"TRUSTED_RECIPE_DOMAINS": "example.com"}),
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch("nutrition_llm.query_gemini", side_effect=query_response),
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
            patch("nutrition_llm._find_youtube_video", return_value=None),
        ):
            result = get_cooking_guide("Phở gà", [{"foodName": "Thịt gà", "grams": 250}])

        self.assertEqual(result["guideStatus"], "generated")
        self.assertGreater(len(calls[0]["tools"]), 0)
        self.assertEqual(calls[1]["tools"], [])

    def test_get_cooking_guide_falls_back_when_source_is_not_reachable(self) -> None:
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
            patch("nutrition_llm._is_reachable_source_url", return_value=False),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "fallback")

    def test_get_cooking_guide_uses_grounding_metadata_sources_when_available(self) -> None:
        def grounded_response(*_args, **kwargs):
            metadata_sink = kwargs["metadata_sink"]
            metadata_sink.update(
                {
                    "candidates": [
                        {
                            "groundingMetadata": {
                                "groundingChunks": [
                                    {"web": {"uri": "https://example.com/grounded-recipe"}}
                                ]
                            }
                        }
                    ]
                }
            )
            return (
                '{"prepItems":["Rửa rau"],'
                '"steps":["Sơ chế","Nấu chín","Hoàn thiện"],'
                '"cookingTimeMinutes":25,"difficulty":"Dễ",'
                '"tips":["Nêm sau"],"sourceUrls":["https://untrusted.invalid/recipe"]}'
            )

        with (
            patch.dict("os.environ", {"TRUSTED_RECIPE_DOMAINS": "example.com"}),
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch("nutrition_llm.query_gemini", side_effect=grounded_response),
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
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
        self.assertEqual(result["sourceUrls"], ["https://example.com/grounded-recipe"])

    def test_get_cooking_guide_prompt_requires_specific_seasoning_quantities(self) -> None:
        captured_prompt = ""
        captured_kwargs = {}

        def capture_prompt(prompt, *_args, **_kwargs):
            nonlocal captured_prompt, captured_kwargs
            captured_prompt = prompt
            captured_kwargs = _kwargs
            return (
                '{"prepItems":["Cân trứng 100g"],'
                '"steps":["Sơ chế","Nấu chín","Hoàn thiện"],'
                '"cookingTimeMinutes":12,"difficulty":"Dễ",'
                '"tips":["Nêm sau"],"sourceUrls":["https://example.com/recipe"]}'
            )

        with (
            patch.dict("os.environ", {"TRUSTED_RECIPE_DOMAINS": "example.com"}),
            patch("nutrition_llm.ensure_gemini_service_available"),
            patch("nutrition_llm.query_gemini", side_effect=capture_prompt),
            patch("nutrition_llm._is_reachable_source_url", return_value=True),
            patch("nutrition_llm._find_youtube_video", return_value=None),
        ):
            get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertIn("định lượng gia vị", captured_prompt.lower())
        self.assertIn("nêm nếm", captured_prompt.lower())
        self.assertIn("100g", captured_prompt)
        self.assertGreaterEqual(captured_kwargs["max_output_tokens"], 1200)


if __name__ == "__main__":
    unittest.main()
