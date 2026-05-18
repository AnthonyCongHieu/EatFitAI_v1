from __future__ import annotations

import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nutrition_llm import (
    GeminiUnavailableError,
    _find_youtube_video,
    _youtube_video_cache,
    get_cooking_guide,
)


class FakeResponse:
    def __init__(self, *, text: str = "", json_data=None) -> None:
        self.text = text
        self._json_data = json_data if json_data is not None else {}

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._json_data


class RecipeResearchTests(unittest.TestCase):
    def setUp(self) -> None:
        _youtube_video_cache.clear()

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
            patch("nutrition_llm._find_youtube_video", return_value=None),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "fallback")
        self.assertGreaterEqual(len(result["steps"]), 3)

    def test_get_cooking_guide_falls_back_without_live_youtube_video(self) -> None:
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

        self.assertEqual(result["guideStatus"], "fallback")
        self.assertIsNone(result["youtubeVideo"])

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
            patch("nutrition_llm._find_youtube_video", return_value=None),
        ):
            result = get_cooking_guide("Trứng áp chảo", [{"foodName": "Trứng", "grams": 100}])

        self.assertEqual(result["guideStatus"], "fallback")

    def test_get_cooking_guide_uses_researched_fallback_when_gemini_is_exhausted(self) -> None:
        with (
            patch(
                "nutrition_llm.ensure_gemini_service_available",
                side_effect=GeminiUnavailableError("unavailable", "quota exhausted"),
            ),
            patch(
                "nutrition_llm._find_youtube_video",
                return_value={
                    "videoId": "abc123DEF45",
                    "title": "Cách nấu phở gà",
                    "channelTitle": "Món ngon",
                    "url": "https://www.youtube.com/watch?v=abc123DEF45",
                    "thumbnailUrl": "https://i.ytimg.com/vi/abc123DEF45/hqdefault.jpg",
                },
            ),
        ):
            result = get_cooking_guide("Phở gà", [{"foodName": "Gà", "grams": 150}])

        self.assertEqual(result["guideStatus"], "researched_fallback")
        self.assertEqual(result["sourceUrls"], ["https://www.youtube.com/watch?v=abc123DEF45"])
        self.assertEqual(result["youtubeVideo"]["videoId"], "abc123DEF45")
        self.assertGreaterEqual(len(result["steps"]), 3)

    def test_youtube_lookup_falls_back_to_validated_web_result_without_api_key(self) -> None:
        html = (
            '<script>var ytInitialData = {"contents":{"videoRenderer":{'
            '"videoId":"abc123DEF45",'
            '"title":{"runs":[{"text":"Cách nấu Phở gà ngon"}]},'
            '"ownerText":{"runs":[{"text":"Món Ngon Việt"}]},'
            '"thumbnail":{"thumbnails":[{"url":"https://i.ytimg.com/vi/abc123DEF45/hqdefault.jpg"}]}'
            '}}};</script>'
        )

        with (
            patch.dict(
                "os.environ",
                {"YOUTUBE_DATA_API_KEY": "", "YOUTUBE_WEB_SEARCH_FALLBACK_ENABLED": "true"},
            ),
            patch(
                "nutrition_llm.requests.get",
                side_effect=[
                    FakeResponse(text=html),
                    FakeResponse(
                        json_data={
                            "title": "Cách nấu Phở gà ngon",
                            "author_name": "Món Ngon Việt",
                            "thumbnail_url": "https://i.ytimg.com/vi/abc123DEF45/hqdefault.jpg",
                        }
                    ),
                ],
            ),
        ):
            result = _find_youtube_video("Phở gà")

        self.assertIsNotNone(result)
        self.assertEqual(result["url"], "https://www.youtube.com/watch?v=abc123DEF45")
        self.assertEqual(result["channelTitle"], "Món Ngon Việt")

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


if __name__ == "__main__":
    unittest.main()
