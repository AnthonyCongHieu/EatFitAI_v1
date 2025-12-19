from __future__ import annotations

from typing import Any, Dict, List
import logging
import subprocess
import time
import requests

from flask import Flask, Request, Response, jsonify, request
from ultralytics import YOLO
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from uuid import uuid4
import os
import stt_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== AUTO-START OLLAMA ==============
def start_ollama_if_needed():
    """
    Tự động khởi động Ollama nếu chưa chạy.
    Ollama cần thiết cho AI nutrition suggestions.
    """
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
    
    # Kiểm tra Ollama đang chạy chưa
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        if response.status_code == 200:
            logger.info("✅ Ollama đã chạy sẵn")
            return True
    except:
        pass
    
    logger.info("🚀 Đang khởi động Ollama...")
    
    try:
        # Start Ollama serve ở background
        if os.name == 'nt':  # Windows
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
        else:  # Linux/Mac
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )
        
        # Đợi Ollama khởi động (tối đa 10 giây)
        for i in range(10):
            time.sleep(1)
            try:
                response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
                if response.status_code == 200:
                    logger.info("✅ Ollama đã khởi động thành công!")
                    return True
            except:
                logger.info(f"   Đợi Ollama... ({i+1}/10)")
        
        logger.warning("⚠️ Ollama không khởi động được. Kiểm tra xem Ollama đã được cài đặt chưa.")
        return False
        
    except FileNotFoundError:
        logger.error("❌ Không tìm thấy Ollama. Hãy cài đặt từ: https://ollama.com/download")
        return False
    except Exception as e:
        logger.error(f"❌ Lỗi khi khởi động Ollama: {e}")
        return False

# Khởi động Ollama khi app start
start_ollama_if_needed()

app: Flask = Flask(__name__)
os.makedirs("uploads", exist_ok=True)

# File validation constants
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'bmp'}
ALLOWED_AUDIO_EXTENSIONS = {'m4a', 'mp3', 'wav', 'webm', 'ogg', 'flac'}  # Audio cho STT
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Load model: Prioritize custom trained model 'best.pt' if it exists
model: YOLO | None = None
model_file: str = ""

# ============== GPU CONFIGURATION ==============
import torch

def get_optimal_device():
    """
    Chọn device tối ưu: GPU (CUDA) nếu có, fallback về CPU
    Ưu tiên GPU để tăng tốc YOLO inference 5-10x
    """
    if torch.cuda.is_available():
        device = "cuda:0"
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"✅ GPU detected: {gpu_name} ({vram:.1f}GB VRAM)")
        logger.info(f"🚀 Using CUDA for acceleration")
        return device
    else:
        logger.warning("⚠️ CUDA not available, using CPU (slower inference)")
        return "cpu"

DEVICE = get_optimal_device()

try:
    if os.path.exists("best.pt"):
        logger.info("Loading custom trained model: best.pt")
        model = YOLO("best.pt")
        model_file = "best.pt"
    else:
        logger.info("Loading default model: yolov8s.pt")
        model = YOLO("yolov8s.pt")
        model_file = "yolov8s.pt"
    
    # Force model to optimal device (GPU if available)
    if model and DEVICE != "cpu":
        model.to(DEVICE)
        logger.info(f"✅ Model moved to {DEVICE}")
    
    logger.info(f"Model loaded successfully: {model_file} on {DEVICE}")
except Exception as e:
    logger.error(f"Failed to load model: {e}", exc_info=True)
    raise

@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "service": "ai-provider", 
        "version": "1.0.0",
        "endpoints": ["/healthz", "/detect"]
    }

@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    """Enhanced health check with model and GPU status"""
    import torch
    
    model_classes = list(model.names.values()) if model else []
    
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_file": model_file,
        "model_classes_count": len(model_classes),
        "model_type": "yolov8-custom-eatfitai" if "best.pt" in model_file else "yolov8-pretrained",
        "cuda_available": torch.cuda.is_available(),
        "device": str(model.device) if model else "unknown",
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    }

