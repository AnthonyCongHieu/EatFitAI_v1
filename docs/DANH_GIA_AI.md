# 🤖 EatFitAI - Đánh Giá Chi Tiết Chức Năng AI

> **Ngày cập nhật**: 2025-12-13  
> **Phiên bản**: 1.0  
> **Mục đích**: Đánh giá toàn diện các module AI và hướng dẫn cải thiện

---

## 📊 Phần 1: Tổng Quan Hệ Thống AI

### 1.1 Kiến Trúc AI

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI PROVIDER (Flask)                        │
│                      Port: 5050                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   YOLOv8    │  │   Ollama    │  │       Whisper          │ │
│  │  (Vision)   │  │   (LLM)     │  │       (STT)            │ │
│  │             │  │             │  │                        │ │
│  │ best.pt     │  │ llama3.2:3b │  │ base model (tiếng Việt)│ │
│  │ 22.5MB      │  │ Local       │  │ Local                  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬─────────────┘ │
│         │                │                     │               │
│  /detect│    /nutrition-advice    /voice/transcribe            │
│         │    /meal-insight                                     │
│         │    /cooking-instructions                             │
│         │    /voice/parse                                      │
└─────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                     │
    ┌─────┴─────┐    ┌─────┴─────┐        ┌─────┴─────┐
    │ AIScan    │    │ NutriAdv  │        │  Voice    │
    │ Screen    │    │ Service   │        │  Input    │
    └───────────┘    └───────────┘        └───────────┘
```

### 1.2 Các Module AI

| Module | Công Nghệ | File | Chức Năng |
|--------|-----------|------|-----------|
| **AI Vision** | YOLOv8 | app.py | Nhận diện thực phẩm từ ảnh |
| **AI Nutrition** | Ollama LLM | nutrition_llm.py | Gợi ý calories, macros |
| **AI Recipe** | Ollama LLM | nutrition_llm.py | Gợi ý món ăn từ nguyên liệu |
| **AI Cooking** | Ollama LLM | nutrition_llm.py | Tạo hướng dẫn nấu ăn |
| **AI Voice** | Whisper + Ollama | app.py | STT + Intent parsing |

---

## 🔍 Phần 2: Đánh Giá Chi Tiết Từng Module

### 2.1 AI Vision (YOLOv8) - Score: 8.0/10 ⭐⭐⭐⭐

#### Tổng Quan

| Thuộc Tính | Giá Trị |
|------------|---------|
| Model File | `best.pt` (22.5MB) |
| Base Model | YOLOv8s |
| Device | CUDA (GPU) hoặc CPU |
| Confidence Threshold | 0.25 |
| Max File Size | 10MB |
| Formats | JPG, JPEG, PNG, WebP, BMP |

#### API Endpoint

```http
POST /detect
Content-Type: multipart/form-data

Request:
  file: <image_file>

Response:
{
  "objects": [
    {"label": "apple", "confidence": 0.92},
    {"label": "banana", "confidence": 0.87}
  ],
  "count": 2,
  "model_file": "best.pt",
  "device": "cuda"
}
```

#### Điểm Mạnh ✅

1. **Auto GPU detection** - Tự động sử dụng CUDA nếu có
2. **Custom model support** - Ưu tiên `best.pt` nếu tồn tại
3. **Input validation** - Kiểm tra file type và size
4. **Fallback model** - Dùng `yolov8s.pt` nếu không có custom model
5. **Logging tốt** - Debug dễ dàng

#### Điểm Yếu ❌

1. **Chưa train cho món Việt** - Accuracy thấp (~60%) với thực phẩm VN
2. **Confidence threshold cố định** - Không điều chỉnh được
3. **Không có batch processing** - Chỉ xử lý 1 ảnh/request
4. **Không cache results** - Xử lý lại ảnh giống nhau

#### Hướng Dẫn Cải Thiện

**Cải thiện 1: Train Model Cho Món Việt** (40 giờ)

```bash
# Bước 1: Thu thập dataset
# Nguồn: Foody, Cookpad VN, Google Images
# Target: 50 loại món Việt phổ biến, 100-200 ảnh/loại

# Bước 2: Label dataset
# Tool: Roboflow hoặc Label Studio
# Format: YOLO format (txt files)

# Bước 3: Training
cd ai-provider
python train_local.py --data datasets/vn_food/data.yaml --epochs 100

