import sys
import unittest
from pathlib import Path


DATASET_V2_DIR = Path(__file__).resolve().parents[1] / "dataset_v2"
if str(DATASET_V2_DIR) not in sys.path:
    sys.path.insert(0, str(DATASET_V2_DIR))

import build_public_golden_seed as seed  # noqa: E402


class DatasetV2PublicGoldenSeedTests(unittest.TestCase):
    def test_openverse_result_maps_to_page_with_license_metadata(self):
        page = seed.openverse_to_page(
            {
                "id": "image-1",
                "title": "Rice bowl",
                "url": "https://example.test/rice.jpg",
                "thumbnail": "https://example.test/rice-thumb.jpg",
                "creator": "A Cook",
                "license": "by",
                "license_url": "https://creativecommons.org/licenses/by/4.0/",
                "provider": "flickr",
                "foreign_landing_url": "https://example.test/source",
                "filetype": "jpg",
            }
        )

        self.assertEqual(page["title"], "Openverse:image-1")
        info = page["imageinfo"][0]
        self.assertEqual(info["url"], "https://example.test/rice-thumb.jpg")
        self.assertEqual(info["mime"], "image/jpeg")
        self.assertEqual(seed.metadata_value(page, "LicenseShortName"), "by")
        self.assertEqual(seed.metadata_value(page, "Artist"), "A Cook")

    def test_openverse_result_without_url_is_rejected(self):
        self.assertIsNone(seed.openverse_to_page({"id": "missing-url"}))


if __name__ == "__main__":
    unittest.main()
