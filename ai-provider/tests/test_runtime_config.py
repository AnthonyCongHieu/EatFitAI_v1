from __future__ import annotations

import os
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from runtime_config import get_yolo_confidence_threshold, get_yolo_image_size


class RuntimeConfigTests(unittest.TestCase):
    def test_yolo_confidence_defaults_to_scan_safe_threshold(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(get_yolo_confidence_threshold(), 0.40)

    def test_yolo_confidence_reads_env_override(self) -> None:
        with patch.dict(os.environ, {"YOLO_CONFIDENCE_THRESHOLD": "0.72"}, clear=False):
            self.assertEqual(get_yolo_confidence_threshold(), 0.72)

    def test_yolo_image_size_reads_env_override(self) -> None:
        with patch.dict(os.environ, {"YOLO_IMAGE_SIZE": "512"}, clear=False):
            self.assertEqual(get_yolo_image_size(), 512)

    def test_yolo_image_size_clamps_low_values(self) -> None:
        with patch.dict(os.environ, {"YOLO_IMAGE_SIZE": "16"}, clear=False):
            self.assertEqual(get_yolo_image_size(), 320)

    def test_yolo_image_size_uses_default_for_invalid_values(self) -> None:
        with patch.dict(os.environ, {"YOLO_IMAGE_SIZE": "large"}, clear=False):
            self.assertEqual(get_yolo_image_size(), 640)


if __name__ == "__main__":
    unittest.main()
