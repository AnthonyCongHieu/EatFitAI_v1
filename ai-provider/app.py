from __future__ import annotations

from typing import Any, Dict, List

from flask import Flask, Request, Response, jsonify, request
from ultralytics import YOLO
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from uuid import uuid4
import os

app: Flask = Flask(__name__)
os.makedirs("uploads", exist_ok=True)
model: YOLO = YOLO("yolov8n.pt")  # Load YOLOv8n weights

@app.get("/")
def root() -> Dict[str, Any]:
    return {"service": "ai-provider", "endpoints": ["/healthz", "/detect"]}

@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}

@app.post("/detect")
def detect() -> Response | tuple[Dict[str, str], int]:
    # The global `request` is a LocalProxy[Request]; annotate locals for clarity
    f: FileStorage | None = request.files.get("file")
    if not f:
        return {"error": "no file"}, 400
    # Ensure filename is a non-empty string and safe for filesystem usage
    name: str = secure_filename(f.filename or "")
    if not name:
        name = f"upload_{uuid4().hex}"
    path: str = os.path.join("uploads", name)
    f.save(path)

    res: Any = model(path)
    names: Dict[int, str] = res[0].names  # type: ignore[assignment]
    out: List[Dict[str, float | str]] = [
        {"label": names[int(b.cls)], "confidence": float(b.conf)}
        for b in res[0].boxes
    ]
    return jsonify({"detections": out})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050)
