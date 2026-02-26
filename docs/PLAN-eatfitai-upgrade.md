# 📋 PLAN: EatFitAI – Nâng Cấp Toàn Diện & Triển Khai Production

> **Mục tiêu**: Từ local MVP → App triển khai được trên Google Play & App Store  
> **Team**: 2 developers (Dev A: Backend/AI, Dev B: Mobile/UI)  
> **Timeline thực tế**: 6 tuần (full-time) hoặc 10-12 tuần (part-time)  
> **Dựa trên**: Audit 322 files, tài liệu đồ án, research cộng đồng  
> **Nguyên tắc**: Không ảo hóa – mọi giải pháp đều có bằng chứng research  
> **Cập nhật**: 27/02/2026 – Rà soát thực tế hóa chi phí, timeline, rate limits

---

## MỤC LỤC

1. [Tổng Quan Hiện Trạng](#1-tổng-quan-hiện-trạng)
2. [ADR – Quyết Định Kiến Trúc](#2-adr--quyết-định-kiến-trúc)
3. [Phase 1: Fix Bugs & Security](#3-phase-1-fix-bugs--security-tuần-1)
4. [Phase 2: Architecture & Code Quality](#4-phase-2-architecture--code-quality-tuần-2)
5. [Phase 3: UI/UX Enhancement](#5-phase-3-uiux-enhancement-tuần-2-3)
6. [Phase 4: AI Reliability](#6-phase-4-ai-reliability-tuần-3)
7. [Phase 5: Production Deployment](#7-phase-5-production-deployment-tuần-4)
8. [Phân Tích Thị Trường & Đối Thủ](#8-phân-tích-thị-trường--đối-thủ)
9. [Dead Files, Duplicate & Cleanup](#9-dead-files-duplicate--cleanup)
10. [AI Reliability Nâng Cao](#10-ai-reliability-nâng-cao)
11. [Timeline Gantt](#11-timeline-gantt)
12. [Chi Phí & Definition of Done](#12-chi-phí--definition-of-done)

---

## 1. TỔNG QUAN HIỆN TRẠNG

| Khía cạnh | Điểm hiện tại | Mục tiêu |
|-----------|:------------:|:--------:|
| UI/UX Frontend | 9.0/10 | 9.5/10 |
| Backend Engineering | 6.5/10 | 8.5/10 |
| AI Integration | 7.0/10 | 8.5/10 |
| Security | 3.0/10 → 5.0 (sau fix) | 8.0/10 |
| Test Coverage | 1.0/10 | 6.0/10 |
| DevOps/CI/CD | 1.0/10 | 7.0/10 |

> *Nguồn: [PROJECT_REALITY_AUDIT.md](file:///d:/EatFitAI_v1/docs/PROJECT_REALITY_AUDIT.md) (12/2025) + audit mới (02/2026)*

---

## 2. ADR – QUYẾT ĐỊNH KIẾN TRÚC

### ADR-001: Database – SQL Server → Supabase PostgreSQL

**Bối cảnh**: App đang dùng SQL Server local. Không có giải pháp cloud free dài hạn cho SQL Server ngoài Azure SQL (giới hạn 100K vCore-s/tháng).

| Option | Chi phí | Ưu điểm | Nhược điểm |
|--------|---------|---------|------------|
| **A. Azure SQL Free** | $0 (100K vCore-s) | Giữ nguyên SQL Server, free lifetime | Giới hạn compute, không realtime, auth riêng |
| **B. Supabase PostgreSQL** | $0 (500MB, 50K MAU) | Auth built-in, Realtime, Storage, Edge Functions, REST API auto | Cần migrate schema SQL Server → PostgreSQL |
| **C. Railway PostgreSQL** | $1/month credit | Simple deploy, auto-backup | Không có BaaS features (auth, storage) |

**✅ Quyết định: Option B – Supabase**

**Lý do**:
- Free tier đủ cho MVP (500MB DB, 1GB file storage, 50K MAU)
- Built-in Auth → thay JWT tự viết, giảm surface attack
- Realtime subscriptions → tương lai sync multi-device
- REST API auto-gen → giảm boilerplate backend
- Row Level Security → bảo mật ở DB level
- *Nguồn: [supabase.com/pricing](https://supabase.com/pricing)*

> [!WARNING]
> **Supabase free tier tự PAUSE sau 7 ngày inactive!** Cần setup GitHub Actions cron job ping mỗi 5 ngày để keep-alive. Max 2 projects free. Không có automated backup ở free tier.

**Migration plan**: Dùng `pgloader` hoặc SSMA tool để convert schema. EF Core hỗ trợ PostgreSQL via `Npgsql.EntityFrameworkCore.PostgreSQL`.

---

| Option | Chi phí | Cấu hình Free | Ưu điểm | Giới hạn |
|--------|---------|:-------------:|---------|---------|
| **A. Railway** | $5/mo | (Free tier $1/mo ko đủ) | Dễ deploy | Mất phí $5/tháng để always-on |
| **B. GCP e2-micro** | **$0** | 2 vCPU, 1GB RAM | Always Free 100% | Linux VM trần, phải tự setup Docker |
| **C. Oracle Cloud** | **$0** | **4 CPU ARM, 24GB RAM** | Cấu hình SIÊU MẠNH | Đăng ký tài khoản hay bị từ chối thẻ |

**✅ Quyết định: Option C (Oracle Cloud) hoặc Option B (GCP e2-micro) – 0$ tuyệt đối**

> [!IMPORTANT]
> Để **KHÔNG TỐN 1 XU NÀO ($0)**, ta sẽ không dùng Railway.
> - **Ưu tiên 1**: Đăng ký **Oracle Cloud Always Free** (ARM, 24GB RAM). Dùng Docker chạy .NET 9 vô tư.
> - **Ưu tiên 2 (Fallback)**: Nếu Oracle từ chối thẻ, đăng ký **Google Cloud e2-micro** (us-central1/us-east1/us-west1). Vẫn đủ 1GB RAM chạy .NET.
> - *Lưu ý*: Phải tự setup reverse proxy (Nginx) và SSL (Certbot) trên VPS thay vì auto như Railway.

---

### ADR-003: AI Provider Hosting

| Option | Chi phí | GPU | Ghi chú |
|--------|---------|:---:|---------|
| **A. Giữ local Ollama** | $0 | ✅ | Chỉ local, không deploy được |
| **B. Railway CPU** | $5/mo | ❌ | YOLO CPU chậm 2-5s/ảnh |
| **C. Google Cloud Run + ONNX** | $0 free tier | ❌ CPU | Serverless, auto-scale to 0, **cold start 4-7s (.NET)** |
| **D. Gemini API cho LLM** | $0 free tier | Cloud | ⚠️ **10 RPM, 250 RPD** (giảm 50-92% từ 12/2025) |

**✅ Quyết định: C + D kết hợp** – nhưng có giới hạn thực tế

> [!CAUTION]
> **Gemini free tier đã bị cắt mạnh (12/2025)**:
> - Gemini 2.5 Flash: **10 RPM, 250 requests/ngày** (KHÔNG PHẢI 15 RPM, 1M tokens/day)
> - Gemini 2.5 Flash-Lite: 15 RPM, 1000 RPD (nhẹ hơn, nhanh hơn)
> - Gemini 2.5 Pro: chỉ 5 RPM, 100 RPD
> - *Nguồn: [ai.google.dev/pricing](https://ai.google.dev/pricing) – verified 02/2026*
>
> **→ 250 requests/ngày đủ cho ~50-100 users/ngày.** Khi scale cần paid tier ($0.30/1M input tokens Flash).

> [!WARNING]
> **Cloud Run cold start cho Python + YOLO ONNX**: ~2-5s lần đầu (model loading). Mitigate: min-instances=1 (tốn ~$3/mo) hoặc chấp nhận cold start.

- **YOLO**: Export ONNX → FastAPI trên Cloud Run (free 2M requests/mo, 180K vCPU-s)
- **LLM**: Gemini 2.5 Flash-Lite (15 RPM, 1000 RPD) cho requests nhanh, Flash cho complex
- **Fallback**: Mifflin-St Jeor formula (đã có sẵn trong `nutrition_llm.py`)
- *Nguồn: [cloud.google.com/run/pricing](https://cloud.google.com/run/pricing)*

---

### ADR-004: Mobile Deployment → Hybrid Approach (Google Play + Expo Go)

| Yêu cầu | Android (Google Play) | iOS (Expo Go - Đồ án) |
|----------|:---------------------:|:---------------------:|
| Chi phí | **$25 (One-time)** | **$0** (Bỏ qua gói $99/năm) |
| Phân phối| Tải từ Play Store chính thức | Scan QR code qua app Expo Go |
| OTA Updates| EAS Update | Live reload / EAS Update |
| Mức độ | Production-ready (Chuyên nghiệp) | Testing / Internal (MVP đồ án) |

**✅ Quyết định: Trả $25 cho Android, $0 cho iOS**

> [!TIP]
> **Chiến lược tối ưu chi phí cho đồ án / MVP**:
> 1. **Android**: Đầu tư **$25 (mua 1 lần vĩnh viễn)** để đưa app lên Google Play. Điều này giúp app "sống thật", dễ dàng thu hút user tải về qua 1 chạm, tăng uy tín cực lớn khi báo cáo đồ án. Sử dụng EAS Build (free tier giới hạn 15 Android builds/tháng - đủ dùng).
> 2. **iOS**: Chấp nhận bỏ qua thị trường iOS lúc này vì phí $99/năm là quá đắt và quy trình duyệt app của Apple khắt khe (dễ bị reject). Để thầy cô/bạn bè dùng iPhone test app, ta dùng **Expo Go** scan QR code hoàn toàn free. Chừng nào app kiếm ra tiền mới mua tài khoản Apple.

---

## 3. PHASE 1: Fix Bugs & Security (Tuần 1)

### Dev A – Backend (16h)

| # | Task | File(s) | Est. | Prio |
|---|------|---------|:----:|:----:|
| A1 | **Fix JWT Issuer/Audience** – thêm claim vào SecurityTokenDescriptor | `AuthService.cs:L216`, `GoogleAuthController.cs:L276` | 2h | 🔴 |
| A2 | **Merge 2 DbContexts** → 1 + merge 2 User models | `ApplicationDbContext.cs`, `EatFitAIDbContext.cs`, 2× `User.cs` | 4h | 🔴 |
| A3 | **Refactor GoogleAuthController** – extract JWT utils ra `JwtTokenService.cs` | `GoogleAuthController.cs` (xóa 3 hàm copy-paste) | 2h | 🟡 |
| A4 | **DataAnnotations validation** top DTOs | 10 DTO files (`LoginRequest`, `RegisterRequest`...) | 3h | 🟡 |
| A5 | **Implement AIReview.ApplySuggestions** (TODO stub) | `AIReviewController.cs:L79`, `AIReviewService.cs` | 2h | 🟡 |
| A6 | **CORS whitelist** – remove `SetIsOriginAllowed(_ => true)` | `Program.cs` | 1h | 🟡 |
| A7 | **JWT expiry** 24h → 1h + enforce refresh flow | `AuthService.cs:L224` | 2h | 🟡 |

### Dev B – Mobile + Docs (16h)

| # | Task | File(s) | Est. | Prio |
|---|------|---------|:----:|:----:|
| B1 | **Account Deletion** screen (bắt buộc App Store/Play) | Tạo `DeleteAccountScreen.tsx` + API endpoint | 4h | 🔴 |
| B2 | **Privacy Policy** page + URL | Static page + link in app settings | 2h | 🔴 |
| B3 | **Fix hardcoded nutrition defaults** | `aiService.ts` | 1h | 🟡 |
| B4 | **Offline error handling** – toast rõ ràng khi mất mạng | `apiClient.ts`, tạo `OfflineNotice.tsx` | 3h | 🟡 |
| B5 | **Cập nhật tài liệu đồ án** (Harris→Mifflin, .NET→9, llama→qwen) | Thesis doc | 3h | 🟡 |
| B6 | **EAS Build config** – `eas.json` + app identifiers | `app.json`, `eas.json` | 3h | 🟡 |

---

## 4. PHASE 2: Architecture & Code Quality (Tuần 2)

### Dev A – Backend Refactor (20h)

| # | Task | Mô tả | Est. |
|---|------|-------|:----:|
| A8 | **Tách `nutrition_llm.py`** (1074 dòng) → 4 modules | `ollama_client.py`, `nutrition_calc.py`, `voice_parser.py`, `cooking_gen.py` | 4h |
| A9 | **Flask → FastAPI** (AI Provider) | 3-5x faster, async, auto-docs, type validation built-in | 6h |
| A10 | **Gunicorn + Uvicorn** production server | `gunicorn.conf.py` đã có | 1h |
| A11 | **Export YOLOv8 → ONNX** | `export_model.py` sẵn, inference nhanh 30-50% | 2h |
| A12 | **Polly retry + circuit breaker** cho AI HTTP calls | NuGet `Microsoft.Extensions.Http.Polly` | 3h |
| A13 | **Pagination** food search | `FoodController.cs`, `PagedRequest.cs` đã có DTO | 2h |
| A14 | **Response compression** Brotli | `Program.cs` | 1h |
| A15 | **Serilog** structured logging | Replace Console/ILogger → Serilog file sink | 1h |

### Dev B – Mobile Refactor (20h)

| # | Task | Mô tả | Est. |
|---|------|-------|:----:|
| B7 | **Extract AIScanScreen** (29KB) → 3 components | `ScanCamera`, `DetectionResults`, `IngredientList` | 4h |
| B8 | **Extract MealDiaryScreen** (30KB) → 4 components | `MealList`, `DailyMacroSummary`, `MealTypeSection` | 4h |
| B9 | **Extract VoiceScreen** (27KB) → 3 components | `VoiceRecorder`, `CommandResult`, `VoiceHistory` | 3h |
| B10 | **Extract HomeScreen** (21KB) → 3 components | `DailySummaryCard`, `QuickActions`, `RecentMeals` | 3h |
| B11 | **React.memo** heavy components | FoodSearch, Home list items | 2h |
| B12 | **Skeleton loading** integration | 7 skeletons đã có → map vào screens | 2h |
| B13 | **Error boundaries** cho AI screens | Wrap AIScan, Voice, Insights | 1h |
| B14 | **Lazy loading** screens ít dùng | About, ChangePassword, GoalSettings | 1h |

---

## 5. PHASE 3: UI/UX Enhancement (Tuần 2-3)

> *Tham khảo cộng đồng: MyFitnessPal (microservices, hybrid DB), Yazio (K8s, ArgoCD), Lifesum (AI meal planning, Life Score)*

### Dev B – UI/UX (20h)

| # | Task | Ghi chú | Est. |
|---|------|---------|:----:|
| B15 | **Onboarding polish** – progress indicator, skip | `OnboardingScreen.tsx` | 3h |
| B16 | **Pull-to-refresh** MealDiary, Stats, Home | `RefreshControl.tsx` sẵn | 2h |
| B17 | **Haptic feedback** add/delete meals | `useHaptics.ts` sẵn | 1h |
| B18 | **Empty states** tất cả list screens | `AnimatedEmptyState.tsx` sẵn | 2h |
| B19 | **Swipe-to-delete** meal entries | `Swipeable.tsx` sẵn | 2h |
| B20 | **Dark/Light toggle** trong Settings | `ThemeProvider.tsx` + `themes.ts` sẵn | 2h |
| B21 | **Accessibility audit** – contrast, font, reader | `accessibility.ts` sẵn | 2h |
| B22 | **Store assets** – icon 512/1024, splash, screenshots | Design assets | 3h |
| B23 | **Context-aware skeletons** thay generic spinner | 7 skeleton components | 3h |

### Dev A – Backend UX Support (4h)

| # | Task | Est. |
|---|------|:----:|
| A16 | DB query optimization + N+1 check | 2h |
| A17 | Health check endpoint mở rộng | 2h |

---

## 6. PHASE 4: AI Reliability (Tuần 3)

### Dev A – AI (24h)

| # | Task | Mô tả | Est. |
|---|------|-------|:----:|
| A18 | **AI Fallback Chain** | Gemini 2.5 → Ollama RAG → Formula | 4h |
| A19 | **Crawler Data Món Việt** | OpenFoodFacts SDK + Kaggle → Postgres (2000 items) | 4h |
| A20 | **YOLOv11 Fine-tuning** | Train trên Colab T4 (VietFood67) → export ONNX | 4h |
| A21 | **Whisper RAG Correction** | PhoWhisper text → Ollama + DB context → text chuẩn | 3h |
| A22 | **Recipe Agentic RAG** | Ollama generate recipe dựa trên top 5 DB nấu ăn | 3h |
| A23 | **Rate limiting AI** | 10 calls/min/user bằng Middleware | 2h |
| A24 | **Tích hợp Option Chế biến** | Hệ số nhân calo theo Hấp/Luộc/Chiên/Nướng | 2h |

### Dev B – AI UX & Pro Max Features (16h)

| # | Task | Ghi chú | Est. |
|---|------|---------|:----:|
| B24 | **AI Confidence Indicator** | Hiện phần trăm % trên prediction frame chụp ảnh | 2h |
| B25 | **Smart Input màn Voice** | Input Box kết hợp: User có thể dọng nói + Gõ chữ | 3h |
| B26 | **Barcode Scan (Mã vạch)** | VisionCamera + OpenFoodFacts barcode API miễn phí | 4h |
| B27 | **Android Health Connect** | Đồng bộ bước chân / calo tự động ngầm | 4h |
| B39 | **Water Tracking Flow** | Giao diện kéo ly nước + Backend | 3h |

---

## 7. PHASE 5: Production Deployment (Tuần 4)

### Dev A – Infrastructure (20h)

| # | Task | Est. |
|---|------|:----:|
| A25 | **Dockerfile** .NET backend (multi-stage) | 3h |
| A26 | **Dockerfile** AI Provider (FastAPI + ONNX) | 3h |
| A27 | **Railway deploy** backend | 3h |
| A28 | **Cloud Run deploy** AI Provider | 3h |
| A29 | **GitHub Actions CI/CD** | 4h |
| A30 | **Secrets management** (env vars) | 2h |
| A31 | **DB migration** SQL Server → PostgreSQL | 2h |

### Dev B – Mobile Deploy (16h)

| # | Task | Est. |
|---|------|:----:|
| B28 | **EAS Build** + credential management | 3h |
| B29 | **Google Play listing** (VI + EN) | 4h |
| B30 | **App Store Connect** setup | 4h |
| B31 | **EAS Submit** → Internal Testing | 2h |
| B32 | **OTA Update** channel setup | 3h |

---

## 8. PHÂN TÍCH THỊ TRƯỜNG & ĐỐI THỦ

### 8.1 Market Size & Xu Hướng

| Chỉ số | Giá trị | Nguồn |
|--------|---------|-------|
| Global nutrition app market 2025 | ~$5.49B | grandviewresearch.com |
| Global forecast 2032 | ~$13.49B (CAGR 11.6%) | metatechinsights.com |
| **Vietnam fitness/health apps 2025** | **$3.8B** | mobilityforesights.com |
| **Vietnam forecast 2031** | **$12.7B (CAGR 22.1%)** | mobilityforesights.com |
| Vietnam smartphone users | 70M+ (73% penetration) | marketresearch.com |
| AI in personalized nutrition 2025 | $1.54B → $10.21B by 2033 | grandviewresearch.com |

> [!IMPORTANT]
> Vietnam là 1 trong những thị trường tăng trưởng nhanh nhất (CAGR 22.1%). **Đối thủ VN trực tiếp**: Calorie Pal, Calora AI, Nutrio AI, Kalo AI, DietBuddy AI. Phần lớn chưa có **food database Việt Nam** đầy đủ – đây là lợi thế của EatFitAI (đã có `insert_vietnamese_fooditems.sql`).

### 8.2 ĐỐI THỦ #1: WAO – Food & Calorie Counter (Việt Nam)

> **Bằng chứng**: WAO.vn, Apple App Store listing, "Top 20 Vietnamese Products for Consumer Rights 2025"  
> *Nguồn: [apple.com/app/wao](https://apps.apple.com/app/wao-food-calorie-counter/id6447081814), [wao.vn](https://wao.vn)*

| Metric | WAO | **EatFitAI** | Đánh giá |
|--------|-----|:------------:|:--------:|
| VN food database | **20,000+ dishes** | ~500 items | 🔴 WAO hơn 40x |
| Barcode scan (VN) | ✅ US + **VN products** | ❌ | 🔴 Thiếu |
| AI photo recognition | ✅ | ✅ YOLOv8 | 🟡 Ngang |
| Voice logging | ✅ | ✅ STT | 🟡 Ngang |
| Wearable sync | Apple Health + Google Fit + Health Connect | ❌ | 🔴 Thiếu |
| Meal planner AI | ✅ Personalized | ✅ Recipe suggest | 🟡 Ngang |
| Intermittent fasting | ❌ | ❌ | ⚪ Cả hai thiếu |
| Community | ✅ Experts + forums | ❌ | 🔴 Thiếu |
| Streak/gamification | ✅ Streak protection | ✅ Achievements | 🟡 Ngang |
| Portion customization | ✅ Seasoning/cooking method | ❌ | 🟡 WAO hơn |
| Platforms | iOS + Android | Expo (cả hai) | ⚪ Ngang |
| Giá | Freemium | **100% Free** | ✅ EatFitAI hơn |

**Bài học từ WAO:**
1. **VN food database là yếu tố sống còn** – WAO có 20K+ items, EatFitAI chỉ ~500
2. **Barcode scan VN** (Phúc Long, Highlands, bún bò gói) – feature bắt buộc
3. **Apple Health / Google Fit sync** – user kỳ vọng có
4. **Portion by cooking method** (xào, hấp, chiên) – ảnh hưởng calories rất nhiều, EatFitAI chưa có

### 8.2b ĐỐI THỦ VN KHÁC

#### CalSnap – AI Calorie Counter (calsnap.asia/vi)

> *Nguồn: [calsnap.asia/vi](https://calsnap.asia/vi), Apple App Store, Google Play*

- **Mô hình**: Web + Mobile app, AI photo-first logging
- **Slogan**: "Ứng dụng đếm calo với AI miễn phí cho người Việt"
- **Features chính**:
  - 📸 AI photo recognition (chụp ảnh → nhận diện + tính calo tự động)
  - 🔍 Barcode scanning cho đồ đóng gói
  - ✍️ Mô tả bữa ăn bằng text → AI tính
  - 📊 Daily calorie/macro tracking với visual charts
  - 📜 Meal history + nutrition reports
  - ⚖️ Weight goal monitoring
  - 🌐 UI tiếng Việt, giá hiển thị VNĐ
- **Tech**: Backend dùng Odoo (phát hiện qua footer website)
- **Điểm yếu**: Website sơ sài (còn placeholder text), VN food database chưa rõ size
- **So với EatFitAI**: CalSnap focus "photo-first", EatFitAI có thêm recipe AI + voice + gamification

| Metric | CalSnap | **EatFitAI** |
|--------|---------|:------------:|
| AI photo scan | ✅ Primary feature | ✅ YOLOv8 |
| Text meal input | ✅ | ❌ |
| Barcode scan | ✅ | ❌ |
| Voice logging | ❌ | ✅ STT |
| Recipe AI | ❌ | ✅ |
| Gamification | ❌ | ✅ Achievements |
| Offline mode | ❌ | ❌ |
| Giá | Freemium (IAP) | **100% Free** |
| Tech stack | Odoo (web-based) | React Native + .NET 9 |

#### Caloer – Tính Calo & Giảm Cân (caloer.asia)

> *Nguồn: [Google Play](https://play.google.com/store/apps/details?id=com.iwritin.caloer&hl=vi), [caloer.asia](https://caloer.asia), App Store*

- **Mô hình**: Mobile app (iOS + Android), focused cho thị trường VN
- **Slogan**: "Ứng dụng theo dõi cân nặng, dinh dưỡng, tập luyện toàn diện cho người Việt"
- **Users**: **100,000+** users đã đạt mục tiêu giảm cân
- **Developer**: iWritin (caloerofficial@gmail.com)
- **Features chính**:
  - 🍜 **Hàng nghìn món Việt** trong database (Phở, Cơm Tấm, Bún Bò...)
  - 📷 Barcode scanner miễn phí cho đồ đóng gói
  - 📊 Calories + macros + nutrients tracking chi tiết
  - 🏋️ **Exercise/workout programs** – kế hoạch tập luyện theo level (EatFitAI KHÔNG có)
  - 👨‍⚕️ **Chuyên gia dinh dưỡng** tư vấn trong app
  - 📈 Weight tracking + diet plans personalized
  - 🎨 UI đơn giản, thân thiện cho beginners
- **Điểm yếu**: Bug data loss (fixed v3.0.20), color coding UX gây áp lực tâm lý (đỏ khi vượt target)
- **Điểm mạnh so với EatFitAI**: Exercise plans, chuyên gia tư vấn, VN food DB lớn hơn, 100K+ users

| Metric | Caloer | **EatFitAI** |
|--------|--------|:------------:|
| VN food database | **Hàng nghìn** | ~500 items |
| AI photo scan | ❌ | ✅ YOLOv8 |
| Barcode scan | ✅ | ❌ |
| Voice logging | ❌ | ✅ STT |
| Recipe AI | ❌ | ✅ |
| Exercise/workout | ✅ Programs | ❌ |
| Expert consultation | ✅ | ❌ |
| Gamification | ❌ | ✅ Achievements |
| Community | ✅ | ❌ |
| Offline mode | ❌ | ❌ |
| Users | **100K+** | MVP/local |
| Giá | Free + Premium | **100% Free** |

#### Các đối thủ VN khác

| App | Focus | DB size | Đặc điểm |
|-----|-------|---------|----------|
| **Caloer** | VN calorie tracker | Medium | Phở, Cơm Tấm tracking, startup mới |
| **Calorie Pal** | General + VN | Medium | AI scan, đang phát triển |
| **Nutrio AI** | AI nutrition | Small | AI-heavy, ít VN data |
| **DietBuddy** | AI food tracker | Small | Photo detection |

### 8.3 So Sánh Đối Thủ – Feature Matrix (Cập nhật với WAO)

| Feature | MFP | Yazio | Lifesum | Cronometer | **EatFitAI** |
|---------|:---:|:-----:|:-------:|:----------:|:------------:|
| Food database size | 14M+ | Large EU | Medium | USDA verified | ~500 VN items |
| AI photo scan | ✅ Premium | ✅ | ✅ | ✅ Gold | ✅ YOLOv8 |
| Voice logging | ✅ Premium | ❌ | ✅ | ❌ | ✅ (STT) |
| Barcode scan | ✅ | ✅ | ✅ | ✅ | ❌ |
| Meal planner AI | ✅ Premium+ | ❌ | ✅ Premium | ❌ | ✅ Recipe suggest |
| Micronutrient tracking | Basic | Basic | Basic | **80+ nutrients** | ❌ |
| Wearable integration | Fitbit/AW | AW/Fitbit | Health Connect | AW/HC | ❌ |
| Intermittent fasting | ❌ | ✅ | ✅ | ❌ | ❌ |
| Gamification | Streaks | Celebratory | Life Score | ❌ | ✅ Achievements |
| Multimodal tracker | Scan+Voice | Scan | Photo/Voice/Text/Barcode | Photo | Scan+Voice |
| Offline mode | ✅ | ✅ | ✅ | ✅ | ❌ |
| Free tier | Limited | Good | Limited | Good | **Full** |

### 8.3 Userflow Gaps – EatFitAI vs Đối Thủ

**Phân tích USERFLOW.md vs code thực tế và đối thủ:**

| Gap | Chi tiết | Đối thủ tham khảo |
|-----|----------|-------------------|
| 🔴 **Doc sai tab count** | USERFLOW.md nói 4 tabs, code có **5 tabs** (Home, AI, Voice, Stats, Profile) | - |
| 🔴 **Thiếu Voice flow** | VoiceScreen là tab 3 nhưng KHÔNG có trong USERFLOW.md | MFP Voice Log |
| 🟡 **Thiếu Settings flow** | Không có SettingsScreen flow; About, ChangePassword, GoalSettings undocumented | Yazio thorough settings |
| 🟡 **Thiếu NotificationsScreen** | File tồn tại (`NotificationsScreen.tsx`) nhưng không trong navigation/docs | MFP meal reminders |
| 🟡 **Thiếu DeleteAccount** | Bắt buộc cho Store nhưng chưa có | Apple/Google yêu cầu |
| 🟡 **No barcode scan** | `FoodSearchScreen` ghi "barcode scan (prepared)" nhưng chưa implement | MFP, Yazio, Lifesum |
| 🟡 **No offline mode** | Mất mạng = app không dùng được | MFP, Yazio local cache |
| ⚪ **Onboarding thiếu celebratory** | Đối thủ có celebratory messages, progress bar, skip option | Yazio milestone celebrations |
| ⚪ **Thiếu water tracking** | Feature phổ biến ở tất cả đối thủ | Lifesum, Yazio |

---

## 9. DEAD FILES, DUPLICATE & CLEANUP

> Scan bằng `grep -r`, `Get-ChildItem`, cross-reference imports

### 9.1 Files CẦN XÓA (Dead/Duplicate)

| # | File/Folder | Lý do | Action |
|---|-------------|-------|--------|
| D1 | **`DbScaffold/` (26 files)** | Toàn bộ là scaffold duplicate của `Models/` + `ApplicationDbContext.cs`. 26 files trùng: `EatFitAIDbContext.cs` + 25 Models | 🗑️ **XÓA toàn bộ folder** |
| D2 | `analytics.ts` | 100% stub – chỉ chứa `console.log`, TODO "integrate real analytics SDK" | 🔧 Implement hoặc 🗑️ xóa |
| D3 | `services/notificationService.ts` | Tồn tại nhưng **không import ở bất kỳ screen nào**, không trong USERFLOW | 🔧 Implement hoặc 🗑️ xóa |
| D4 | `screens/profile/NotificationsScreen.tsx` | Tồn tại nhưng **không trong AppNavigator**, không reachable | 🔧 Wire up hoặc 🗑️ xóa |

### 9.2 Files CẦN CLEANUP

| # | File | Vấn đề | Số lượng |
|---|------|--------|:--------:|
| C1 | `config/env.ts` | **16 DEBUG console.log** | 16 dòng |
| C2 | `services/apiClient.ts` | **17 console.log** (request/response interceptors, scan) | 17 dòng |
| C3 | `services/aiService.ts` | 5 console.log (token, URI, payload) | 5 dòng |
| C4 | `services/authTokens.ts` | 3 console.log (token in memory) → **SECURITY RISK** | 3 dòng |
| C5 | `store/useAuthStore.ts` | 3 console.log (login, google sign-in) | 3 dòng |
| C6 | `hooks/useHaptics.ts` | 1 console.log (error) → nên dùng error reporter | 1 dòng |
| C7 | **Toàn mobile src/** | **Tổng: 77+ console.log** cần thay bằng `__DEV__` guard hoặc logger | 77+ |
| C8 | `EmailService.cs` | Console.WriteLine thay vì ILogger | 1 dòng |

### 9.3 TODO/Stub Files

| # | File | TODO nội dung |
|---|------|---------------|
| T1 | `AIReviewController.cs:L92` | `// TODO: Implement auto-apply logic` |
| T2 | `AIReviewService.cs:L399` | `LastReviewDate = null // TODO: Track in DB` |
| T3 | `DbScaffold/Models/Recipe.cs:L14` | `// TODO: Uncomment sau khi chạy migration SQL` |
| T4 | `GoogleAuthController.cs:L195` | `AvatarUrl = null, // TODO: Add AvatarUrl field` |
| T5 | `AuthService.cs:L380` | `throw new NotImplementedException("Google login...")` |
| T6 | `errorHandler.ts:L168,174` | `// TODO: Implement when error tracking is set up` |
| T7 | `analytics.ts:L6` | `// TODO: integrate real analytics SDK` |

### 9.4 Tasks Cleanup (Phase 1 bổ sung)

| # | Task | Assigned | Est. |
|---|------|----------|:----:|
| A32 | **Xóa DbScaffold/ folder** (26 files) + update references | Dev A | 1h |
| A33 | **Fix 5 TODO stubs** backend | Dev A | 2h |
| A34 | **Replace Console.WriteLine** trong EmailService → ILogger | Dev A | 0.5h |
| B33 | **Cleanup 77+ console.log** → `__DEV__ && console.log()` hoặc xóa | Dev B | 2h |
| B34 | **Wire NotificationsScreen** vào navigator hoặc xóa | Dev B | 1h |
| B35 | **Implement analytics.ts** với Expo Analytics hoặc xóa | Dev B | 1h |

### 9.5 Bugs Bổ Sung (Deep Scan Lần 2)

> [!CAUTION]
> **🔴 HARDCODED API KEY** phát hiện trong `download_dataset.py:L9`:
> ```python
> rf = Roboflow(api_key="fwe0I8XwhVhUhj22LiXr")
> ```
> Roboflow API key lộ rõ trong source code → cần revoke + dùng env var

| # | Bug | Severity | File | Chi tiết |
|---|-----|:--------:|------|----------|
| BUG-1 | **Hardcoded Roboflow API key** | 🔴 CRITICAL | `download_dataset.py:L9` | Key lộ trong source, cần revoke ngay |
| BUG-2 | **50+ broad `catch(Exception)`** | 🟡 HIGH | 15 Controllers + 5 Services | Swallow hết exceptions, mất thông tin lỗi cụ thể |
| BUG-3 | **31 bare `except:` Python** | 🟡 HIGH | `app.py` (12), `nutrition_llm.py` (7), `stt_service.py` (4), scripts (8) | Silent failures, 4 bare `except:` không log gì |
| BUG-4 | **Controllers try-catch thủ công** | 🟡 MEDIUM | `AIController.cs` (11 blocks!), `VoiceController` (6), `FoodController` (4) | Nên dùng `ExceptionHandlingMiddleware` đã có, xóa try-catch controllers |
| BUG-5 | **ExceptionHandlingMiddleware** chưa cover typed exceptions | 🟡 MEDIUM | `ExceptionHandlingMiddleware.cs` | Chỉ handle `UnauthorizedAccessException`, `InvalidOperationException`, thiếu `ArgumentException`, `KeyNotFoundException` |

### 9.6 Tasks Bug Fix Bổ Sung

| # | Task | Assigned | Est. |
|---|------|----------|:----:|
| A39 | **Revoke + env var** cho Roboflow API key | Dev A | 0.5h |
| A40 | **Refactor Controllers** – xóa try-catch, dùng middleware | Dev A | 4h |
| A41 | **Fix Python bare except** → specific exceptions + logging | Dev A | 2h |
| B40 | **VN food database expansion** – crawl/import thêm 2000+ items (OpenFoodFacts VN + USDA Vietnamese) | Dev B | 6h |
| B41 | **Health Connect integration** (expo-health-connect) cho Android wearables | Dev B | 4h |

---

## 10. AI RELIABILITY NÂNG CAO

### 10.1 Upgrade YOLO11 (thay YOLOv8)

> **Bằng chứng**: YOLO11 (Ultralytics, 09/2024) – 22% fewer params, higher mAP, faster ONNX inference
> *Nguồn: [ultralytics.com/yolo11](https://docs.ultralytics.com/models/yolo11/)*

| Metric | YOLOv8s | YOLO11s | Cải thiện |
|--------|:-------:|:-------:|:---------:|
| mAP@50 (COCO) | 44.9% | 46.5% | +1.6% |
| Parameters | 11.2M | 9.4M | -16% |
| CPU ONNX speed | 128ms | 90ms | +30% faster |

**Task**: Retrain custom food model trên YOLO11 architecture → export ONNX

### 10.2 Gemini 2.0 Flash (thay 1.5/Ollama)

> **Bằng chứng**: Gemini 2.0 Flash tăng 20% user satisfaction, nhận diện sốt + gia vị
> *Nguồn: [googleblog.com](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)*

- Gemini factual accuracy: 9.2/10 cho nutrition data
- **Vấn đề**: Gemini lỗi với vegan/restrictive diets (thiếu B12, include animal products)
- **Giải pháp**: Multi-tier validation + disclaimer

### 10.3 Multi-Tier AI Safety Chain

```
User Request
    │
    ▼
┌─── Tier 1: Gemini 2.0 Flash API ───┐
│ - Primary LLM                       │
│ - Real-time Google Search access     │
│ - Free: 15 RPM, 1M tokens/day       │
└──────────┬──────────────────────────┘
           │ Fail/Rate-limited?
           ▼
┌─── Tier 2: Ollama Local (optional) ─┐
│ - Self-hosted fallback               │
│ - No internet required               │
│ - qwen2.5:3b model                   │
└──────────┬──────────────────────────┘
           │ Fail/Not available?
           ▼
┌─── Tier 3: Mifflin-St Jeor Formula ─┐
│ - Zero AI dependency                 │
│ - 100% reliable, peer-reviewed       │
│ - Already implemented                │
└──────────┬──────────────────────────┘
           │
           ▼
     Response + Source Indicator
     "🤖 AI" | "📊 Formula"
```

### 10.4 Disclaimer & Safety (LLM Best Practices)

> **Bằng chứng**: Nghiên cứu cho thấy LLM nutrition advice chỉ đạt 55-89% accuracy, có risk hallucination
> *Nguồn: nih.gov (PubMed), mdpi.com*

**Bắt buộc thêm vào app:**
1. Disclaimer: "Đây là gợi ý tham khảo từ AI, không thay thế tư vấn từ chuyên gia dinh dưỡng"
2. Source indicator mỗi AI response (Gemini/Formula/Cached)
3. Confidence score cho food detection (đã plan ở B24)
4. Report button nếu AI trả kết quả sai

### 10.5 Tasks AI Reliability (Phase 4 bổ sung)

| # | Task | Assigned | Est. |
|---|------|----------|:----:|
| A35 | **Upgrade YOLO11** – retrain custom food model | Dev A | 6h |
| A36 | **Gemini 2.0 Flash** integration (thay 1.5) | Dev A | 2h |
| A37 | **AI disclaimer** + source indicator API response | Dev A | 1h |
| A38 | **Nutrition validation layer** – cross-check LLM output vs USDA ranges | Dev A | 3h |
| B36 | **Disclaimer UI** component (bottom of AI screens) | Dev B | 1h |
| B37 | **Report wrong AI** button + feedback flow | Dev B | 2h |
| B38 | **Barcode scan** integration (expo-barcode-scanner + OpenFoodFacts API) | Dev B | 4h |
| B39 | **Water tracking** feature (feature request từ market research) | Dev B | 4h |

---

## 11. TIMELINE GANTT

```
Tuần 1 ─ Fix Bugs & Security ──────────────────────
  Dev A: [A1-A7,A32-A34,A39]  Fix JWT, merge DbContext, xóa DbScaffold, revoke key
  Dev B: [B1-B6,B33-B35]  Account deletion, Privacy Policy, cleanup console.log

Tuần 2 ─ Architecture & Refactor ──────────────────
  Dev A: [A8-A15,A40-A41]  FastAPI, ONNX, Polly, refactor controllers
  Dev B: [B7-B14]  Extract 4 screens, React.memo, skeleton, lazy

Tuần 3 ─ UI/UX Enhancement ────────────────────────
  Dev A: [A16-A17]  DB optimize, health check
  Dev B: [B15-B23]  UI/UX polish, dark mode, accessibility, assets

Tuần 4 ─ AI Reliability ───────────────────────────
  Dev A: [A18-A24,A35-A38]  Gemini 2.5, YOLO test, disclaimer, validation
  Dev B: [B24-B27,B36-B39]  AI UX, barcode scan, water tracking

Tuần 5 ─ Production Deploy ────────────────────────
  Dev A: [A25-A31]  Docker, Oracle Cloud/GCP VPS, SSL Certbot, CI/CD
  Dev B: [B28-B32,B40]  EAS Build APK, GitHub Releases, VN food DB expand

Tuần 6 ─ Testing & Polish ─────────────────────────
  Dev A: Integration testing, bug fixing, performance tuning
  Dev B: [B41] Health Connect, E2E testing, UX final review

TỔNG: 82 tasks (A1-A41 + B1-B41) | 6 tuần full-time | 10-12 tuần part-time
```

> [!IMPORTANT]
> **Timeline thực tế**: 82 tasks / 2 devs = 41 tasks/dev. Mỗi task trung bình 2-4h. Tổng ~120-160h/dev. Full-time (8h/ngày, 5 ngày/tuần = 40h/tuần) cần **4 tuần coding + 2 tuần testing** = 6 tuần. Part-time (15-20h/tuần) cần 10-12 tuần.

---

## 12. CHI PHÍ & DEFINITION OF DONE

### Chi phí triển khai production (Cập nhật 02/2026 - Loại bỏ iOS)

| Hạng mục | Chi phí | Giải pháp $0 / Tiết kiệm |
|----------|:-------:|--------------------------|
| **Backend Hosting** | **$0/mo** | **Oracle Cloud** (ARM 24GB RAM) hoặc **GCP e2-micro** (1GB RAM) |
| Supabase Database | $0/mo | 500MB, 50K MAU, setup workflow keep-alive cron |
| Cloud Run (YOLO) | $0/mo | 2M req/mo, chịu cold start 2-5s lần đầu |
| Gemini API | $0/mo | 10 RPM, 250 RPD (tạm đủ xài internal testing) |
| Android Distro | **$25** | One-time fee, up lên **Google Play Store** (chuyên nghiệp) |
| iOS Distro | **$0** | Chạy qua **Expo Go** app để khỏi mua gói $99/năm |
| **TỔNG** | **$25.00** | **$25 LẦN ĐẦU + 0$/THÁNG DUY TRÌ** |

> [!WARNING]
> Giải pháp **0$/tháng** sẽ đổi lại cost về quản trị (DevOps):
> - **Backend**: Phải tự SSH vào server cài Docker, Nginx, Certbot SSL thủ công (so với 1-click của Railway).
> - **iOS**: User iOS phải cài app thứ 3 (Expo Go) và không có App Icon riêng. Đổi lại tiết kiệm được ~2.5tr/năm.
> - **AI**: 250 request/ngày của Gemini là rất ít. Nếu lượng user tăng, cần nạp tiền nâng quota.



### Definition of Done – Production Ready

- [ ] Tất cả Critical + High bugs đã fix (C1-C2, H1-H7)
- [ ] JWT auth hoạt động đúng với Issuer/Audience
- [ ] Account Deletion + Privacy Policy có mặt
- [ ] AI fallback chain: Gemini → Ollama → Formula
- [ ] Test coverage ≥ 40% backend services
- [ ] CI/CD pipeline chạy tự động trên GitHub Actions
- [ ] Backend deployed trên Railway
- [ ] Database trên Supabase PostgreSQL
- [ ] AI Provider deployed trên Cloud Run
- [ ] EAS Build thành công cho Android + iOS
- [ ] App submit Google Play Internal Testing
- [ ] Tài liệu đồ án cập nhật đúng vs code thực tế
