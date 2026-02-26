# EatFitAI - Complete Audit & Dev Plan

## Phase 0: 100% Codebase Audit ✅
- [x] Backend: 15 Controllers, 28 Services, 6 Repos, 33 DTOs, 26 Models
- [x] AI Provider: app.py, nutrition_llm.py, stt_service.py, training scripts
- [x] Mobile: 32 screens, 20 services, 8 stores, 44+ components
- [x] Config, Security, Tests, Middleware, Migrations
- [x] So sánh tài liệu đồ án vs code thực tế (thesis_vs_code_analysis.md)
- [x] Viết comprehensive audit + dev task plan
- [/] User review plan → chờ approval

## Phase 1: Fix Critical + High Bugs (3-4 ngày)
- [x] Fix Console.WriteLine → ILogger (AuthService)
- [x] Fix ExceptionMiddleware trả message gốc
- [x] Bật JWT ValidateIssuer/Audience (Program.cs)
- [x] [A39] Revoke Roboflow API Key và dùng biến môi trường
- [ ] [A1] Fix JWT token thiếu Issuer/Audience claim
- [ ] [A2,A3] Merge 2 DbContexts + 2 User models
- [ ] [A6] Refactor GoogleAuthController (DRY violation)
- [ ] [A40] Xóa try-catch Controllers, dùng ExceptionMiddleware
- [ ] [A41] Fix Python bare `except:` → thêm logging
- [ ] [B10] Mobile: Extract 6 large screens
- [ ] Cập nhật tài liệu (BMR, .NET version, LLM model, JWT expiry)

## Phase 2: Optimize & Refactor (5-7 ngày)
- [ ] [A8] Tách nutrition_llm.py thành modules
- [ ] [A10] Polly retry + circuit breaker
- [ ] [A13] Chuyển Flask → Gunicorn
- [ ] [A14] Expand test coverage
- [ ] [B11,12] Mobile: Skeleton loading, React.memo, lazy load
- [ ] Cập nhật tài liệu: thêm Voice, Gamification, LLM, 12 bảng DB

## Phase 3: Mở rộng "Pro Max" & Tự chủ AI 0$ (10-15 ngày)
- [ ] **[AI 0$]** Viết Python Crawler cào OpenFoodFacts/Kaggle lấy 2000+ món tủ VN [A19].
- [ ] **[AI 0$]** Fine-tune YOLO11 bằng Colab T4 Free → Export `.onnx` backend [A20].
- [ ] **[AI 0$]** Nâng cấp PhoWhisper bằng RAG text-correction dùng Local Ollama [A21].
- [ ] **[AI 0$]** Công thức nấu ăn xịn bằng RAG Recipe Agent [A22].
- [ ] **[Pro Max]** Quét Mã Vạch (Barcode Scan & API) [B26].
- [ ] **[Pro Max]** Nhập liệu thông minh kết hợp (Voice + Type Text) [B25].
- [ ] **[Pro Max]** Android Health Connect - Đồng bộ số bước chân [B27].
- [ ] Thêm tuỳ chọn phương pháp nấu món ăn (Luộc, Hấp, Chiên) x Calo [A24].
- [ ] Tính năng Water Tracking [B39].
- [ ] Cập nhật toàn bộ tài liệu báo cáo thực tế sau khi xong Phase 3.
