from __future__ import annotations

import os
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from runtime_config import get_yolo_confidence_threshold


class RuntimeConfigTests(unittest.TestCase):
    def test_yolo_confidence_reads_env_override(self) -> None:
        with patch.dict(os.environ, {"YOLO_CONFIDENCE_THRESHOLD": "0.72"}, clear=False):
            self.assertEqual(get_yolo_confidence_threshold(), 0.72)


if __name__ == "__main__":
    unittest.main()