# Bước 4: Export và test
python export_model.py --weights runs/detect/train/weights/best.pt
```

**Dataset gợi ý 50 loại:**
```
Phở, Bún bò, Bún chả, Bún riêu, Mì Quảng
Cơm tấm, Cơm rang, Cơm chiên, Xôi
Bánh mì, Bánh cuốn, Bánh xèo, Bánh tráng
Gỏi cuốn, Nem rán, Chả giò
Thịt kho, Cá kho, Canh chua
Trứng chiên, Trứng ốp, Trứng luộc
Rau muống xào, Rau cải, Salad
Trái cây: Xoài, Cam, Chuối, Ổi, Dưa hấu...
Đồ uống: Cafe sữa, Trà đá, Nước mía...
```

**Cải thiện 2: Thêm Confidence Tuning** (4 giờ)

```python
# app.py - Thêm parameter confidence
@app.route("/detect", methods=["POST"])
def detect():
    confidence = float(request.form.get('confidence', 0.25))
    confidence = max(0.1, min(0.9, confidence))  # Clamp 0.1-0.9
    
    results = model(image_path, conf=confidence)
    ...
```

**Cải thiện 3: Thêm Batch Processing** (8 giờ)

```python
# app.py - Endpoint mới cho batch
@app.route("/detect-batch", methods=["POST"])
def detect_batch():
    files = request.files.getlist('files')  # Multiple files
    results = []
    for file in files[:10]:  # Max 10 files
        result = process_single_image(file)
        results.append(result)
    return jsonify({"results": results})
```

---

### 2.2 AI Nutrition (Ollama LLM) - Score: 7.5/10 ⭐⭐⭐⭐

#### Tổng Quan

| Thuộc Tính | Giá Trị |
|------------|---------|
| LLM | Ollama (llama3.2:3b) |
| URL | http://localhost:11434 |
| Fallback | Mifflin-St Jeor Formula |
| Timeout | 60s |

#### API Endpoints

```http
POST /nutrition-advice
{
  "gender": "male",
  "age": 25,
  "height_cm": 170,
  "weight_kg": 70,
  "activity_level": "moderate",
  "goal": "lose"
}

Response:
{
  "calories": 2100,
  "protein": 130,
  "carbs": 260,
  "fat": 60,
  "explanation": "Dựa trên chỉ số BMR..."
}
```

```http
POST /meal-insight
{
  "meal_items": ["phở bò", "trà đá"],
  "total_calories": 500,
  "target_calories": 2000,
  "current_macros": {"protein": 30, "carbs": 50, "fat": 10},
  "target_macros": {"protein": 130, "carbs": 260, "fat": 60}
}

