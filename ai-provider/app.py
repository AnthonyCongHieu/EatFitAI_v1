"""
EatFitAI AI Provider - Production Service
- YOLO11 Object Detection via ONNX Runtime (CPU-only, upgrade từ YOLOv8)
- Gemini API cho Nutrition LLM (thay thế Ollama local)
- Không chạy Whisper STT trên cloud (quá nặng)
- Barcode: Sẵn sàng tích hợp — chỉ cần cắm API provider
"""
from __future__ import annotations

from typing import Any, Dict, List
import ast
import base64
import ipaddress
import json
import logging
import time
import threading
import socket
import tempfile
from urllib.parse import urlparse

import cv2
import numpy as np
import onnxruntime as ort
from flask import Flask, Response, jsonify, request
# ultralytics YOLO đã thay bằng ONNX Runtime — không cần import
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from uuid import uuid4
import os
from functools import wraps
from dotenv import load_dotenv
from internal_auth import (
    INTERNAL_TOKEN_HEADER,
    internal_auth_missing,
    is_internal_request_authorized,
)
from model_policy import allow_generic_yolo_fallback, pending_model_readiness_error
from runtime_config import get_yolo_confidence_threshold, get_yolo_image_size

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
load_dotenv()


def _is_internal_request_authorized() -> bool:
    return is_internal_request_authorized(request.headers.get(INTERNAL_TOKEN_HEADER))


def _internal_auth_failure_response():
    status_code = 503 if internal_auth_missing() else 403
    error = "service_unavailable" if status_code == 503 else "forbidden"
    return jsonify({"error": error}), status_code


def require_internal_token(handler):
    @wraps(handler)
    def wrapper(*args, **kwargs):
        if not _is_internal_request_authorized():
            return _internal_auth_failure_response()

        return handler(*args, **kwargs)

    return wrapper

app: Flask = Flask(__name__)
os.makedirs("uploads", exist_ok=True)

