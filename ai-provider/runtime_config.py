from __future__ import annotations

import os


def get_yolo_confidence_threshold() -> float:
    raw = os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.40").strip()
    try:
        value = float(raw)
    except ValueError:
        return 0.50

    return min(1.0, max(0.05, value))


def get_yolo_image_size() -> int:
    raw = os.getenv("YOLO_IMAGE_SIZE", "640").strip()
    try:
        value = int(raw)
    except ValueError:
        return 640

    return min(1280, max(320, value))