Response:
{
  "score": 75,
  "insight": "Bữa ăn này tốt...",
  "suggestions": ["Thêm rau xanh", "Giảm đường"]
}
```

#### Điểm Mạnh ✅

1. **Chain-of-Thought prompting** - Kết quả chính xác hơn
2. **Fallback mechanism** - Ollama → Mifflin-St Jeor
3. **Vietnamese prompts** - Giải thích bằng tiếng Việt
4. **Auto-start Ollama** - Tự khởi động nếu chưa chạy

#### Điểm Yếu ❌

1. **Phụ thuộc Ollama local** - Cần chạy service riêng
2. **Response time chậm** - 3-10s per request
3. **Không có caching** - Tính lại mỗi lần
4. **Chưa có Gemini fallback** - Chỉ có formula fallback

#### Hướng Dẫn Cải Thiện

**Cải thiện 1: Thêm Gemini API Fallback** (6 giờ)

```python
# nutrition_llm.py
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def get_nutrition_advice_gemini_api(gender, age, height_cm, weight_kg, activity_level, goal):
    """Fallback to Gemini when Ollama fails"""
    if not GEMINI_API_KEY:
        return None
    
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""
    Tính toán nhu cầu dinh dưỡng cho:
    - Giới tính: {gender}
    - Tuổi: {age}
    - Chiều cao: {height_cm}cm
    - Cân nặng: {weight_kg}kg
    - Mức hoạt động: {activity_level}
    - Mục tiêu: {goal}
    
    Trả về JSON: {{"calories": int, "protein": int, "carbs": int, "fat": int}}
    """
    
    response = model.generate_content(prompt)
    return parse_json_response(response.text)

# Main function với 3-tier fallback
def get_nutrition_advice(gender, age, height_cm, weight_kg, activity_level, goal):
    # Try 1: Ollama
    result = get_nutrition_advice_ollama(...)
    if result:
        return result
    
    # Try 2: Gemini API
    result = get_nutrition_advice_gemini_api(...)
    if result:
        return result
    
    # Try 3: Formula fallback
    return calculate_nutrition_mifflin(...)
```

**Cải thiện 2: Thêm Response Caching** (4 giờ)

```python
# nutrition_llm.py
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def get_nutrition_advice_cached(gender, age, height_cm, weight_kg, activity_level, goal):
    return get_nutrition_advice(gender, age, height_cm, weight_kg, activity_level, goal)

# Hoặc dùng Redis cho multi-instance
import redis
redis_client = redis.Redis()

def get_nutrition_advice_redis(gender, age, height_cm, weight_kg, activity_level, goal):
    cache_key = f"nutrition:{gender}:{age}:{height_cm}:{weight_kg}:{activity_level}:{goal}"
    
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    result = get_nutrition_advice(...)
    redis_client.set(cache_key, json.dumps(result), ex=86400)  # 24h
    return result
```

---

### 2.3 AI Recipe Suggestions - Score: 8.5/10 ⭐⭐⭐⭐

#### Tổng Quan

| Thuộc Tính | Giá Trị |
|------------|---------|
| Data Source | Backend SQL Database |
| AI Enhancement | Ollama for cooking instructions |
| Matching | Ingredient-based search |

#### Luồng Hoạt Động

```
1. User scan nguyên liệu → AI Vision
2. Nguyên liệu → Backend RecipeSuggestionService
3. SQL query tìm recipes match ingredients
4. (Optional) Ollama generate cooking instructions
5. Return recipe + YouTube search link
```

#### Điểm Mạnh ✅

1. **11 loại nguyên liệu** - Cover nhiều trường hợp
2. **AI cooking instructions** - Flexible, personalized
3. **YouTube integration** - Video tutorials
4. **Fallback instructions** - Khi Ollama down

#### Điểm Yếu ❌

1. **Database-limited** - Chỉ có recipes trong DB
2. **Không có nutrition info** - Chưa tính calories cho recipe
3. **No difficulty/time** - Thiếu metadata

#### Hướng Dẫn Cải Thiện

**Cải thiện 1: Thêm Nutrition Info Cho Recipe** (8 giờ)

```csharp
// RecipeSuggestionService.cs
public async Task<RecipeWithNutrition> GetRecipeWithNutritionAsync(int recipeId)
{
    var recipe = await _context.Recipes
        .Include(r => r.RecipeIngredients)
        .ThenInclude(ri => ri.FoodItem)
        .FirstOrDefaultAsync(r => r.Id == recipeId);
    
    // Tính tổng nutrition từ ingredients
    var totalCalories = recipe.RecipeIngredients
        .Sum(ri => ri.Grams * ri.FoodItem.CaloriesPer100g / 100);
    
    var totalProtein = recipe.RecipeIngredients
        .Sum(ri => ri.Grams * ri.FoodItem.ProteinPer100g / 100);
    
    // ...tương tự cho carbs, fat
    
    return new RecipeWithNutrition
    {
        Recipe = recipe,
        TotalCalories = totalCalories,
        TotalProtein = totalProtein,
        // ...
    };
}
```

**Cải thiện 2: Thêm Difficulty & Time** (4 giờ)

```sql
-- Migration: Add columns to Recipe table
ALTER TABLE Recipes ADD COLUMN difficulty NVARCHAR(20) DEFAULT 'medium';
ALTER TABLE Recipes ADD COLUMN cook_time_minutes INT DEFAULT 30;
ALTER TABLE Recipes ADD COLUMN prep_time_minutes INT DEFAULT 15;
```

---

### 2.4 AI Cooking Instructions - Score: 7.0/10 ⭐⭐⭐⭐

#### Tổng Quan

| Thuộc Tính | Giá Trị |
|------------|---------|
| LLM | Ollama (llama3.2:3b) |
| Streaming | Có (real-time) |
| Fallback | Template-based instructions |

#### API Endpoint

```http
POST /cooking-instructions
{
  "recipe_name": "Phở bò",
  "ingredients": [
    {"foodName": "thịt bò", "grams": 200},
    {"foodName": "bánh phở", "grams": 300}
  ],
  "description": "Món phở truyền thống"
}

Response:
{
  "steps": [
    "Bước 1: Rửa sạch bánh phở, để ráo nước...",
    "Bước 2: Thái thịt bò thành lát mỏng...",
    "..."
  ],
  "source": "ollama"
}
```

#### Điểm Mạnh ✅

1. **Streaming response** - UX tốt hơn
2. **Vietnamese content** - Hướng dẫn tiếng Việt
3. **Fallback template** - Không bao giờ fail hoàn toàn

#### Điểm Yếu ❌

1. **Ollama dependency** - Cần running
2. **No image** - Chỉ có text instructions
3. **Not cached** - Generate mỗi lần

#### Hướng Dẫn Cải Thiện

**Cải thiện 1: Cache Popular Recipes** (4 giờ)

```python
# nutrition_llm.py
from functools import lru_cache

@lru_cache(maxsize=200)
def get_cooking_instructions_cached(recipe_name: str, ingredients_hash: str):
    # ingredients_hash = hash of sorted ingredient list
    return get_cooking_instructions(recipe_name, ingredients)
```

---

### 2.5 AI Voice (Whisper + Ollama) - Score: 7.0/10 ⭐⭐⭐⭐

#### Tổng Quan

| Thuộc Tính | Giá Trị |
|------------|---------|
| STT | Whisper (base model) |
| Intent Parser | Ollama (llama3.2:3b) |
| Language | Vietnamese |
| Audio Formats | M4A, MP3, WAV, WebM, OGG, FLAC |

#### API Endpoints

```http
# Step 1: Transcribe audio to text
POST /voice/transcribe
Content-Type: multipart/form-data
audio: <audio_file>

Response:
{
  "text": "thêm 1 bát phở 300g bữa trưa",
  "language": "vi",
  "duration": 2.5,
  "success": true
}

# Step 2: Parse intent from text
POST /voice/parse
{
  "text": "thêm 1 bát phở 300g bữa trưa"
}

Response:
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
```

#### Supported Intents

| Intent | Ví Dụ | Entities |
|--------|-------|----------|
| ADD_FOOD | "thêm 1 bát phở 300g bữa trưa" | foodName, quantity, weight, mealType |
| LOG_WEIGHT | "ghi cân nặng 65kg" | weight |
| ASK_CALORIES | "hôm nay ăn bao nhiêu calo" | date |
| ASK_NUTRITION | "thịt bò có bao nhiêu protein" | foodName |
| UNKNOWN | Không rõ ràng | - |

#### Điểm Mạnh ✅

1. **2-step pipeline** - STT + Intent parsing riêng biệt
2. **Vietnamese support** - Whisper nhận diện tiếng Việt
3. **Structured output** - JSON format chuẩn
4. **Multiple intents** - 5 loại intent

#### Điểm Yếu ❌

1. **Ollama dependency** - Cần running
2. **Accuracy varies** - Phụ thuộc giọng nói
3. **No offline mode** - Cần network
4. **No wake word** - Phải bấm nút

#### Hướng Dẫn Cải Thiện

**Cải thiện 1: Thêm Vosk Offline Fallback** (12 giờ)

```python
# app.py - Thêm Vosk fallback
from vosk import Model, KaldiRecognizer
import wave

VOSK_MODEL_PATH = "models/vosk-model-small-vn"
vosk_model = Model(VOSK_MODEL_PATH) if os.path.exists(VOSK_MODEL_PATH) else None

def transcribe_with_vosk(audio_path: str) -> str:
    """Offline fallback with Vosk"""
    if not vosk_model:
        return None
    
    wf = wave.open(audio_path, "rb")
    rec = KaldiRecognizer(vosk_model, wf.getframerate())
    
    result = ""
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            result += json.loads(rec.Result())["text"]
    
    result += json.loads(rec.FinalResult())["text"]
    return result

@app.route("/voice/transcribe", methods=["POST"])
def transcribe_audio():
    # Try Whisper first
    if WHISPER_AVAILABLE:
        try:
            return transcribe_with_whisper(audio_path)
        except Exception:
            pass
    
    # Fallback to Vosk
    if vosk_model:
        text = transcribe_with_vosk(audio_path)
        if text:
            return jsonify({"text": text, "source": "vosk"})
    
    return jsonify({"error": "No STT available"}), 500
```

**Cải thiện 2: Improve Intent Parsing Accuracy** (8 giờ)

```python
# nutrition_llm.py - Better prompt engineering
def parse_voice_command_ollama(text: str):
    prompt = f"""
    Bạn là AI parser cho voice commands về dinh dưỡng.
    
    Phân loại câu sau vào 1 trong 5 intents:
    - ADD_FOOD: Thêm món ăn vào nhật ký (keywords: thêm, ghi, ăn, uống)
    - LOG_WEIGHT: Ghi cân nặng (keywords: cân, nặng, kg)
    - ASK_CALORIES: Hỏi calories hôm nay (keywords: calo, calories, hôm nay)
    - ASK_NUTRITION: Hỏi thông tin dinh dưỡng (keywords: protein, fat, carbs)
    - UNKNOWN: Không thuộc các intent trên
    
    FEW-SHOT EXAMPLES:
    Input: "thêm 1 bát phở 300g bữa trưa"
    Output: {{"intent": "ADD_FOOD", "entities": {{"foodName": "phở", "quantity": 1, "unit": "bát", "weight": 300, "mealType": "lunch"}}, "confidence": 0.95}}
    
    Input: "ghi cân nặng 65 kg"
    Output: {{"intent": "LOG_WEIGHT", "entities": {{"weight": 65}}, "confidence": 0.9}}
    
    Input: "hôm nay ăn bao nhiêu calo rồi"
    Output: {{"intent": "ASK_CALORIES", "entities": {{"date": "today"}}, "confidence": 0.85}}
    
    Now parse this:
    Input: "{text}"
    Output (JSON only):
    """
    
    response = query_ollama(prompt)
    return parse_json_response(response)
```

---

## 📈 Phần 3: Roadmap Cải Thiện AI

### 3.1 Ngắn Hạn (1-2 Tuần)

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| Gemini API fallback | 6h | HIGH | P0 |
| Response caching | 4h | MEDIUM | P1 |
| Confidence tuning | 4h | LOW | P2 |

### 3.2 Trung Hạn (1-2 Tháng)

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| Train YOLOv8 cho món VN | 40h | CRITICAL | P0 |
| Vosk offline fallback | 12h | MEDIUM | P1 |
| Recipe nutrition info | 8h | MEDIUM | P1 |
| Batch image processing | 8h | LOW | P2 |

### 3.3 Dài Hạn (3-6 Tháng)

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| AI Auto Meal Plan 7 ngày | 32h | CRITICAL | P0 |
| ML Thói quen ăn uống | 48h | HIGH | P1 |
| LLM phân tích ảnh món | 40h | MEDIUM | P2 |

---

## 🔧 Phần 4: Monitoring & Debugging

### 4.1 Health Check Endpoints

```bash
# Check AI Provider status
curl http://localhost:5050/healthz

# Response:
{
  "status": "healthy",
  "model": "best.pt",
  "device": "cuda:0",
  "gpu_memory": "4.2GB / 8GB",
  "ollama": "available",
  "whisper": "available"
}
```

### 4.2 Logging

```python
# app.py - Đã có logging tốt
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Logs output:
# 2025-12-13 10:00:00 - app - INFO - Model loaded: best.pt on cuda
# 2025-12-13 10:00:05 - app - INFO - Detection: 3 objects found
# 2025-12-13 10:00:10 - nutrition_llm - INFO - Ollama response received
```

### 4.3 Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Vision latency | < 500ms | ~300ms (GPU) |
| Nutrition advice latency | < 5s | 3-8s |
| Voice transcribe latency | < 3s | 2-5s |
| Voice parse latency | < 3s | 2-4s |

---

## 📝 Kết Luận

### Điểm Mạnh Chung

1. **Architecture sạch** - Separation of concerns tốt
2. **Fallback patterns** - Không hard fail
3. **Vietnamese support** - Prompts và STT
4. **GPU acceleration** - YOLOv8 nhanh hơn 5-10x

### Điểm Yếu Chung

1. **Ollama dependency** - Single point of failure
2. **No caching** - Tính lại mỗi lần
3. **Chưa train cho VN** - Accuracy thấp

### Ưu Tiên Cải Thiện

1. **🔴 CRITICAL**: Train YOLOv8 cho món Việt (40h)
2. **🟡 HIGH**: Thêm Gemini API fallback (6h)
3. **🟡 HIGH**: Response caching (4h)
4. **🟢 MEDIUM**: Vosk offline STT (12h)

---

**Document Location**: `docs/DANH_GIA_AI.md`  
**Last Updated**: 2025-12-13
