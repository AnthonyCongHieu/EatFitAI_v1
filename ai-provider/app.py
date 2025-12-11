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
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Load model: Prioritize custom trained model 'best.pt' if it exists
model: YOLO | None = None
model_file: str = ""

try:
    if os.path.exists("best.pt"):
        logger.info("Loading custom trained model: best.pt")
        model = YOLO("best.pt")
        model_file = "best.pt"
    else:
        logger.info("Loading default model: yolov8s.pt")
        model = YOLO("yolov8s.pt")  # Changed from yolov8x to yolov8s (lighter, faster)
        model_file = "yolov8s.pt"
    logger.info(f"Model loaded successfully: {model_file}")
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
        
        res: Any = model(path, conf=0.25)  # Lowered to 0.25 for debugging (was 0.50)
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
    from nutrition_llm import get_nutrition_advice_gemini, get_meal_insight_gemini
    NUTRITION_LLM_AVAILABLE = True
    logger.info("Nutrition LLM service loaded")
except ImportError as e:
    NUTRITION_LLM_AVAILABLE = False
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
        
        result = get_nutrition_advice_gemini(
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
        
        result = get_meal_insight_gemini(
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


if __name__ == "__main__":
    logger.info(f"Starting AI Provider on port 5050")
    logger.info(f"Model: {model_file}")
    logger.info(f"Nutrition LLM: {'Available' if NUTRITION_LLM_AVAILABLE else 'Not available'}")
    logger.info(f"Cooking Instructions: {'Available' if COOKING_INSTRUCTIONS_AVAILABLE else 'Not available'}")
    logger.info(f"Allowed file types: {ALLOWED_EXTENSIONS}")
    logger.info(f"Max file size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB")
    app.run(host="0.0.0.0", port=5050)

