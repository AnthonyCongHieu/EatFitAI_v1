from __future__ import annotations

from typing import Any, Dict, List
import logging

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
            filename = f.filename
        
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
        
        res: Any = model(path, conf=0.50)  # Optimized threshold based on training evaluation (mAP@0.5: 84.7%)
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
                os.remove(path)
                logger.debug(f"Cleaned up file: {path}")
            except Exception as e:
                logger.warning(f"Failed to cleanup {path}: {e}")

if __name__ == "__main__":
    logger.info(f"Starting AI Provider on port 5050")
    logger.info(f"Model: {model_file}")
    logger.info(f"Allowed file types: {ALLOWED_EXTENSIONS}")
    logger.info(f"Max file size: {MAX_FILE_SIZE / 1024 / 1024:.1f}MB")
    app.run(host="0.0.0.0", port=5050)