# ONNX Runtime CPU-only — no GPU on Render free tier
DEVICE = "cpu"
YOLO_CONFIDENCE_THRESHOLD = get_yolo_confidence_threshold()
YOLO_IMAGE_SIZE = get_yolo_image_size()
YOLO_RECOVERY_ENABLED = os.getenv("YOLO_RECOVERY_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
YOLO_RECOVERY_CONFIDENCE_THRESHOLD = float(os.getenv("YOLO_RECOVERY_CONFIDENCE_THRESHOLD", "0.05"))
YOLO_RECOVERY_IMAGE_SIZE = int(os.getenv("YOLO_RECOVERY_IMAGE_SIZE", "320"))
YOLO_RECOVERY_AUGMENT = os.getenv("YOLO_RECOVERY_AUGMENT", "false").strip().lower() not in {"0", "false", "no"}
YOLO_RECOVERY_LABEL_MIN_CONFIDENCE: Dict[str, float] = {
    "beef": 0.05,
    "chicken": 0.05,
    "egg": 0.06,
    "fried_egg": 0.08,
    "tomato": 0.20,
    "ginger": 0.06,
    "banh_xeo": 0.20,
    "water_spinach": 0.08,
    "spinach": 0.08,
}
YOLO_SPARSE_RECOVERY_ENABLED = os.getenv("YOLO_SPARSE_RECOVERY_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
YOLO_SPARSE_RECOVERY_MAX_PRIMARY_DETECTIONS = int(os.getenv("YOLO_SPARSE_RECOVERY_MAX_PRIMARY_DETECTIONS", "1"))
YOLO_CROP_RECOVERY_ENABLED = os.getenv("YOLO_CROP_RECOVERY_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
YOLO_CROP_RECOVERY_MAX_PRIMARY_DETECTIONS = int(os.getenv("YOLO_CROP_RECOVERY_MAX_PRIMARY_DETECTIONS", "2"))
YOLO_SPARSE_RECOVERY_ANCHOR_LABELS = {
    "rice",
    "fried_rice",
    "com_tam",
    "chicken_rice",
    "xoi",
    "bun",
    "noodles",
    "pho",
    "hu_tieu",
    "mi_quang",
    "cao_lau",
}
YOLO_GEMINI_VISION_FALLBACK_ENABLED = os.getenv("YOLO_GEMINI_VISION_FALLBACK_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
YOLO_GEMINI_VISION_MAX_PRIMARY_DETECTIONS = int(os.getenv("YOLO_GEMINI_VISION_MAX_PRIMARY_DETECTIONS", "3"))
YOLO_GEMINI_VISION_CONFIDENCE = min(0.74, max(0.40, float(os.getenv("YOLO_GEMINI_VISION_CONFIDENCE", "0.62"))))
YOLO_GEMINI_VISION_MIN_CONFIDENCE = min(1.0, max(0.0, float(os.getenv("YOLO_GEMINI_VISION_MIN_CONFIDENCE", "0.50"))))
YOLO_GEMINI_VISION_MAX_DETECTIONS = int(os.getenv("YOLO_GEMINI_VISION_MAX_DETECTIONS", "6"))
YOLO_ONNX_ENABLED = os.getenv("YOLO_ONNX_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
YOLO_MODEL_FILE = os.getenv("YOLO_MODEL_FILE", "best.pt")
YOLO_ONNX_MODEL_FILE = os.getenv("YOLO_ONNX_MODEL_FILE", "best.onnx")
YOLO_ONNX_IMAGE_SIZE = int(os.getenv("YOLO_ONNX_IMAGE_SIZE", "640"))
YOLO_ONNX_LOW_MEMORY = os.getenv("YOLO_ONNX_LOW_MEMORY", "true").strip().lower() not in {"0", "false", "no"}
YOLO_NMS_THRESHOLD = float(os.getenv("YOLO_NMS_THRESHOLD", "0.45"))
YOLO_CLASS_NAMES = [
    "banh_mi",
    "pho",
    "bun",
    "bot_chien",
    "goi_cuon",
    "fried_rice",
    "com_tam",
    "thit_kho",
    "ca_kho",
    "canh",
    "banh_beo",
    "banh_bo",
    "banh_bot_loc",
    "banh_can",
    "banh_canh",
    "banh_chung",
    "banh_cong",
    "banh_cuon",
    "banh_da_lon",
    "banh_duc",
    "banh_khot",
    "banh_tet",
    "banh_xeo",
    "banh_trang",
    "banh_trang_tron",
    "bo_kho",
    "bo_la_lot",
    "bun_bo_hue",
    "bun_cha",
    "bun_dau",
    "bun_mam",
    "bun_rieu",
    "cha_gio",
    "hu_tieu",
    "lau",
    "mi_quang",
    "cao_lau",
    "xoi",
    "chao_long",
    "sup_cua",
    "bitter_melon_soup",
    "caramelized_fish_clay_pot",
    "chicken_rice",
    "pumpkin_soup",
    "purple_yam_soup",
    "steamed_pork_belly_taro",
    "sizzling_beef_steak",
    "hollow_fried_sesame_donut",
    "nuoc_cham",
    "rice",
    "noodles",
    "chicken",
    "beef",
    "pork",
    "pork_belly",
    "pork_rib",
    "grilled_pork_belly",
    "fish",
    "shrimp",
    "crab",
    "squid",
    "egg",
    "fried_egg",
    "tofu",
    "tempeh",
    "tomato",
    "cucumber",
    "carrot",
    "potato",
    "sweet_potato",
    "spinach",
    "water_spinach",
    "bokchoy",
    "cabbage",
    "cauliflower",
    "broccoli",
    "eggplant",
    "bitter_gourd",
    "bottle_gourd",
    "pumpkin",
    "radish",
    "long_beans",
    "beans",
    "peas",
    "mushroom",
    "chayote",
    "corn",
    "onion",
    "shallot",
    "green_onion",
    "garlic",
    "chili",
    "ginger",
    "galangal",
    "lemongrass",
    "leek",
    "lime_leaf",
    "coriander_seed",
    "fennel_seed",
    "star_anise",
    "cinnamon",
    "clove",
    "turmeric",
    "bell_pepper",
    "lime",
]
# YOLO_INFERENCE_LOCK đã bỏ — ONNX Runtime thread-safe (ort.InferenceSession)
# YOLO_MODEL_LOAD_LOCK đã xóa — _load_yolo_model() đã loại bỏ
YOLO_ONNX_MODEL_LOAD_LOCK = threading.Lock()

# Hằng số validate file
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'bmp'}
ALLOWED_AUDIO_EXTENSIONS = {'m4a', 'mp3', 'wav', 'webm', 'ogg', 'flac'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

IMAGE_RESPONSE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
AUDIO_RESPONSE_CONTENT_TYPES = {
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mp3",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/x-wav",
}

def allowed_file(filename: str) -> bool:
    """Kiểm tra extension file hình"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _allowed_media_hosts() -> set[str]:
    hosts: set[str] = set()

    raw_hosts = os.getenv("AI_PROVIDER_ALLOWED_MEDIA_HOSTS", "")
    for item in raw_hosts.split(","):
        host = item.strip().lower().rstrip(".")
        if host:
            hosts.add(host)

    for key in ("MEDIA_PUBLIC_BASE_URL", "R2_PUBLIC_BASE_URL"):
        raw_url = os.getenv(key, "").strip()
        if not raw_url:
            continue
        parsed = urlparse(raw_url)
        if parsed.hostname:
            hosts.add(parsed.hostname.lower().rstrip("."))

    return hosts


def _host_resolves_to_private(hostname: str) -> bool:
    try:
        addresses = {ipaddress.ip_address(hostname)}
    except ValueError:
        try:
            addresses = {
                ipaddress.ip_address(item[4][0])
                for item in socket.getaddrinfo(hostname, None)
            }
        except OSError:
            return True

    return any(
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
        for address in addresses
    )


def _is_safe_remote_media_url(remote_url: str) -> bool:
    parsed = urlparse(remote_url.strip())
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        return False

    if parsed.username or parsed.password:
        return False

    hostname = parsed.hostname.lower().rstrip(".")
    allowed_hosts = _allowed_media_hosts()
    if not allowed_hosts or hostname not in allowed_hosts:
        return False

    return not _host_resolves_to_private(hostname)


def _is_safe_remote_image_url(image_url: str) -> bool:
    return _is_safe_remote_media_url(image_url)


def _is_safe_remote_audio_url(audio_url: str) -> bool:
    return _is_safe_remote_media_url(audio_url)

# [REMOVED] _download_model_from_supabase — dead code, never called.
# Model files are packaged at build time or pulled from R2 by CI.


# ============== LOAD YOLO MODEL (ONNX only) ==============
# model PyTorch đã loại bỏ — chỉ dùng ONNX Runtime
onnx_model: ort.InferenceSession | None = None
onnx_model_load_error: str | None = None
model_file: str = ""  # Dùng chung cho health check


def _build_onnx_session_options() -> ort.SessionOptions:
    session_options = ort.SessionOptions()
    session_options.intra_op_num_threads = int(os.getenv("YOLO_ONNX_INTRA_OP_THREADS", "1"))
    session_options.inter_op_num_threads = int(os.getenv("YOLO_ONNX_INTER_OP_THREADS", "1"))

    if YOLO_ONNX_LOW_MEMORY:
        # Render Free is capped at 512Mi. CPU memory arena can retain a large
        # inference buffer after the first YOLO11m run and trigger OOM kills.
        session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        session_options.enable_cpu_mem_arena = False
        session_options.enable_mem_pattern = False
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_EXTENDED
    else:
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

    return session_options


def _load_onnx_model() -> ort.InferenceSession | None:
    """Load the exported YOLO ONNX model for fast CPU inference on Render."""
    global onnx_model, onnx_model_load_error, model_file

    if not YOLO_ONNX_ENABLED:
        return None
    if onnx_model is not None:
        return onnx_model

    with YOLO_ONNX_MODEL_LOAD_LOCK:
        if onnx_model is not None:
            return onnx_model

        onnx_model_load_error = None
        if not os.path.exists(YOLO_ONNX_MODEL_FILE):
            onnx_model_load_error = f"{YOLO_ONNX_MODEL_FILE} not found"
            return None

        try:
            session_options = _build_onnx_session_options()
            candidate_model = ort.InferenceSession(
                YOLO_ONNX_MODEL_FILE,
                sess_options=session_options,
                providers=["CPUExecutionProvider"],
            )
            _validate_onnx_class_names(YOLO_CLASS_NAMES, _get_onnx_metadata_class_names(candidate_model))
            onnx_model = candidate_model
            model_file = YOLO_ONNX_MODEL_FILE
            logger.info(f"Loaded YOLO ONNX model: {YOLO_ONNX_MODEL_FILE}")
            return onnx_model
        except Exception as exc:
            onnx_model_load_error = str(exc)
            logger.error(f"Failed to load YOLO ONNX model: {exc}", exc_info=True)
            return None


def _get_onnx_metadata_class_names(net: ort.InferenceSession) -> List[str]:
    metadata = net.get_modelmeta().custom_metadata_map or {}
    raw_names = metadata.get("names")
    if not raw_names:
        raise RuntimeError("YOLO class metadata missing from ONNX model")

    try:
        parsed_names = ast.literal_eval(raw_names)
    except (SyntaxError, ValueError) as exc:
        raise RuntimeError("YOLO class metadata names could not be parsed") from exc

    if isinstance(parsed_names, dict):
        try:
            return [
                str(name).strip().lower()
                for _, name in sorted(
                    ((int(index), name) for index, name in parsed_names.items()),
                    key=lambda item: item[0],
                )
            ]
        except (TypeError, ValueError) as exc:
            raise RuntimeError("YOLO class metadata names had invalid class indexes") from exc

    if isinstance(parsed_names, list):
        return [str(name).strip().lower() for name in parsed_names]

    raise RuntimeError("YOLO class metadata names had an unsupported format")


def _validate_onnx_class_names(expected_names: List[str], actual_names: List[str]) -> None:
    expected = [str(name).strip().lower() for name in expected_names]
    actual = [str(name).strip().lower() for name in actual_names]
    if expected == actual:
        return

    first_difference = next(
        (
            index
            for index, expected_name in enumerate(expected)
            if index >= len(actual) or actual[index] != expected_name
        ),
        None,
    )
    if first_difference is None and len(actual) != len(expected):
        first_difference = min(len(expected), len(actual))

    detail = f"configured={len(expected)} exported={len(actual)}"
    if first_difference is not None:
        expected_name = expected[first_difference] if first_difference < len(expected) else "<missing>"
        actual_name = actual[first_difference] if first_difference < len(actual) else "<missing>"
        detail += f" first_difference={first_difference}: expected {expected_name}, got {actual_name}"

    raise RuntimeError(f"YOLO class metadata mismatch: {detail}")


def _letterbox_image(image: np.ndarray, size: int) -> tuple[np.ndarray, float, int, int]:
    height, width = image.shape[:2]
    if height <= 0 or width <= 0:
        raise ValueError("invalid image dimensions")

    scale = min(size / width, size / height)
    resized_width = max(1, int(round(width * scale)))
    resized_height = max(1, int(round(height * scale)))
    resized = cv2.resize(image, (resized_width, resized_height), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    pad_x = (size - resized_width) // 2
    pad_y = (size - resized_height) // 2
    canvas[pad_y : pad_y + resized_height, pad_x : pad_x + resized_width] = resized
    return canvas, scale, pad_x, pad_y


def _resolve_onnx_input(net: ort.InferenceSession, requested_image_size: int) -> tuple[str, int]:
    input_meta = net.get_inputs()[0]
    resolved_image_size = requested_image_size
    shape = getattr(input_meta, "shape", None)

    if isinstance(shape, (list, tuple)) and len(shape) >= 4:
        height = shape[2]
        width = shape[3]
        if (
            isinstance(height, int)
            and isinstance(width, int)
            and height > 0
            and width > 0
            and height == width
        ):
            resolved_image_size = height

    return input_meta.name, resolved_image_size


def _select_nms_indices_by_label(
    boxes: List[List[int]],
    confidences: List[float],
    labels: List[str],
    confidence_threshold: float,
    nms_threshold: float,
) -> List[int]:
    selected_indices: List[int] = []
    label_groups: Dict[str, List[int]] = {}
    for index, label in enumerate(labels):
        label_groups.setdefault(label, []).append(index)

    for label_indices in label_groups.values():
        label_boxes = [boxes[index] for index in label_indices]
        label_confidences = [confidences[index] for index in label_indices]
        selected = cv2.dnn.NMSBoxes(
            label_boxes,
            label_confidences,
            confidence_threshold,
            nms_threshold,
        )
        if len(selected) == 0:
            continue

        selected_indices.extend(
            label_indices[int(selected_position)]
            for selected_position in np.array(selected).flatten().tolist()
        )

    return selected_indices


def _detect_with_onnx(path: str, confidence_threshold: float, image_size: int) -> List[Dict[str, Any]]:
    net = _load_onnx_model()
    if net is None:
        return []
    input_name, effective_image_size = _resolve_onnx_input(net, image_size)

    image = cv2.imread(path)
    if image is None:
        raise ValueError("uploaded image could not be decoded")

    input_image, scale, pad_x, pad_y = _letterbox_image(image, effective_image_size)
    blob = cv2.dnn.blobFromImage(
        input_image,
        scalefactor=1 / 255.0,
        size=(effective_image_size, effective_image_size),
        swapRB=True,
    )

    output = net.run(None, {input_name: blob})[0]
    predictions = np.squeeze(output)
    if predictions.ndim != 2:
        return []
    if predictions.shape[0] == 4 + len(YOLO_CLASS_NAMES):
        predictions = predictions.T

    boxes: List[List[int]] = []
    confidences: List[float] = []
    labels: List[str] = []
    image_height, image_width = image.shape[:2]

    for row in predictions:
        class_scores = row[4 : 4 + len(YOLO_CLASS_NAMES)]
        if class_scores.size == 0:
            continue
        class_id = int(np.argmax(class_scores))
        confidence = float(class_scores[class_id])
        if confidence < confidence_threshold or class_id >= len(YOLO_CLASS_NAMES):
            continue

        cx, cy, width, height = map(float, row[:4])
        left = (cx - width / 2 - pad_x) / scale
        top = (cy - height / 2 - pad_y) / scale
        box_width = width / scale
        box_height = height / scale

        x = max(0, min(int(round(left)), image_width - 1))
        y = max(0, min(int(round(top)), image_height - 1))
        w = max(1, min(int(round(box_width)), image_width - x))
        h = max(1, min(int(round(box_height)), image_height - y))

        boxes.append([x, y, w, h])
        confidences.append(confidence)
        labels.append(YOLO_CLASS_NAMES[class_id])

    if not boxes:
        return []

    selected_indices = _select_nms_indices_by_label(
        boxes,
        confidences,
        labels,
        confidence_threshold,
        YOLO_NMS_THRESHOLD,
    )
    if not selected_indices:
        return []

    best_by_label: Dict[str, Dict[str, Any]] = {}
    for index in selected_indices:
        label = labels[index].strip().lower()
        confidence = confidences[index]
        existing = best_by_label.get(label)
        if existing is None or confidence > float(existing["confidence"]):
            x, y, w, h = boxes[index]
            best_by_label[label] = {
                "label": label,
                "confidence": confidence,
                "bbox": {"x": x, "y": y, "width": w, "height": h},
            }

    return sorted(best_by_label.values(), key=lambda item: float(item["confidence"]), reverse=True)

# PyTorch/ultralytics đã loại bỏ — ONNX Runtime là inference engine duy nhất.
# Model YOLO11 export ONNX giữ layout tensor YOLO detect; class list phải khớp data.yaml.
# Tiết kiệm ~260MB RAM (torch + torchvision + ultralytics).
# DEVICE luôn là CPU trên Render free tier.

# ============== ROUTES ==============

@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "service": "ai-provider", 
        "version": "2.0.0-cloud",
        "endpoints": ["/healthz", "/healthz/gemini", "/detect", "/nutrition-advice", "/meal-insight", "/cooking-guide", "/cooking-instructions"]
    }

@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    """Health check nhẹ, không load YOLO trong lúc Render deploy."""
    gemini_status = _get_gemini_health_status()
    public_gemini_status = _get_public_gemini_health_status(gemini_status)
    current_model_file = model_file or "not-loaded"
    packaged_model_exists = os.path.exists(YOLO_ONNX_MODEL_FILE)
    current_model_error = pending_model_readiness_error(
        best_model_exists=packaged_model_exists,
        model_loaded=onnx_model is not None,
        model_load_error=onnx_model_load_error,
    )
    
    return {
        "status": "ok",
        "model_loaded": onnx_model is not None,
        "model_file": current_model_file,
        "model_load_error": current_model_error,
        "model_classes_count": len(YOLO_CLASS_NAMES),
        # YOLO11 — upgrade từ YOLOv8. ONNX output format tương thích 100%.
        "model_type": "not-loaded" if not model_file else (
            "yolo11-custom-eatfitai-onnx" if model_file.endswith(".onnx") else (
                "yolo11-custom-eatfitai" if YOLO_MODEL_FILE in model_file else "yolo11-pretrained"
            )
        ),
        "yolo_onnx_enabled": YOLO_ONNX_ENABLED,
        "yolo_onnx_model_exists": os.path.exists(YOLO_ONNX_MODEL_FILE),
        "supabase_model_download_enabled": False,
        "generic_yolo_fallback_allowed": allow_generic_yolo_fallback(),
        "yolo_confidence_threshold": YOLO_CONFIDENCE_THRESHOLD,
        "yolo_sparse_recovery_enabled": YOLO_SPARSE_RECOVERY_ENABLED,
        "yolo_crop_recovery_enabled": YOLO_CROP_RECOVERY_ENABLED,
        "yolo_gemini_vision_fallback_enabled": YOLO_GEMINI_VISION_FALLBACK_ENABLED,
        "yolo_image_size": YOLO_IMAGE_SIZE,
        "yolo_onnx_image_size": YOLO_ONNX_IMAGE_SIZE,
        "yolo_onnx_low_memory": YOLO_ONNX_LOW_MEMORY,
        "cuda_available": False,
        "device": "cpu",
        "gpu_name": None,
        "llm_provider": "gemini",
        **public_gemini_status,
    }


@app.get("/healthz/gemini")
def healthz_gemini():
    gemini_status = _get_gemini_health_status()
    http_status = 200 if gemini_status.get("gemini_configured") else 503
    return jsonify(
        {
            "status": "ok" if gemini_status.get("gemini_configured") else "degraded",
            **_get_public_gemini_health_status(gemini_status, include_operational_fields=True),
        }
    ), http_status


def _get_public_gemini_health_status(
    gemini_status: Dict[str, Any],
    *,
    include_operational_fields: bool = False,
) -> Dict[str, Any]:
    public_status: Dict[str, Any] = {
        "gemini_configured": bool(gemini_status.get("gemini_configured")),
        "gemini_model": gemini_status.get("gemini_model"),
    }

    if not include_operational_fields:
        return public_status

    public_status.update(
        {
            "gemini_available": bool(gemini_status.get("gemini_available_project_count")),
            "gemini_usage_state_store": gemini_status.get("gemini_usage_state_store"),
            "gemini_usage_state_store_degraded": bool(
                gemini_status.get("gemini_usage_state_store_degraded")
            ),
            "gemini_last_failover_reason": gemini_status.get("gemini_last_failover_reason"),
            "gemini_retry_after": gemini_status.get("gemini_retry_after"),
        }
    )
    return public_status


def _get_gemini_health_status() -> Dict[str, Any]:
    if not NUTRITION_LLM_AVAILABLE:
        return {
            "gemini_configured": False,
            "gemini_model": None,
            "gemini_active_project": None,
            "gemini_pool_size": 0,
            "gemini_distinct_project_count": 0,
            "gemini_last_failover_reason": None,
        }

    try:
        return get_gemini_runtime_status()
    except Exception as exc:
        logger.warning(f"Failed to read Gemini runtime status: {exc}")
        return {
            "gemini_configured": False,
            "gemini_model": None,
            "gemini_active_project": None,
            "gemini_pool_size": 0,
            "gemini_distinct_project_count": 0,
            "gemini_last_failover_reason": "healthz_status_error",
        }


def _gemini_service_error_response(exc: Exception):
    status = _get_gemini_health_status()
    payload = {
        "error": getattr(exc, "code", "gemini_unavailable"),
        "detail": str(exc),
        "geminiModel": status.get("gemini_model"),
        "geminiActiveProject": status.get("gemini_active_project"),
        "geminiLastFailoverReason": status.get("gemini_last_failover_reason"),
    }
    retry_after = getattr(exc, "retry_after", None) or status.get("gemini_retry_after")
    if retry_after:
        payload["retryAfter"] = retry_after
    return jsonify(payload), 503


@app.get("/internal/runtime/status")
@require_internal_token
def internal_runtime_status():
    status = _get_gemini_health_status()
    runtime_status = {
        "checkedAt": time.time(),
        **status,
    }
    return jsonify(runtime_status), 200


@app.post("/internal/runtime/reload-keys")
@require_internal_token
def internal_runtime_reload_keys():
    try:
        from shared_gemini_pool import get_shared_pool

        status = get_shared_pool().reload_key_pool()
        return jsonify({"checkedAt": time.time(), "status": "ok", **status}), 200
    except Exception as exc:
        logger.warning("Failed to reload Gemini key pool: %s", exc)
        return jsonify({"error": "gemini_key_pool_reload_failed", "detail": str(exc)}), 503


def _detections_from_yolo_result(result: Any) -> List[Dict[str, Any]]:
    names: Dict[int, str] = result[0].names
    detections: List[Dict[str, Any]] = []
    for box in result[0].boxes:
        label = str(names[int(box.cls)]).strip().lower()
        if not label:
            continue
        detection: Dict[str, Any] = {"label": label, "confidence": float(box.conf)}
        try:
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = [float(value) for value in xyxy[:4]]
            detection["bbox"] = {
                "x": max(0.0, x1),
                "y": max(0.0, y1),
                "width": max(0.0, x2 - x1),
                "height": max(0.0, y2 - y1),
            }
        except Exception:
            pass
        detections.append(detection)
    return detections


def _filter_recovery_detections(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best_by_label: Dict[str, Dict[str, Any]] = {}
    for detection in detections:
        label = str(detection.get("label", "")).strip().lower()
        if label not in YOLO_RECOVERY_LABEL_MIN_CONFIDENCE:
            continue
        try:
            confidence = float(detection.get("confidence", 0.0))
        except (TypeError, ValueError):
            continue
        if confidence < YOLO_RECOVERY_LABEL_MIN_CONFIDENCE[label]:
            continue
        existing = best_by_label.get(label)
        if existing is None or confidence > float(existing["confidence"]):
            filtered = {"label": label, "confidence": confidence}
            if "bbox" in detection:
                filtered["bbox"] = detection["bbox"]
            best_by_label[label] = filtered

    return sorted(best_by_label.values(), key=lambda item: float(item["confidence"]), reverse=True)


def _normalized_detection_label(detection: Dict[str, Any]) -> str:
    return str(detection.get("label", "")).strip().lower()


def _coerce_detection(detection: Dict[str, Any]) -> Dict[str, Any] | None:
    label = _normalized_detection_label(detection)
    if not label:
        return None

    try:
        confidence = float(detection.get("confidence", 0.0))
    except (TypeError, ValueError):
        return None

    coerced: Dict[str, Any] = {
        "label": label,
        "confidence": max(0.0, min(1.0, confidence)),
    }
    bbox = detection.get("bbox")
    if isinstance(bbox, dict):
        coerced["bbox"] = bbox
    return coerced


def _merge_detections(
    primary: List[Dict[str, Any]],
    candidates: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    best_by_label: Dict[str, Dict[str, Any]] = {}

    for detection in [*primary, *candidates]:
        coerced = _coerce_detection(detection)
        if coerced is None:
            continue

        label = str(coerced["label"])
        existing = best_by_label.get(label)
        if existing is None or float(coerced["confidence"]) > float(existing["confidence"]):
            best_by_label[label] = coerced

    return sorted(best_by_label.values(), key=lambda item: float(item["confidence"]), reverse=True)


def _has_sparse_recovery_anchor(detections: List[Dict[str, Any]]) -> bool:
    labels = {_normalized_detection_label(detection) for detection in detections}
    return bool(labels.intersection(YOLO_SPARSE_RECOVERY_ANCHOR_LABELS))


def _should_run_yolo_recovery(detections: List[Dict[str, Any]]) -> bool:
    if not YOLO_RECOVERY_ENABLED:
        return False
    if not detections:
        return True
    if not YOLO_SPARSE_RECOVERY_ENABLED:
        return False
    if len(detections) > YOLO_SPARSE_RECOVERY_MAX_PRIMARY_DETECTIONS:
        return False
    return _has_sparse_recovery_anchor(detections)


def _should_run_crop_recovery(detections: List[Dict[str, Any]]) -> bool:
    if not YOLO_CROP_RECOVERY_ENABLED:
        return False
    if not detections:
        return False
    if len(detections) > YOLO_CROP_RECOVERY_MAX_PRIMARY_DETECTIONS:
        return False
    return _has_sparse_recovery_anchor(detections)


def _should_run_gemini_vision_fallback(detections: List[Dict[str, Any]]) -> bool:
    if not YOLO_GEMINI_VISION_FALLBACK_ENABLED:
        return False
    if not globals().get("NUTRITION_LLM_AVAILABLE", False):
        return False
    if not detections:
        return True
    if len(detections) > YOLO_GEMINI_VISION_MAX_PRIMARY_DETECTIONS:
        return False
    return _has_sparse_recovery_anchor(detections)


def _image_mime_type_for_path(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext in {".jpg", ".jpeg"}:
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    if ext == ".webp":
        return "image/webp"
    if ext == ".bmp":
        return "image/bmp"
    return "image/jpeg"


def _recovery_crop_boxes(width: int, height: int) -> List[tuple[str, int, int, int, int]]:
    raw_boxes = [
        ("left", 0, int(height * 0.18), int(width * 0.45), int(height * 0.72)),
        ("center", int(width * 0.25), int(height * 0.18), int(width * 0.85), int(height * 0.62)),
        ("top_right", int(width * 0.45), 0, width, int(height * 0.38)),
    ]

    boxes: List[tuple[str, int, int, int, int]] = []
    for name, x1, y1, x2, y2 in raw_boxes:
        x1 = max(0, min(width - 1, x1))
        y1 = max(0, min(height - 1, y1))
        x2 = max(x1 + 1, min(width, x2))
        y2 = max(y1 + 1, min(height, y2))
        if (x2 - x1) < 96 or (y2 - y1) < 96:
            continue
        boxes.append((name, x1, y1, x2, y2))
    return boxes


def _remap_crop_detection(
    detection: Dict[str, Any],
    offset_x: int,
    offset_y: int,
    image_width: int,
    image_height: int,
) -> Dict[str, Any]:
    remapped = dict(detection)
    bbox = detection.get("bbox")
    if not isinstance(bbox, dict):
        return remapped

    try:
        x = int(round(float(bbox.get("x", 0)))) + offset_x
        y = int(round(float(bbox.get("y", 0)))) + offset_y
        width = int(round(float(bbox.get("width", 1))))
        height = int(round(float(bbox.get("height", 1))))
    except (TypeError, ValueError):
        return remapped

    x = max(0, min(image_width - 1, x))
    y = max(0, min(image_height - 1, y))
    remapped["bbox"] = {
        "x": x,
        "y": y,
        "width": max(1, min(width, image_width - x)),
        "height": max(1, min(height, image_height - y)),
    }
    return remapped


def _detect_with_onnx_crops(path: str, confidence_threshold: float, image_size: int) -> List[Dict[str, Any]]:
    image = cv2.imread(path)
    if image is None:
        return []

    image_height, image_width = image.shape[:2]
    detections: List[Dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as tmpdir:
        for name, x1, y1, x2, y2 in _recovery_crop_boxes(image_width, image_height):
            crop = image[y1:y2, x1:x2]
            crop_path = os.path.join(tmpdir, f"{name}.jpg")
            if not cv2.imwrite(crop_path, crop):
                continue

            for detection in _detect_with_onnx(crop_path, confidence_threshold, image_size):
                detections.append(
                    _remap_crop_detection(detection, x1, y1, image_width, image_height)
                )

    return _filter_recovery_detections(detections)


def _strip_json_response_fence(text: str) -> str:
    stripped = (text or "").strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        return stripped[start : end + 1]
    return stripped


GEMINI_VISION_LABEL_ALIASES = {
    "boiled_egg": "egg",
    "white_rice": "rice",
    "cooked_rice": "rice",
    "chicken_leg": "chicken",
    "chicken_drumstick": "chicken",
    "fried_chicken": "chicken",
    "grilled_chicken": "chicken",
    "morning_glory": "water_spinach",
    "rau_muong": "water_spinach",
}


def _parse_gemini_vision_detections(text: str) -> List[Dict[str, Any]]:
    try:
        data = json.loads(_strip_json_response_fence(text))
    except (TypeError, ValueError, json.JSONDecodeError) as exc:
        logger.warning(f"Gemini vision response was not valid JSON: {exc}")
        return []

    raw_detections: Any
    if isinstance(data, dict):
        raw_detections = data.get("detections", [])
    else:
        raw_detections = data

    if not isinstance(raw_detections, list):
        return []

    allowed_labels = set(YOLO_CLASS_NAMES)
    best_by_label: Dict[str, Dict[str, Any]] = {}
    for item in raw_detections:
        if not isinstance(item, dict):
            continue

        label = str(item.get("label", "")).strip().lower()
        label = GEMINI_VISION_LABEL_ALIASES.get(label, label)
        if label not in allowed_labels:
            continue

        try:
            confidence = float(item.get("confidence", YOLO_GEMINI_VISION_CONFIDENCE))
        except (TypeError, ValueError):
            confidence = YOLO_GEMINI_VISION_CONFIDENCE
        if confidence > 1.0 and confidence <= 100.0:
            confidence = confidence / 100.0
        confidence = max(0.0, min(1.0, confidence))
        if confidence < YOLO_GEMINI_VISION_MIN_CONFIDENCE:
            continue

        review_confidence = min(confidence, YOLO_GEMINI_VISION_CONFIDENCE)
        existing = best_by_label.get(label)
        if existing is None or review_confidence > float(existing["confidence"]):
            best_by_label[label] = {"label": label, "confidence": review_confidence}

    return sorted(best_by_label.values(), key=lambda item: float(item["confidence"]), reverse=True)[
        :YOLO_GEMINI_VISION_MAX_DETECTIONS
    ]


def _build_gemini_vision_prompt() -> str:
    labels = ", ".join(YOLO_CLASS_NAMES)
    return (
        "You are a conservative food detector for Vietnamese meal logging. "
        "Identify only clearly visible edible food components in the image. "
        "Use only labels from this allowed list: "
        f"{labels}. "
        "Prefer separate component labels when foods are visibly separated on a plate "
        "(for example rice, chicken, egg, water_spinach) instead of a combined dish label. "
        "Ignore bowls, plates, spoons, sauce cups, table surfaces, and drinks. "
        "Return JSON only with this shape: "
        '{"detections":[{"label":"rice","confidence":0.0}]}. '
        "Return at most 6 detections and omit any uncertain food."
    )


def _query_gemini_vision_detections(path: str) -> List[Dict[str, Any]]:
    try:
        from shared_gemini_pool import get_shared_pool

        with open(path, "rb") as image_file:
            image_base64 = base64.b64encode(image_file.read()).decode("ascii")

        response_text = get_shared_pool().generate_with_audio(
            _build_gemini_vision_prompt(),
            audio_base64=image_base64,
            audio_mime_type=_image_mime_type_for_path(path),
            temperature=0.0,
            max_output_tokens=400,
        )
        return _parse_gemini_vision_detections(response_text)
    except Exception as exc:
        logger.warning(f"Gemini vision fallback skipped: {exc}")
        return []


@app.post("/detect")
@require_internal_token
def detect() -> Response | tuple[Dict[str, str], int]:
    """Detect objects trong ảnh upload"""
    path: str = ""
    started_at = time.perf_counter()
    timings = {
        "download_ms": 0.0,
        "primary_onnx_ms": 0.0,
        "recovery_ms": 0.0,
        "crop_ms": 0.0,
        "gemini_fallback_ms": 0.0,
    }
    size = 0
    name = "unknown"
    
    try:
        data = request.get_json(silent=True) or {}
        image_url = data.get("image_url")
        
        if image_url:
            import requests

            if not isinstance(image_url, str) or not _is_safe_remote_image_url(image_url):
                return {"error": "invalid image_url"}, 400

            download_started_at = time.perf_counter()
            with requests.get(image_url, stream=True, timeout=15, allow_redirects=False) as resp:
                if 300 <= resp.status_code < 400:
                    return {"error": "redirect not allowed"}, 400

                resp.raise_for_status()
                content_type = resp.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
                if content_type and content_type not in IMAGE_RESPONSE_CONTENT_TYPES:
                    return {"error": "invalid file type", "detail": "Remote URL did not return a supported image type"}, 400

                size = int(resp.headers.get("Content-Length", 0) or 0)
                if size > MAX_FILE_SIZE:
                    return {"error": "file too large", "detail": f"Max size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"}, 400

                filename = f"url_upload_{uuid4().hex}.jpg"
                path = os.path.join("uploads", filename)
                bytes_written = 0
                with open(path, "wb") as f_out:
                    for chunk in resp.iter_content(chunk_size=8192):
                        if not chunk:
                            continue

                        bytes_written += len(chunk)
                        if bytes_written > MAX_FILE_SIZE:
                            return {
                                "error": "file too large",
                                "detail": f"Max size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
                            }, 400

                        f_out.write(chunk)

                size = bytes_written
                if size == 0:
                    return {"error": "empty file"}, 400
            timings["download_ms"] = (time.perf_counter() - download_started_at) * 1000

            name = filename
            logger.info(f"Processing image from URL: {name} ({size / 1024:.1f}KB)")
        else:
            f: FileStorage | None = request.files.get("file")
            if not f:
                return {"error": "no file or image_url provided"}, 400
            
            if not f.filename:
                logger.warning("File uploaded without filename")
                filename = f"upload_{uuid4().hex}.jpg"
            else:
                timestamp = int(time.time())
                filename = f"{timestamp}_{f.filename}"
            
            if not allowed_file(filename):
                return {
                    "error": "invalid file type", 
                    "detail": f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
                }, 400
            
            # Validate file size
            f.seek(0, 2)
            size = f.tell()
            f.seek(0)
            
            if size > MAX_FILE_SIZE:
                return {
                    "error": "file too large", 
                    "detail": f"Max size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
                }, 400
            
            if size == 0:
                return {"error": "empty file"}, 400
            
            # Save và detect
            name: str = secure_filename(filename)
            if not name:
                name = f"upload_{uuid4().hex}.jpg"
            
            path = os.path.join("uploads", name)
            f.save(path)
            logger.info(f"Processing image from upload: {name} ({size / 1024:.1f}KB)")
        
        # ONNX Runtime thread-safe — không cần YOLO_INFERENCE_LOCK
        out: List[Dict[str, float | str]] = []
        if not os.path.exists(YOLO_ONNX_MODEL_FILE):
            return {
                "error": "model unavailable",
                "detail": onnx_model_load_error or f"{YOLO_ONNX_MODEL_FILE} not found",
            }, 503

        primary_started_at = time.perf_counter()
        out = _detect_with_onnx(path, YOLO_CONFIDENCE_THRESHOLD, YOLO_ONNX_IMAGE_SIZE)
        timings["primary_onnx_ms"] = (time.perf_counter() - primary_started_at) * 1000
        if _should_run_yolo_recovery(out):
            recovery_started_at = time.perf_counter()
            recovery_out = _filter_recovery_detections(
                _detect_with_onnx(path, YOLO_RECOVERY_CONFIDENCE_THRESHOLD, YOLO_RECOVERY_IMAGE_SIZE)
            )
            timings["recovery_ms"] = (time.perf_counter() - recovery_started_at) * 1000
            merged_out = _merge_detections(out, recovery_out)
            if len(merged_out) > len(out):
                logger.info(
                    "YOLO ONNX recovery pass merged %s extra objects in %s",
                    len(merged_out) - len(out),
                    name,
                )
            out = merged_out

        if _should_run_crop_recovery(out):
            crop_started_at = time.perf_counter()
            crop_out = _detect_with_onnx_crops(
                path,
                YOLO_RECOVERY_CONFIDENCE_THRESHOLD,
                YOLO_RECOVERY_IMAGE_SIZE,
            )
            timings["crop_ms"] = (time.perf_counter() - crop_started_at) * 1000
            merged_out = _merge_detections(out, crop_out)
            if len(merged_out) > len(out):
                logger.info(
                    "YOLO ONNX crop recovery merged %s extra objects in %s",
                    len(merged_out) - len(out),
                    name,
                )
            out = merged_out

        if _should_run_gemini_vision_fallback(out):
            gemini_started_at = time.perf_counter()
            gemini_out = _query_gemini_vision_detections(path)
            timings["gemini_fallback_ms"] = (time.perf_counter() - gemini_started_at) * 1000
            merged_out = _merge_detections(out, gemini_out)
            if len(merged_out) > len(out):
                logger.info(
                    "Gemini vision fallback merged %s extra objects in %s",
                    len(merged_out) - len(out),
                    name,
                )
            out = merged_out
        
        total_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "AI provider detect timing "
            "download_ms=%.1f primary_onnx_ms=%.1f recovery_ms=%.1f "
            "crop_ms=%.1f gemini_fallback_ms=%.1f total_ms=%.1f "
            "image_bytes=%s detection_count=%s file=%s",
            timings["download_ms"],
            timings["primary_onnx_ms"],
            timings["recovery_ms"],
            timings["crop_ms"],
            timings["gemini_fallback_ms"],
            total_ms,
            size,
            len(out),
            name,
        )
        logger.info(f"Detected {len(out)} objects in {name}")
        return jsonify({"detections": out})
    
    except Exception as e:
        logger.error(f"Detection failed: {e}", exc_info=True)
        return {"error": "detection failed", "detail": "Unexpected server error"}, 500
    
    finally:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                logger.warning(f"Failed to cleanup {path}: {e}")

# ============== NUTRITION LLM (Gemini API) ==============

try:
    from nutrition_llm import (
        get_nutrition_advice,
        get_meal_insight,
        get_gemini_runtime_status,
        parse_voice_command_llm,
        GeminiQuotaExhaustedError,
        GeminiUnavailableError,
    )
    NUTRITION_LLM_AVAILABLE = True
    VOICE_PARSE_AVAILABLE = True
    logger.info("✅ Nutrition LLM service loaded (Gemini)")
except ImportError as e:
    NUTRITION_LLM_AVAILABLE = False
    VOICE_PARSE_AVAILABLE = False
    logger.warning(f"Nutrition LLM service not available: {e}")


@app.post("/nutrition-advice")
@require_internal_token
def nutrition_advice():
    """AI nutrition target recommendations"""
    try:
        data = request.get_json()
        if not data:
            return {"error": "No JSON data provided"}, 400
        
        required_fields = ["gender", "age", "height", "weight", "activity", "goal"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return {"error": f"Missing fields: {', '.join(missing)}"}, 400
        
        if not NUTRITION_LLM_AVAILABLE:
            return {"error": "Nutrition LLM service not available"}, 503
        
        result = get_nutrition_advice(
            gender=data["gender"],
            age=int(data["age"]),
            height_cm=float(data["height"]),
            weight_kg=float(data["weight"]),
            activity_level=data["activity"],
            goal=data["goal"]
        )
        
        logger.info(f"Nutrition advice generated: {result.get('source', 'unknown')}")
        return jsonify(result)
    
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning(f"Nutrition advice Gemini unavailable: {exc}")
        return _gemini_service_error_response(exc)
    except Exception as e:
        logger.error(f"Nutrition advice error: {e}", exc_info=True)
        return {"error": "Internal server error"}, 500


@app.post("/meal-insight")
@require_internal_token
def meal_insight():
    """AI insights về bữa ăn"""
    try:
        data = request.get_json()
        if not data:
            return {"error": "No JSON data provided"}, 400
        
        if not NUTRITION_LLM_AVAILABLE:
            return {"error": "Nutrition LLM service not available"}, 503
        
        result = get_meal_insight(
            meal_items=data.get("items", []),
            total_calories=data.get("totalCalories", 0),
            target_calories=data.get("targetCalories", 2000),
            current_macros=data.get("currentMacros", {}),
            target_macros=data.get("targetMacros", {})
        )
        
        return jsonify(result)
    
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning(f"Meal insight Gemini unavailable: {exc}")
        return _gemini_service_error_response(exc)
    except Exception as e:
        logger.error(f"Meal insight error: {e}", exc_info=True)
        return {"error": "Internal server error"}, 500


# Import cooking guide generator
try:
    from nutrition_llm import get_cooking_guide, get_cooking_instructions
    COOKING_INSTRUCTIONS_AVAILABLE = True
    logger.info("✅ Cooking guide generator loaded")
except ImportError as e:
    COOKING_INSTRUCTIONS_AVAILABLE = False
    logger.warning(f"Cooking guide generator not available: {e}")


@app.route("/cooking-guide", methods=["POST"])
@require_internal_token
def cooking_guide():
    """Generate grounded cooking guide with validated source URLs."""
    if not COOKING_INSTRUCTIONS_AVAILABLE:
        return {"error": "Cooking guide service not available"}, 503

    try:
        data = request.get_json()
        if not data:
            return {"error": "Missing JSON body"}, 400

        recipe_name = data.get("recipeName", "")
        ingredients = data.get("ingredients", [])
        description = data.get("description", "")

        if not recipe_name:
            return {"error": "recipeName is required"}, 400

        result = get_cooking_guide(
            recipe_name=recipe_name,
            ingredients=ingredients,
            description=description
        )

        return jsonify(result)

    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning(f"Cooking guide Gemini unavailable: {exc}")
        return _gemini_service_error_response(exc)
    except Exception as e:
        logger.error(f"Cooking guide error: {e}", exc_info=True)
        return {"error": "Internal server error"}, 500


@app.route("/cooking-instructions", methods=["POST"])
@require_internal_token
def cooking_instructions():
    """Generate cooking instructions using Gemini AI (legacy shape)."""
    if not COOKING_INSTRUCTIONS_AVAILABLE:
        return {"error": "Cooking instructions service not available"}, 503
    
    try:
        data = request.get_json()
        if not data:
            return {"error": "Missing JSON body"}, 400
        
        recipe_name = data.get("recipeName", "")
        ingredients = data.get("ingredients", [])
        description = data.get("description", "")
        
        if not recipe_name:
            return {"error": "recipeName is required"}, 400
        
        result = get_cooking_instructions(
            recipe_name=recipe_name,
            ingredients=ingredients,
            description=description
        )
        
        return jsonify(result)
    
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning(f"Cooking instructions Gemini unavailable: {exc}")
        return _gemini_service_error_response(exc)
    except Exception as e:
        logger.error(f"Cooking instructions error: {e}", exc_info=True)
        return {"error": "Internal server error"}, 500


# ============== VOICE COMMAND PARSING (Gemini thay Ollama) ==============

@app.post("/voice/parse")
@require_internal_token
def voice_parse():
    """Parse Vietnamese voice command bằng Gemini AI."""
    if not VOICE_PARSE_AVAILABLE:
        return {"error": "Voice parsing service not available"}, 503
    
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return {"error": "Missing 'text' field in request body"}, 400
        
        text = data["text"].strip()
        if not text:
            return {"error": "Empty text provided"}, 400
        
        logger.info(f"Parsing voice command: {text[:50]}...")
        result = parse_voice_command_llm(text)
        
        return jsonify(result)
        
    except (GeminiQuotaExhaustedError, GeminiUnavailableError) as exc:
        logger.warning(f"Voice parsing Gemini unavailable: {exc}")
        return _gemini_service_error_response(exc)
    except Exception as e:
        logger.error(f"Voice parsing error: {e}", exc_info=True)
        return {"error": "Internal server error"}, 500


# ============== STT - Gemini Audio API ==============
# Thay Whisper bằng Gemini Audio API (nhẹ, không cần tải model 1.5GB)
from stt_service import transcribe_audio as gemini_transcribe_audio, is_stt_available

ENABLE_STT = True
WHISPER_AVAILABLE = False  # Whisper vẫn disabled, dùng Gemini thay thế
STT_ENGINE = "gemini-audio"
logger.info("ℹ️  STT enabled via Gemini Audio API (no model download needed)")

@app.route('/voice/transcribe', methods=['POST'])
@require_internal_token
def transcribe_audio():
    """Chuyển audio → text bằng Gemini Audio API."""
    # Kiểm tra Gemini pool có sẵn sàng
    if not is_stt_available():
        return {
            "error": "Speech-to-Text tạm thời không khả dụng (Gemini pool exhausted).",
            "success": False,
            "engine": STT_ENGINE,
        }, 503

    # Kiểm tra payload
    data = request.get_json(silent=True) or {}
    audio_url = data.get("audio_url")
    import tempfile
    temp_path = None
    
    try:
        if audio_url:
            import requests

            if not isinstance(audio_url, str) or not _is_safe_remote_audio_url(audio_url):
                return {"error": "invalid audio_url", "success": False}, 400

            parsed_audio_url = urlparse(audio_url.strip())
            ext = os.path.splitext(parsed_audio_url.path)[1].lower() or ".m4a"
            if ext.lstrip(".") not in ALLOWED_AUDIO_EXTENSIONS:
                return {
                    "error": "invalid file type",
                    "detail": f"Allowed types: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
                    "success": False,
                }, 400

            temp_fd, temp_path = tempfile.mkstemp(suffix=ext, dir="uploads")
            os.close(temp_fd)

            with requests.get(audio_url, stream=True, timeout=15, allow_redirects=False) as resp:
                if 300 <= resp.status_code < 400:
                    return {"error": "redirect not allowed", "success": False}, 400

                resp.raise_for_status()
                content_type = resp.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
                if content_type and content_type not in AUDIO_RESPONSE_CONTENT_TYPES:
                    return {
                        "error": "invalid file type",
                        "detail": "Remote URL did not return a supported audio type",
                        "success": False,
                    }, 400

                try:
                    size = int(resp.headers.get("Content-Length", 0) or 0)
                except ValueError:
                    size = 0

                if size > MAX_FILE_SIZE:
                    return {"error": "file too large", "success": False}, 400

                bytes_written = 0
                with open(temp_path, "wb") as f_out:
                    for chunk in resp.iter_content(chunk_size=8192):
                        if not chunk:
                            continue

                        bytes_written += len(chunk)
                        if bytes_written > MAX_FILE_SIZE:
                            return {"error": "file too large", "success": False}, 400

                        f_out.write(chunk)

                size = bytes_written
                if size == 0:
                    return {"error": "empty file", "success": False}, 400
            
            filename = f"url_audio_{uuid4().hex}{ext}"
            logger.info("STT request via URL: %s, %s bytes", filename, size)
        else:
            if 'audio' not in request.files and 'file' not in request.files:
                return {"error": "Không tìm thấy file audio hoặc audio_url.", "success": False}, 400
        
            audio_file = request.files.get('audio') or request.files.get('file')
            if not audio_file.filename:
                return {"error": "File audio không có tên.", "success": False}, 400
        
            ext = os.path.splitext(audio_file.filename)[1].lower() or ".wav"
            temp_fd, temp_path = tempfile.mkstemp(suffix=ext, dir="uploads")
            os.close(temp_fd)
            audio_file.save(temp_path)
            
            file_size = os.path.getsize(temp_path)
            logger.info("STT request via upload: %s, %s bytes", audio_file.filename, file_size)

        # Gọi Gemini transcribe
        start_time = time.time()
        text = gemini_transcribe_audio(temp_path)
        duration = time.time() - start_time

        if text:
            return {
                "text": text,
                "language": "vi",
                "duration": round(duration, 2),
                "success": True,
                "engine": STT_ENGINE,
            }
        else:
            return {
                "text": "",
                "language": "vi",
                "duration": round(duration, 2),
                "success": False,
                "error": "Không thể nhận dạng giọng nói. Hãy thử nói rõ hơn.",
                "engine": STT_ENGINE,
            }
    except Exception as exc:
        logger.error("STT transcribe error: %s", exc)
        return {
            "error": f"Lỗi xử lý audio: {type(exc).__name__}",
            "success": False,
            "engine": STT_ENGINE,
        }, 500
    finally:
        # Dọn file tạm
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except OSError:
                pass


def _preload_yolo_model_if_configured() -> None:
    if os.getenv("YOLO_PRELOAD_ON_STARTUP", "false").strip().lower() in {"1", "true", "yes"}:
        started_at = time.perf_counter()
        model = _load_onnx_model()
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "YOLO startup preload completed model_loaded=%s elapsed_ms=%.1f model_file=%s",
            model is not None,
            elapsed_ms,
            model_file or YOLO_ONNX_MODEL_FILE,
        )


_preload_yolo_model_if_configured()


if __name__ == "__main__":
    logger.info(f"Starting AI Provider on port 5050")
    logger.info(f"Model: {model_file or 'not loaded'}")
    logger.info(f"Device: {DEVICE}")
    logger.info(f"Nutrition LLM: {'Available (Gemini)' if NUTRITION_LLM_AVAILABLE else 'Not available'}")
    logger.info(f"Voice Parsing: {'Available' if VOICE_PARSE_AVAILABLE else 'Not available'}")
    logger.info(f"Cooking Instructions: {'Available' if COOKING_INSTRUCTIONS_AVAILABLE else 'Not available'}")
    logger.info(f"Allowed file types: {ALLOWED_EXTENSIONS}")
    logger.info(f"Max file size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB")
    app.run(host="0.0.0.0", port=5050)
