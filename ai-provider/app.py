"""
EatFitAI AI Provider - Production Service
- YOLO Object Detection (CPU-only)  
- Gemini API cho Nutrition LLM (thay thế Ollama local)
- Không chạy Whisper STT trên cloud (quá nặng)
"""
from __future__ import annotations

from typing import Any, Dict, List
import logging
import time
import threading

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
}
YOLO_ONNX_ENABLED = os.getenv("YOLO_ONNX_ENABLED", "true").strip().lower() not in {"0", "false", "no"}
YOLO_MODEL_FILE = os.getenv("YOLO_MODEL_FILE", "best.pt")
YOLO_ONNX_MODEL_FILE = os.getenv("YOLO_ONNX_MODEL_FILE", "best.onnx")
YOLO_ONNX_IMAGE_SIZE = int(os.getenv("YOLO_ONNX_IMAGE_SIZE", "320"))
ALLOW_SUPABASE_MODEL_DOWNLOAD = os.getenv("ALLOW_SUPABASE_MODEL_DOWNLOAD", "false").strip().lower() in {
    "1",
    "true",
    "yes",
}
YOLO_NMS_THRESHOLD = float(os.getenv("YOLO_NMS_THRESHOLD", "0.45"))
YOLO_CLASS_NAMES = [
    "apple",
    "avocado",
    "banana",
    "bayleaf",
    "beans",
    "beef",
    "beet",
    "bell_pepper",
    "blueberry",
    "broccoli",
    "cabbage",
    "carrot",
    "cauliflower",
    "celery",
    "cherry",
    "chicken",
    "chickpeas",
    "cloves",
    "coriander",
    "corn",
    "cranberry",
    "cucumber",
    "curry_powder",
    "egg",
    "eggplant",
    "fish",
    "garlic",
    "ginger",
    "gooseberry",
    "grape",
    "guava",
    "kumquat",
    "lamb",
    "leek",
    "lemon",
    "lettuce",
    "mango",
    "marrow",
    "mulberry",
    "okra",
    "onion",
    "orange",
    "papaya",
    "peanut",
    "pear",
    "peas",
    "pepper",
    "pineapple",
    "pork",
    "potato",
    "pumpkin",
    "radish",
    "raspberry",
    "rice",
    "salad",
    "salt",
    "shrimp",
    "spinach",
    "spring_onion",
    "squash",
    "strawberry",
    "tomato",
    "turmeric",
]
# YOLO_INFERENCE_LOCK đã bỏ — ONNX Runtime thread-safe (ort.InferenceSession)
# YOLO_MODEL_LOAD_LOCK đã xóa — _load_yolo_model() đã loại bỏ
YOLO_ONNX_MODEL_LOAD_LOCK = threading.Lock()