@app.post("/detect")
def detect() -> Response | tuple[Dict[str, str], int]:
    """Detect objects in uploaded image with enhanced error handling"""
    path: str = ""
    
    try:
        # Validate file exists
        f: FileStorage | None = request.files.get("file")
        if not f:
            return {"error": "no file provided"}, 400
        
        # Validate filename
        if not f.filename:
            logger.warning("File uploaded without filename")
            filename = f"upload_{uuid4().hex}.jpg"
        else:
            # Force unique filename to prevent overwriting during debug
            import time
            timestamp = int(time.time())
            filename = f"{timestamp}_{f.filename}"
        
        # Validate file extension
        if not allowed_file(filename):
            return {
                "error": "invalid file type", 
                "detail": f"Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            }, 400
        
        # Validate file size
        f.seek(0, 2)  # Seek to end
        size = f.tell()
        f.seek(0)  # Seek back to start
        
        if size > MAX_FILE_SIZE:
            return {
                "error": "file too large", 
                "detail": f"Max size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB"
            }, 400
        
        if size == 0:
            return {"error": "empty file"}, 400
        
        # Save file
        name: str = secure_filename(filename)
        if not name:
            name = f"upload_{uuid4().hex}.jpg"
        
        path = os.path.join("uploads", name)
        f.save(path)
        logger.info(f"Processing image: {name} ({size / 1024:.1f}KB)")
        
        # Run detection
        if model is None:
            return {"error": "model not loaded"}, 500
        
        res: Any = model(path, conf=0.50)  # Production threshold (was 0.25 for debugging)
        names: Dict[int, str] = res[0].names  # type: ignore[assignment]
        
        out: List[Dict[str, float | str]] = [
            {"label": names[int(b.cls)], "confidence": float(b.conf)}
            for b in res[0].boxes
        ]
        
        logger.info(f"Detected {len(out)} objects in {name}")
        return jsonify({"detections": out})
    
    except ImportError as e:
        logger.error(f"Import error: {e}", exc_info=True)
        return {"error": "dependency error", "detail": str(e)}, 500
    
    except Exception as e:
        logger.error(f"Detection failed: {e}", exc_info=True)
        return {"error": "detection failed", "detail": str(e)}, 500
    
    finally:
        # Cleanup uploaded file
        if path and os.path.exists(path):
            try:
                # os.remove(path)
                logger.debug(f"Cleaned up file: {path} (SKIPPED FOR DEBUG)")
            except Exception as e:
                logger.warning(f"Failed to cleanup {path}: {e}")

# Import nutrition LLM service
try:
    from nutrition_llm import (
        get_nutrition_advice,
        get_meal_insight,
        parse_voice_command_ollama
    )
    NUTRITION_LLM_AVAILABLE = True
    VOICE_PARSE_AVAILABLE = True
    logger.info("Nutrition LLM service loaded (Ollama)")
except ImportError as e:
    NUTRITION_LLM_AVAILABLE = False
    VOICE_PARSE_AVAILABLE = False
    logger.warning(f"Nutrition LLM service not available: {e}")


@app.post("/nutrition-advice")
def nutrition_advice():
    """Get AI-powered nutrition target recommendations"""
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
    
    except Exception as e:
        logger.error(f"Nutrition advice error: {e}", exc_info=True)
        return {"error": str(e)}, 500


@app.post("/meal-insight")
def meal_insight():
    """Get AI insights about a meal or daily intake"""
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
    
    except Exception as e:
        logger.error(f"Meal insight error: {e}", exc_info=True)
        return {"error": str(e)}, 500


# Import cooking instructions generator
try:
    from nutrition_llm import get_cooking_instructions
    COOKING_INSTRUCTIONS_AVAILABLE = True
    logger.info("Cooking instructions generator loaded")
except ImportError as e:
    COOKING_INSTRUCTIONS_AVAILABLE = False
    logger.warning(f"Cooking instructions generator not available: {e}")


@app.route("/cooking-instructions", methods=["POST"])
def cooking_instructions():
    """Generate cooking instructions using Ollama AI"""
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
    
    except Exception as e:
        logger.error(f"Cooking instructions error: {e}", exc_info=True)
        return {"error": str(e)}, 500


# ============== VOICE COMMAND PARSING ==============

@app.post("/voice/parse")
def voice_parse():
    """
    Parse Vietnamese voice command using Ollama AI.
    
    Expected JSON body:
    {
        "text": "thêm 1 bát phở 300g bữa trưa"
    }
    
    Returns:
    {
        "intent": "ADD_FOOD",
        "entities": {
            "foodName": "phở",
            "quantity": 1,
            "unit": "bát",
            "weight": 300,
            "mealType": "lunch"
        },
        "confidence": 0.95,
        "rawText": "thêm 1 bát phở 300g bữa trưa",
        "source": "ollama"
    }
    """
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
        result = parse_voice_command_ollama(text)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Voice parsing error: {e}", exc_info=True)
        return {"error": str(e)}, 500


# ============== WHISPER STT (Speech-to-Text) ==============
# Initialize PhoWhisper from stt_service
stt_service.init_stt()
WHISPER_AVAILABLE = True # PhoWhisper acts as the new Whisper service

def allowed_audio_file(filename: str) -> bool:
    """Check if audio file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS

@app.route('/voice/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe audio file to Vietnamese text using Whisper.
    
    Expected: multipart/form-data with 'audio' file
    Supported formats: m4a, mp3, wav, webm, ogg, flac
    
    Returns:
    {
        "text": "thêm 1 bát phở 300g bữa trưa",
        "language": "vi",
        "duration": 2.5,
        "success": true
    }
    """
    if not WHISPER_AVAILABLE:
        return {"error": "Whisper STT not available", "success": False}, 503
    
    if 'audio' not in request.files:
        return {"error": "No audio file provided", "success": False}, 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return {"error": "Empty filename", "success": False}, 400
    
    if not allowed_audio_file(audio_file.filename):
        return {
            "error": f"File type not allowed. Use: {ALLOWED_AUDIO_EXTENSIONS}",
            "success": False
        }, 400
    
    try:
        import tempfile
        import time
        
        # Save to temp file
        ext = audio_file.filename.rsplit('.', 1)[1].lower()
        temp_path = os.path.join(tempfile.gettempdir(), f"whisper_{uuid4()}.{ext}")
        audio_file.save(temp_path)
        
        logger.info(f"Transcribing audio: {temp_path}")
        start_time = time.time()
        
        # Transcribe with PhoWhisper (trả về string)
        text = stt_service.transcribe_audio(temp_path)
        
        if not text:
            return jsonify({"error": "Transcription failed", "success": False}), 500
        
        duration = time.time() - start_time
        # text đã là string từ stt_service.transcribe_audio()
        text = text.strip()
        
        # Cleanup temp file
        try:
            os.remove(temp_path)
        except:
            pass
        
        logger.info(f"Transcribed ({duration:.2f}s): {text[:50]}...")
        
        return jsonify({
            "text": text,
            "language": "vi",  # PhoWhisper luôn dùng tiếng Việt
            "duration": round(duration, 2),
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        return {"error": str(e), "success": False}, 500


if __name__ == "__main__":
    logger.info(f"Starting AI Provider on port 5050")
    logger.info(f"Model: {model_file}")
    logger.info(f"Nutrition LLM: {'Available' if NUTRITION_LLM_AVAILABLE else 'Not available'}")
    logger.info(f"Voice Parsing: {'Available' if VOICE_PARSE_AVAILABLE else 'Not available'}")
    logger.info(f"Whisper STT: {'Available' if WHISPER_AVAILABLE else 'Not available'}")
    logger.info(f"Cooking Instructions: {'Available' if COOKING_INSTRUCTIONS_AVAILABLE else 'Not available'}")
    logger.info(f"Allowed file types: {ALLOWED_EXTENSIONS}")
    logger.info(f"Max file size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB")
    app.run(host="0.0.0.0", port=5050)
