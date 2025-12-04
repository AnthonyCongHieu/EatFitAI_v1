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

### Nutrition Advice (Gemini AI)

```bash
POST /nutrition-advice
Content-Type: application/json

{
  "gender": "male",
  "age": 25,
  "height": 175,
  "weight": 70,
  "activity": "moderate",
  "goal": "maintain"
}
```

Response:
```json
{
  "calories": 2500,
  "protein": 126,
  "carbs": 312,
  "fat": 83,
  "explanation": "Dựa trên TDEE 2500 kcal cho người nam 25 tuổi, vận động vừa phải",
  "source": "gemini"
}
```

### Meal Insight (Gemini AI)

```bash
POST /meal-insight
Content-Type: application/json

{
  "items": [{"name": "Cơm gà", "calories": 450}],
  "totalCalories": 1200,
  "targetCalories": 2000,
  "currentMacros": {"protein": 45, "carbs": 120, "fat": 30},
  "targetMacros": {"protein": 100, "carbs": 250, "fat": 65}
}
```

Response:
```json
{
  "insight": "Bữa ăn thiếu protein, nên bổ sung thêm thịt hoặc trứng",
  "score": 7,
  "suggestions": ["Thêm 2 quả trứng", "Ăn thêm rau xanh"],
  "source": "gemini"
}
```

## 🔑 Gemini API Setup

To enable AI-powered nutrition advice:

1. Get API Key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Create `.env` file in `ai-provider/` folder:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
3. Install new dependencies:
   ```bash
   pip install google-generativeai python-dotenv
   ```
4. Restart the service

**Note**: Without Gemini API key, the service will use Mifflin-St Jeor formula as fallback.

## 🏠 Ollama Local AI Setup (Recommended)

For self-hosted AI without external API dependencies:

### 1. Install Ollama

```powershell
# Windows
winget install Ollama.Ollama

# Or download from: https://ollama.com/download/windows
```

### 2. Download Model

```powershell
# Recommended for RTX 3050 6GB:
ollama pull llama3.2:3b

# Or for better quality (needs 8GB+ VRAM):
ollama pull mistral:7b-instruct-q4_0
```

### 3. Start Ollama

```powershell
ollama serve
# Runs on http://localhost:11434
```

### 4. Configure (Optional)

Create `.env` file:
```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### 5. Test

```powershell
curl -X POST http://localhost:5050/nutrition-advice ^
  -H "Content-Type: application/json" ^
  -d "{\"gender\":\"male\",\"age\":25,\"height\":175,\"weight\":70,\"activity\":\"moderate\",\"goal\":\"maintain\"}"
```

**Priority Order:**
1. Ollama local (if available)
2. Gemini API (if configured)
3. Mifflin-St Jeor formula (fallback)

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
