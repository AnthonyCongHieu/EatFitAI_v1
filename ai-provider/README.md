# AI Provider (Flask + YOLOv8n)

Endpoints
- GET `/healthz` → health check
- POST `/detect` (form-data key `file`) → JSON `{ detections: [{ label, confidence }] }`

Setup
- Python 3.10+
- Create venv and install deps:
  - `python -m venv venv`
  - `./venv/Scripts/activate` (Windows)
  - `pip install -r requirements.txt`

Run
- `python app.py`
- Test: `curl -F "file=@C:/path/to/test.jpg" http://127.0.0.1:5050/detect`

Notes
- First run downloads `yolov8n.pt` automatically (or place it in this folder).
- Uploads saved under `uploads/` for inspection.