# Hằng số validate file
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'bmp'}
ALLOWED_AUDIO_EXTENSIONS = {'m4a', 'mp3', 'wav', 'webm', 'ogg', 'flac'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

def allowed_file(filename: str) -> bool:
    """Kiểm tra extension file hình"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# [REMOVED] _download_model_from_supabase — dead code, never called.
# Model files are packaged at build time or pulled from R2 by CI.


# ============== LOAD YOLO MODEL (ONNX only) ==============
# model PyTorch đã loại bỏ — chỉ dùng ONNX Runtime
onnx_model: ort.InferenceSession | None = None
onnx_model_load_error: str | None = None
model_file: str = ""  # Dùng chung cho health check


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
            session_options = ort.SessionOptions()
            session_options.intra_op_num_threads = int(os.getenv("YOLO_ONNX_INTRA_OP_THREADS", "1"))
            session_options.inter_op_num_threads = int(os.getenv("YOLO_ONNX_INTER_OP_THREADS", "1"))
            session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            onnx_model = ort.InferenceSession(
                YOLO_ONNX_MODEL_FILE,
                sess_options=session_options,
                providers=["CPUExecutionProvider"],
            )
            model_file = YOLO_ONNX_MODEL_FILE
            logger.info(f"Loaded YOLO ONNX model: {YOLO_ONNX_MODEL_FILE}")
            return onnx_model
        except Exception as exc:
            onnx_model_load_error = str(exc)
            logger.error(f"Failed to load YOLO ONNX model: {exc}", exc_info=True)
            return None


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


def _detect_with_onnx(path: str, confidence_threshold: float, image_size: int) -> List[Dict[str, float | str]]:
    net = _load_onnx_model()
    if net is None:
        return []

    image = cv2.imread(path)
    if image is None:
        raise ValueError("uploaded image could not be decoded")

    input_image, scale, pad_x, pad_y = _letterbox_image(image, image_size)
    blob = cv2.dnn.blobFromImage(input_image, scalefactor=1 / 255.0, size=(image_size, image_size), swapRB=True)

    input_name = net.get_inputs()[0].name
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

    selected = cv2.dnn.NMSBoxes(boxes, confidences, confidence_threshold, YOLO_NMS_THRESHOLD)
    if len(selected) == 0:
        return []

    best_by_label: Dict[str, Dict[str, float | str]] = {}
    for index in np.array(selected).flatten().tolist():
        label = labels[index].strip().lower()
        confidence = confidences[index]
        existing = best_by_label.get(label)
        if existing is None or confidence > float(existing["confidence"]):
            best_by_label[label] = {"label": label, "confidence": confidence}

    return sorted(best_by_label.values(), key=lambda item: float(item["confidence"]), reverse=True)

# PyTorch/ultralytics đã loại bỏ — ONNX Runtime là inference engine duy nhất.
# Tiết kiệm ~260MB RAM (torch + torchvision + ultralytics).
# DEVICE luôn là CPU trên Render free tier.

# ============== ROUTES ==============

@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "service": "ai-provider", 
        "version": "2.0.0-cloud",
        "endpoints": ["/healthz", "/healthz/gemini", "/detect", "/nutrition-advice", "/meal-insight", "/cooking-instructions"]
    }

@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    """Health check nhẹ, không load YOLO trong lúc Render deploy."""
    gemini_status = _get_gemini_health_status()
    current_model_file = model_file or "not-loaded"
    packaged_model_exists = os.path.exists(YOLO_MODEL_FILE) or os.path.exists(YOLO_ONNX_MODEL_FILE)
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
        "model_type": "not-loaded" if not model_file else (
            "yolov8-custom-eatfitai-onnx" if model_file.endswith(".onnx") else (
                "yolov8-custom-eatfitai" if YOLO_MODEL_FILE in model_file else "yolov8-pretrained"
            )
        ),
        "yolo_onnx_enabled": YOLO_ONNX_ENABLED,
        "yolo_onnx_model_exists": os.path.exists(YOLO_ONNX_MODEL_FILE),
        "supabase_model_download_enabled": ALLOW_SUPABASE_MODEL_DOWNLOAD,
        "generic_yolo_fallback_allowed": allow_generic_yolo_fallback(),
        "yolo_confidence_threshold": YOLO_CONFIDENCE_THRESHOLD,
        "yolo_image_size": YOLO_IMAGE_SIZE,
        "yolo_onnx_image_size": YOLO_ONNX_IMAGE_SIZE,
        "cuda_available": False,
        "device": "cpu",
        "gpu_name": None,
        "llm_provider": "gemini",
        **gemini_status,
    }


@app.get("/healthz/gemini")
def healthz_gemini():
    gemini_status = _get_gemini_health_status()
    http_status = 200 if gemini_status.get("gemini_configured") else 503
    return jsonify(
        {
            "status": "ok" if gemini_status.get("gemini_configured") else "degraded",
            **gemini_status,
        }
    ), http_status


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


def _detections_from_yolo_result(result: Any) -> List[Dict[str, float | str]]:
    names: Dict[int, str] = result[0].names
    detections: List[Dict[str, float | str]] = []
    for box in result[0].boxes:
        label = str(names[int(box.cls)]).strip().lower()
        if not label:
            continue
        detections.append({"label": label, "confidence": float(box.conf)})
    return detections


def _filter_recovery_detections(detections: List[Dict[str, float | str]]) -> List[Dict[str, float | str]]:
    best_by_label: Dict[str, Dict[str, float | str]] = {}
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
            best_by_label[label] = {"label": label, "confidence": confidence}

    return sorted(best_by_label.values(), key=lambda item: float(item["confidence"]), reverse=True)

@app.post("/detect")
@require_internal_token
def detect() -> Response | tuple[Dict[str, str], int]:
    """Detect objects trong ảnh upload"""
    path: str = ""
    
    try:
        data = request.get_json(silent=True) or {}
        image_url = data.get("image_url")
        
        if image_url:
            import requests
            resp = requests.get(image_url, stream=True, timeout=15)
            resp.raise_for_status()
            size = int(resp.headers.get("Content-Length", 0))
            if size > MAX_FILE_SIZE:
                return {"error": "file too large", "detail": f"Max size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"}, 400
                
            filename = f"url_upload_{uuid4().hex}.jpg"
            path = os.path.join("uploads", filename)
            with open(path, "wb") as f_out:
                for chunk in resp.iter_content(chunk_size=8192):
                    f_out.write(chunk)
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

        out = _detect_with_onnx(path, YOLO_CONFIDENCE_THRESHOLD, YOLO_ONNX_IMAGE_SIZE)
        if not out and YOLO_RECOVERY_ENABLED:
            out = _filter_recovery_detections(
                _detect_with_onnx(path, YOLO_RECOVERY_CONFIDENCE_THRESHOLD, YOLO_RECOVERY_IMAGE_SIZE)
            )
            if out:
                logger.info(f"YOLO ONNX recovery pass detected {len(out)} objects in {name}")
        
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


# Import cooking instructions generator
try:
    from nutrition_llm import get_cooking_instructions
    COOKING_INSTRUCTIONS_AVAILABLE = True
    logger.info("✅ Cooking instructions generator loaded")
except ImportError as e:
    COOKING_INSTRUCTIONS_AVAILABLE = False
    logger.warning(f"Cooking instructions generator not available: {e}")


@app.route("/cooking-instructions", methods=["POST"])
@require_internal_token
def cooking_instructions():
    """Generate cooking instructions using Gemini AI"""
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
            resp = requests.get(audio_url, stream=True, timeout=15)
            resp.raise_for_status()
            size = int(resp.headers.get("Content-Length", 0))
            if size > MAX_FILE_SIZE:
                return {"error": "file too large", "success": False}, 400
            
            ext = os.path.splitext(audio_url.split('?')[0])[1].lower() or ".m4a"
            temp_fd, temp_path = tempfile.mkstemp(suffix=ext, dir="uploads")
            os.close(temp_fd)
            
            with open(temp_path, "wb") as f_out:
                for chunk in resp.iter_content(chunk_size=8192):
                    f_out.write(chunk)
            
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
