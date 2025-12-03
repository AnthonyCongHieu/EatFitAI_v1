# 🤖 EatFitAI - AI Provider Service

YOLO-based food detection service for EatFitAI application.

## 📦 Model Information

- **Model**: YOLOv8 Custom (`best.pt`)
- **Training**: 100 epochs
- **Performance**: mAP@0.5 = 84.7%, Precision = 79.4%, Recall = 81.7%
- **Size**: 22.5MB
- **Confidence Threshold**: 0.50 (optimized)

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- CUDA 11.8+ (optional, for GPU acceleration)

### Installation

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate (Windows)
venv\Scripts\activate
# Or Linux/Mac
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download model (if not present)
# See SETUP_GUIDE.md for download instructions
# File best.pt must be placed in this directory
```

### Running

```bash
python app.py
```

Service will start on `http://0.0.0.0:5050`

## 📡 API Endpoints

### Health Check

```bash
GET /healthz
```

Response:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_file": "best.pt",
  "model_type": "yolov8-custom-eatfitai",
  "model_classes_count": 45,
  "cuda_available": false,
  "device": "cpu"
}
```

### Object Detection

```bash
POST /detect
Content-Type: multipart/form-data

file: <image_file>
```

Response:
```json
{
  "detections": [
    {
      "label": "chicken",
      "confidence": 0.87
    },
    {
      "label": "rice",
      "confidence": 0.92
    }
  ]
}
```

## 📋 Model File Location

⚠️ **IMPORTANT**: The model file `best.pt` is **NOT** included in Git (see `.gitignore` line 18-20).

To get the model:
1. Download from shared Google Drive/OneDrive link
2. Place in `ai-provider/` folder
3. Verify file size: ~22.5MB

See [`SETUP_GUIDE.md`](../SETUP_GUIDE.md) for detailed instructions.

## 🔧 Configuration

### Confidence Threshold

Default: `0.50` (line 124 in `app.py`)

To adjust:
```python
res: Any = model(path, conf=0.50)  # Change this value
```

### Port

Default: `5050` (line 157 in `app.py`)

To change:
```python
app.run(host="0.0.0.0", port=5050)  # Change port here
```

## 🐛 Troubleshooting

### Issue: "Model file not found"

**Solution**: Download `best.pt` from team's shared storage (see SETUP_GUIDE.md)

### Issue: "CUDA not available"

**Solution**: 
- Model will run on CPU (slower but functional)
- To enable GPU: Install CUDA Toolkit 11.8+

### Issue: Port 5050 already in use

**Solution**: Change port in `app.py` line 157 and update backend config

## 📚 Documentation

- [Full Setup Guide](../SETUP_GUIDE.md)
- [Training Evaluation](../yolo-training-evaluation.md)
- [Integration Plan](../yolo-integration-plan.md)

## 🔗 Integration

This service is called by the backend API (`eatfitai-backend/Controllers/AIController.cs`).

Flow:
```
Mobile App → Backend API → AI Provider → YOLO Model → Response
```

## 📝 Notes

- File uploads are temporarily saved in `uploads/` folder and deleted after processing
- Maximum file size: 10MB
- Supported formats: jpg, jpeg, png, webp, bmp
- Model detects 45+ food ingredient classes

## 👨‍💻 Development

To retrain the model, see `TRAINING_GUIDE.md` and training scripts:
- `train_local.py` - Train on local machine
- `resume_stable.py` - Resume training from checkpoint
- `export_model.py` - Export model to different formats

---

**Last Updated**: 2025-12-03  
**Model Version**: v1.0 (100 epochs)
