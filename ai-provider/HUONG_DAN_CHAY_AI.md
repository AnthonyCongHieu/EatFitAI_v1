# 🤖 HƯỚNG DẪN CHẠY AI PROVIDER - EATFITAI

## Tổng quan

AI Provider cung cấp 2 chức năng chính:
1. **YOLO Detection**: Nhận diện thực phẩm từ ảnh
2. **Nutrition Advice** (Ollama): Tư vấn dinh dưỡng bằng AI local

---

## 📦 Yêu cầu

- **Python**: 3.8+
- **Ollama**: 0.13.1+ (cho AI nutrition advice)
- **Model YOLO**: `best.pt` (22.5MB) - đã có trong folder
- **Model LLM**: `llama3.2:3b` (2GB)

---

## 🚀 Khởi động nhanh

### Bước 1: Khởi động Ollama (Terminal riêng)

```powershell
# Ollama chạy daemon ở background
ollama serve
```

> Ollama sẽ chạy trên http://localhost:11434

### Bước 2: Khởi động AI Provider

```powershell
cd f:\EatFitAI_v1\ai-provider
.\venv\Scripts\activate
python app.py
```

> AI Provider sẽ chạy trên http://localhost:5050

---

## 🔍 Test các endpoints

### 1. Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:5050/healthz"
```

**Kết quả mong đợi:**
```json
{
    "status": "ok",
    "model_loaded": true,
    "model_file": "best.pt",
    "cuda_available": false
}
```

### 2. Nutrition Advice (AI)

```powershell
$body = '{"gender":"male","age":25,"height":175,"weight":70,"activity":"moderate","goal":"maintain"}'
Invoke-RestMethod -Method POST -Uri "http://localhost:5050/nutrition-advice" -ContentType "application/json" -Body $body
```

**Kết quả mong đợi:**
```json
{
    "calories": 2500,
    "protein": 112.5,
    "carbs": 325,
    "fat": 71.25,
    "source": "ollama",
    "explanation": "..."
}
```

### 3. Meal Insight (AI)

```powershell
$body = '{"items":[{"name":"Cơm gà","calories":450}],"totalCalories":1200,"targetCalories":2000,"currentMacros":{"protein":45,"carbs":120,"fat":30},"targetMacros":{"protein":100,"carbs":250,"fat":65}}'
Invoke-RestMethod -Method POST -Uri "http://localhost:5050/meal-insight" -ContentType "application/json" -Body $body
```

### 4. Food Detection (YOLO)

```powershell
# Cần file ảnh
curl -X POST http://localhost:5050/detect -F "file=@test_image.jpg"
```

---

## ⚙️ Cấu hình (Optional)

Tạo file `.env` trong `ai-provider/`:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

**Lưu ý**: Không cần file `.env` vì code đã có default config.

---

## 🔧 Troubleshooting

### Lỗi: "Ollama not available"

1. Kiểm tra Ollama đang chạy:
   ```powershell
   ollama list
   ```

2. Khởi động lại Ollama:
   ```powershell
   ollama serve
   ```

### Lỗi: Model chưa tải

```powershell
ollama pull llama3.2:3b
```

### Lỗi: Port 5050 đã bị chiếm

Sửa port trong `app.py` dòng 157.

---

## 🎯 Priority Order của AI

1. **Ollama local** (nếu chạy) ✅ Recommended
2. **Gemini API** (nếu có GEMINI_API_KEY)
3. **Mifflin-St Jeor formula** (fallback)

---

**Đã test ngày**: 2025-12-04  
**Ollama version**: 0.13.1  
**Model**: llama3.2:3b (2GB)
