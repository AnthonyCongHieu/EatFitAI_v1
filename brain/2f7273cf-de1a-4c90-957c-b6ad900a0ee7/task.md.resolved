# EatFitAI Deep Audit — Execution Tracker

## Phase 1: Hotfix (Ngay lập tức)

- [x] 1.1 Fix Barcode: Thêm `FoodBarcodeProvider` config vào `appsettings.Production.json`
- [x] 1.2 Fix VoiceInput: Chuyển từ simulation sang text input thực tế gọi `parseWithProvider`
- [x] 1.3 Merge GeminiPool: Tạo `shared_gemini_pool.py` singleton, cập nhật stt_service + nutrition_llm

## Phase 2: Cleanup (Giảm RAM, Tăng throughput)

- [x] 2.1 Loại bỏ `torch`, `torchvision`, `ultralytics` khỏi requirements.txt
- [x] 2.2 Xóa `import torch`, `get_optimal_device()`, `_load_yolo_model()`, dead YOLO code
- [x] 2.3 Bỏ `YOLO_INFERENCE_LOCK` + `YOLO_MODEL_LOAD_LOCK` cho ONNX path
- [x] 2.4 Xóa dead code: `parseWithOllama`, `detectIngredients`, PyTorch healthcheck refs
