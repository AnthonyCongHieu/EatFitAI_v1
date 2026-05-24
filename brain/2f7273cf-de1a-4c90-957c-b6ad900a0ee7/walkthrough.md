# EatFitAI Audit Remediation — Walkthrough

## Tổng quan

Đã thực hiện **7 thay đổi** dựa trên deep audit source code, fix 4 bug nghiêm trọng và cleanup technical debt.

---

## Thay đổi đã thực hiện

### ✅ BUG #1: Fix Barcode Lookup (appsettings.Production.json)

render_diffs(file:///d:/EatFitAI_v1/eatfitai-backend/appsettings.Production.json)

**Vấn đề:** `FoodBarcodeProvider:TemplateUrl` không tồn tại → `LookupBarcodeFromProviderAsync()` luôn return `null`.

**Fix:** Thêm OpenFoodFacts API config. OpenFoodFacts là database mở lớn nhất thế giới với 3M+ sản phẩm.

---

### ✅ BUG #2: Fix VoiceInput Simulation → Text Input thực (VoiceInput.tsx)

render_diffs(file:///d:/EatFitAI_v1/eatfitai-mobile/src/components/VoiceInput.tsx)

**Vấn đề:** Component random text từ mảng hardcoded, không ghi âm thật.

**Fix:** Thay bằng TextInput + gọi `voiceService.parseWithProvider()` trực tiếp. Khi tích hợp `@jamsch/expo-speech-recognition` (EAS build), thêm nút mic là đủ.

---

### ✅ BUG #3: Merge GeminiPool Singleton

**Tạo mới:** [shared_gemini_pool.py](file:///d:/EatFitAI_v1/ai-provider/shared_gemini_pool.py)

render_diffs(file:///d:/EatFitAI_v1/ai-provider/nutrition_llm.py)
render_diffs(file:///d:/EatFitAI_v1/ai-provider/stt_service.py)

**Vấn đề:** 2 GeminiPoolManager độc lập → desync quota, double-counting API calls.

**Fix:** Cả hai module giờ import từ `shared_gemini_pool.get_shared_pool()` (lazy singleton).

---

### ✅ BUG #4 + Cleanup: Loại bỏ PyTorch hoàn toàn

render_diffs(file:///d:/EatFitAI_v1/ai-provider/requirements.txt)
render_diffs(file:///d:/EatFitAI_v1/ai-provider/app.py)

**Đã xóa:**
- `torch`, `torchvision`, `ultralytics` từ requirements.txt
- `import torch`, `get_optimal_device()`, `_load_yolo_model()` (62 dòng dead code)
- `YOLO_INFERENCE_LOCK` (ONNX Runtime thread-safe)
- `YOLO_MODEL_LOAD_LOCK` (không còn _load_yolo_model)
- PyTorch health check references (`model` biến, `model_classes`)

**Impact ước tính:**
- **RAM:** Giảm ~260MB (torch 180 + torchvision 30 + ultralytics 50)
- **Docker image:** Giảm từ ~2GB xuống ~500MB
- **Throughput:** ONNX inference không còn bị serialize bởi threading.Lock()

---

### ✅ Dead Code Mobile

render_diffs(file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/voiceService.ts)
render_diffs(file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/aiService.ts)

- `parseWithOllama()` → Xóa (chỉ delegate, Ollama đã bị thay)
- `detectIngredients()` → Xóa (deprecated, return `[]`)

---

## Verification Checklist

### Backend C# (.NET)
```bash
cd eatfitai-backend && dotnet build
```
- Kiểm tra `appsettings.Production.json` có `FoodBarcodeProvider` section

### AI Provider (Python)
```bash
cd ai-provider
pip install -r requirements.txt  # Không còn torch/torchvision
python -c "from shared_gemini_pool import get_shared_pool; print('OK')"
python -c "import app; print('OK')"
```

### Mobile (React Native)
```bash
cd eatfitai-mobile && npx tsc --noEmit
```
- VoiceInput không còn import simulation code
- voiceService không còn `parseWithOllama`

---

## Files Changed Summary

| File | Action | Impact |
|------|--------|--------|
| `appsettings.Production.json` | Modified | Fix barcode lookup |
| `shared_gemini_pool.py` | **New** | Singleton pool module |
| `nutrition_llm.py` | Modified | Use shared pool |
| `stt_service.py` | Modified | Use shared pool |
| `app.py` | Modified | Remove PyTorch, unlock ONNX |
| `requirements.txt` | Modified | Remove 3 heavy deps |
| `VoiceInput.tsx` | **Rewritten** | Real text input |
| `voiceService.ts` | Modified | Remove dead Ollama method |
| `aiService.ts` | Modified | Remove deprecated method |
