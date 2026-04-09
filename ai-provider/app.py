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
from dotenv import load_dotenv

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
load_dotenv()

def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}

app: Flask = Flask(__name__)
os.makedirs("uploads", exist_ok=True)

# Hằng số validate file
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'bmp'}
ALLOWED_AUDIO_EXTENSIONS = {'m4a', 'mp3', 'wav', 'webm', 'ogg', 'flac'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename: str) -> bool:
    """Kiểm tra extension file hình"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ============== AUTO-DOWNLOAD MODEL TỪ SUPABASE STORAGE ==============

def _download_model_from_supabase(filename: str = "best.pt") -> bool:
    """
    Download model weights từ Supabase Storage private bucket.
    Chỉ chạy trên cloud khi file chưa tồn tại local.
    Dùng service_role key để truy cập bucket private 'ml-models'.
    """
    import requests as _req

    supabase_url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "")

    if not supabase_url or not service_key:
        logger.warning("⚠️ SUPABASE_URL hoặc SUPABASE_SERVICE_KEY chưa set → bỏ qua download model")
        return False

    download_url = f"{supabase_url}/storage/v1/object/ml-models/{filename}"
    logger.info(f"⬇️  Downloading {filename} từ Supabase Storage...")

    try:
        resp = _req.get(
            download_url,
            headers={"Authorization": f"Bearer {service_key}"},
            stream=True,
            timeout=120,  # 2 phút timeout cho file ~22MB
        )
        resp.raise_for_status()

        # Ghi file theo chunks để tiết kiệm RAM
        total = int(resp.headers.get("content-length", 0))
        downloaded = 0
        with open(filename, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 256):  # 256KB chunks
                f.write(chunk)
                downloaded += len(chunk)

        size_mb = downloaded / (1024 * 1024)
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

# Nếu best.pt chưa có (trên cloud) → tự động download từ Supabase Storage
if not os.path.exists("best.pt"):
    logger.info("📦 best.pt không tìm thấy → thử download từ Supabase Storage...")
    _download_model_from_supabase("best.pt")

try:
    if os.path.exists("best.pt"):
        logger.info("Loading custom trained model: best.pt")
        model = YOLO("best.pt")
        model_file = "best.pt"
    else:
        logger.warning("⚠️ best.pt không có → fallback sang yolov8s.pt (model chung, KHÔNG phải food model)")
        model = YOLO("yolov8s.pt")
        model_file = "yolov8s.pt"
    
    # Đẩy model lên device tối ưu
    if model and DEVICE != "cpu":
        model.to(DEVICE)
        logger.info(f"✅ Model moved to {DEVICE}")
    
    logger.info(f"Model loaded successfully: {model_file} on {DEVICE}")
except Exception as e:
    logger.error(f"Failed to load model: {e}", exc_info=True)
    raise

# ============== ROUTES ==============

@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "service": "ai-provider", 
        "version": "2.0.0-cloud",
        "endpoints": ["/healthz", "/detect", "/nutrition-advice", "/meal-insight", "/cooking-instructions"]
    }

@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    """Health check với model và GPU status"""
    model_classes = list(model.names.values()) if model else []
    gemini_status = _get_gemini_health_status()
    
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_file": model_file,
        "model_classes_count": len(model_classes),
        "model_type": "yolov8-custom-eatfitai" if "best.pt" in model_file else "yolov8-pretrained",
        "cuda_available": torch.cuda.is_available(),
        "device": str(model.device) if model else "unknown",
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "llm_provider": "gemini",
        **gemini_status,
    }


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

@app.post("/detect")
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
        
        if model is None:
            return {"error": "model not loaded"}, 500
        
        res: Any = model(path, conf=0.50)
        names: Dict[int, str] = res[0].names
        
        out: List[Dict[str, float | str]] = [
            {"label": names[int(b.cls)], "confidence": float(b.conf)}
            for b in res[0].boxes
        ]
        
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
def transcribe_audio():
    """STT disabled trên production cloud"""
    return {
        "error": "Speech-to-Text không khả dụng trên cloud. Dùng Google Cloud Speech-to-Text API.",
        "success": False
    }, 503


if __name__ == "__main__":
    logger.info(f"Starting AI Provider on port 5050")
    logger.info(f"Model: {model_file}")
    logger.info(f"Device: {DEVICE}")
    logger.info(f"Nutrition LLM: {'Available (Gemini)' if NUTRITION_LLM_AVAILABLE else 'Not available'}")
    logger.info(f"Voice Parsing: {'Available' if VOICE_PARSE_AVAILABLE else 'Not available'}")
    logger.info(f"Cooking Instructions: {'Available' if COOKING_INSTRUCTIONS_AVAILABLE else 'Not available'}")
    logger.info(f"Allowed file types: {ALLOWED_EXTENSIONS}")
    logger.info(f"Max file size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB")
    app.run(host="0.0.0.0", port=5050)
