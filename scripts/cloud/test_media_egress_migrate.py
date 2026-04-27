from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("media_egress_migrate.py")
MODULE_SPEC = importlib.util.spec_from_file_location("media_egress_migrate", MODULE_PATH)
media_egress_migrate = importlib.util.module_from_spec(MODULE_SPEC)
assert MODULE_SPEC.loader is not None
sys.modules[MODULE_SPEC.name] = media_egress_migrate
MODULE_SPEC.loader.exec_module(media_egress_migrate)


class MediaEgressMigrateTests(unittest.TestCase):
    def test_resolve_food_thumbnail_object_path_handles_supabase_url(self) -> None:
        url = (
            "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/"
            "food-images/thumbnails/banana.jpg"
        )

        self.assertEqual(
            media_egress_migrate.resolve_food_thumbnail_object_path(url),
            "thumbnails/banana.jpg",
        )

    def test_resolve_food_thumbnail_object_path_preserves_v2_path(self) -> None:
        self.assertEqual(
            media_egress_migrate.resolve_food_thumbnail_object_path("v2/thumb/42.webp"),
            "v2/thumb/42.webp",
        )

    def test_resolve_food_thumbnail_object_path_maps_legacy_relative_filename(self) -> None:
        self.assertEqual(
            media_egress_migrate.resolve_food_thumbnail_object_path("pho-bo.jpg"),
            "thumbnails/pho-bo.jpg",
        )

    def test_build_r2_public_url(self) -> None:
        self.assertEqual(
            media_egress_migrate.build_r2_public_url(
                "https://media.example.com/",
                "food-images/v2/thumb/42.webp",
            ),
            "https://media.example.com/food-images/v2/thumb/42.webp",
        )

    def test_build_r2_put_request_contains_expected_path_and_headers(self) -> None:
        settings = media_egress_migrate.R2Settings(
            account_id="account-id",
            bucket="eatfitai-media",
            access_key_id="access-key",
            secret_access_key="secret-key",
            public_base_url="https://media.example.com",
        )

        url, headers = media_egress_migrate.build_r2_put_request(
            settings,
            "food-images/v2/thumb/42.webp",
            b"payload",
        )

        self.assertEqual(
            url,
            "https://account-id.r2.cloudflarestorage.com/eatfitai-media/food-images/v2/thumb/42.webp",
        )
        self.assertEqual(headers["Cache-Control"], media_egress_migrate.CACHE_CONTROL_IMMUTABLE)
        self.assertEqual(headers["Content-Type"], "image/webp")
        self.assertIn("Credential=access-key/", headers["Authorization"])
        self.assertIn("SignedHeaders=", headers["Authorization"])
        self.assertIn("Signature=", headers["Authorization"])

    def test_metadata_helpers_accept_json_strings(self) -> None:
        metadata = '{"size": "102401", "cacheControl": "public, max-age=60"}'

        self.assertEqual(media_egress_migrate.metadata_size(metadata), 102401)
        self.assertEqual(
            media_egress_migrate.metadata_cache_control(metadata),
            "public, max-age=60",
        )


if __name__ == "__main__":
    unittest.main()
