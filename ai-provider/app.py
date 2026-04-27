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

from flask import Flask, Response, jsonify, request
from ultralytics import YOLO
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
YOLO_INFERENCE_LOCK = threading.Lock()
YOLO_MODEL_LOAD_LOCK = threading.Lock()

# Hằng số validate file
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'bmp'}
ALLOWED_AUDIO_EXTENSIONS = {'m4a', 'mp3', 'wav', 'webm', 'ogg', 'flac'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

def allowed_file(filename: str) -> bool:
    """Kiểm tra extension file hình"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ============== AUTO-DOWNLOAD MODEL TỪ SUPABASE STORAGE ==============

def _download_model_from_supabase(filename: str = "best.pt") -> bool:
    """
    Download model weights từ Supabase Storage private bucket.
    Chỉ chạy trên cloud khi file chưa tồn tại local.
    Dùng Supabase Python SDK để truy cập bucket private 'ml-models'.
    """
    try:
        from supabase import create_client, Client
    except ImportError:
        logger.error("❌ Thư viện 'supabase' chưa được cài đặt. Chạy `pip install supabase`")
        return False

    url: str = os.getenv("SUPABASE_URL", "")
    key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    if not url or not key:
        logger.warning("⚠️ SUPABASE_URL hoặc SUPABASE_SERVICE_KEY chưa set → bỏ qua download model")
        return False

    logger.info(f"⬇️  Downloading {filename} từ Supabase Storage bằng official SDK...")

    try:
        supabase: Client = create_client(url, key)
        # Download data dưới dạng bytes
        res = supabase.storage.from_("ml-models").download(filename)
        
        with open(filename, "wb") as f:
            f.write(res)

        size_mb = len(res) / (1024 * 1024)
        logger.info(f"✅ Downloaded {filename} thành công ({size_mb:.1f} MB)")
        return True

    except Exception as e:
        logger.error(f"❌ Download {filename} thất bại: {e}")
        # Xóa file lỗi nếu có
        if os.path.exists(filename) and os.path.getsize(filename) == 0:
            os.remove(filename)
        return False


# ============== LOAD YOLO MODEL ==============
model: YOLO | None = None
model_file: str = ""
model_load_error: str | None = None

# GPU detection - Cloud chạy CPU, local có thể có GPU
import torch

def get_optimal_device():
    """Chọn device tối ưu: GPU nếu có, fallback CPU"""
    if torch.cuda.is_available():
        device = "cuda:0"
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"✅ GPU detected: {gpu_name} ({vram:.1f}GB VRAM)")
        return device
    else:
        logger.info("🔧 Chạy trên CPU (production cloud mode)")
        return "cpu"

DEVICE = get_optimal_device()

def _load_yolo_model() -> YOLO | None:
    """Load YOLO on demand so /healthz stays fast during Render deploys."""
    global model, model_file, model_load_error

    if model is not None:
        return model

    with YOLO_MODEL_LOAD_LOCK:
        if model is not None:
            return model

        model_load_error = None

        try:
            # Nếu best.pt chưa có (trên cloud) → tự động download từ Supabase Storage
            if not os.path.exists("best.pt"):
                logger.info("📦 best.pt không tìm thấy → thử download từ Supabase Storage...")
                _download_model_from_supabase("best.pt")

            if os.path.exists("best.pt"):
                logger.info("Loading custom trained model: best.pt")
                loaded_model = YOLO("best.pt")
                loaded_model_file = "best.pt"
            elif not allow_generic_yolo_fallback():
                raise FileNotFoundError(
                    "best.pt is required in production. Configure SUPABASE_URL and "
                    "SUPABASE_SERVICE_KEY so the model can be downloaded."
                )
            else:
                logger.warning("⚠️ best.pt không có → fallback sang yolov8s.pt (model chung, KHÔNG phải food model)")
                loaded_model = YOLO("yolov8s.pt")
                loaded_model_file = "yolov8s.pt"

            # Đẩy model lên device tối ưu
            if DEVICE != "cpu":
                loaded_model.to(DEVICE)
                logger.info(f"✅ Model moved to {DEVICE}")

            model = loaded_model
            model_file = loaded_model_file
            logger.info(f"Model loaded successfully: {model_file} on {DEVICE}")
            return model
        except Exception as e:
            model_load_error = str(e)
            logger.error(f"Failed to load model: {e}", exc_info=True)
            return None

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
    loaded_model = model
    model_classes = list(loaded_model.names.values()) if loaded_model else []
    gemini_status = _get_gemini_health_status()
    current_model_file = model_file or "not-loaded"
    current_model_error = pending_model_readiness_error(
        best_model_exists=os.path.exists("best.pt"),
        model_loaded=loaded_model is not None,
        model_load_error=model_load_error,
    )
    
    return {
        "status": "ok",
        "model_loaded": loaded_model is not None,
        "model_file": current_model_file,
        "model_load_error": current_model_error,
        "model_classes_count": len(model_classes),
        "model_type": "not-loaded" if not model_file else (
            "yolov8-custom-eatfitai" if "best.pt" in model_file else "yolov8-pretrained"
        ),
        "generic_yolo_fallback_allowed": allow_generic_yolo_fallback(),
        "yolo_confidence_threshold": YOLO_CONFIDENCE_THRESHOLD,
        "yolo_image_size": YOLO_IMAGE_SIZE,
        "cuda_available": torch.cuda.is_available(),
        "device": str(loaded_model.device) if loaded_model else DEVICE,
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
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
        f: FileStorage | None = request.files.get("file")
        if not f:
            return {"error": "no file provided"}, 400
        
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
        logger.info(f"Processing image: {name} ({size / 1024:.1f}KB)")
        
        loaded_model = _load_yolo_model()
        if loaded_model is None:
            return {
                "error": "model unavailable",
                "detail": model_load_error or "YOLO model could not be loaded",
            }, 503
        
        with YOLO_INFERENCE_LOCK:
            res: Any = loaded_model(path, conf=YOLO_CONFIDENCE_THRESHOLD, imgsz=YOLO_IMAGE_SIZE)
            out = _detections_from_yolo_result(res)

            if not out and YOLO_RECOVERY_ENABLED:
                recovery_res: Any = loaded_model(
                    path,
                    conf=YOLO_RECOVERY_CONFIDENCE_THRESHOLD,
                    imgsz=YOLO_RECOVERY_IMAGE_SIZE,
                    augment=YOLO_RECOVERY_AUGMENT,
                )
                out = _filter_recovery_detections(_detections_from_yolo_result(recovery_res))
                if out:
                    logger.info(f"YOLO recovery pass detected {len(out)} objects in {name}")
        
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


# ============== STT - Disabled trên cloud ==============
# Whisper STT quá nặng (~1.5GB) cho Render free/starter tier
# Nếu cần STT, nên dùng Google Cloud Speech-to-Text API
ENABLE_STT = False
WHISPER_AVAILABLE = False
logger.info("ℹ️  Whisper STT disabled (cloud mode - dùng Google Speech API nếu cần)")

@app.route('/voice/transcribe', methods=['POST'])
@require_internal_token
def transcribe_audio():
    """STT disabled trên production cloud"""
    return {
        "error": "Speech-to-Text không khả dụng trên cloud. Dùng Google Cloud Speech-to-Text API.",
        "success": False
    }, 503


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
