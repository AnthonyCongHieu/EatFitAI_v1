# 📋 Kế Hoạch Bổ Sung & Cập Nhật Task Notion — EatFitAI Production Readiness

## Bối cảnh

Dự án EatFitAI đang ở giai đoạn **P5 — Kiểm thử & Đánh giá**, chuẩn bị bảo vệ tốt nghiệp. Phiếu đánh giá yêu cầu:
- **CLO1 (8 điểm):** Tìm hiểu doanh nghiệp, Nhiệm vụ được giao, Học hỏi chuyên môn, Nhận thức sau thực tập
- **CLO3 (2 điểm):** Phương tiện trình bày, Khả năng thuyết trình
- CLO1 + CLO3 = **60% tổng điểm** (do Hội đồng chấm)

**Mục tiêu bao trùm:** Đánh mạnh vào **học thuật** + **tính thực tiễn triển khai khởi nghiệp**, đảm bảo app production-ready với người dùng thật, giữ nguyên free tier.

---

## User Review Required

> [!IMPORTANT]
> Bản kế hoạch này sẽ thực hiện **3 nhóm hành động** trực tiếp trên Notion:
> 1. **Tạo 15 task mới** (phân bố P1→P6)
> 2. **Cập nhật 8 task hiện có** (status, scope, deliverables)
> 3. Tất cả task đã bao phủ **100% rubric CLO1 + CLO3**

> [!WARNING]
> Một số task hiện có (P4-AI.06 PhoWhisper, P4-FE.05 Parser Hybrid) sẽ được **đổi scope** vì kiến trúc cloud thực tế đã khác so với plan ban đầu. Nếu bạn muốn giữ scope cũ, hãy nêu rõ.

---

## Proposed Changes

### A. NHÓM 1 — Task mới cho RUBRIC (CLO1 + CLO3)

Mục tiêu: Đảm bảo mỗi tiêu chí rubric đều có task tương ứng, đạt mức **"Tốt"**.

---

#### [NEW] Task 1: `[P1-DOC.01] Khảo sát & Phân tích Bối cảnh Khởi nghiệp HealthTech`
- **Giai đoạn:** P1 — Khảo sát & Phân tích
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Map:** CLO1 → Tiêu chí 1 "Tìm hiểu Doanh nghiệp" (mức TỐT: 2đ)
- **Mô tả:**
  - Phân tích thị trường HealthTech/FoodTech Việt Nam (quy mô, đối thủ, xu hướng)
  - Trình bày mô hình kinh doanh startup EatFitAI (freemium, B2C health tracking)
  - Phân tích SWOT cho sản phẩm
  - So sánh với 3 đối thủ: MyFitnessPal, Calory, nhật ký ăn uống VN
- **Bàn giao:** Chương "Tổng quan bối cảnh" trong báo cáo + slide phần mở đầu

#### [NEW] Task 2: `[P1-DOC.02] Tài liệu Quy trình Phát triển & Phương pháp luận`
- **Giai đoạn:** P1 — Khảo sát & Phân tích
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Map:** CLO1 → Tiêu chí 2 "Nhiệm vụ được giao" (mức TỐT: 2đ)
- **Mô tả:**
  - Document quy trình Agile/Scrum đã áp dụng (Notion board = evidence)
  - Sprint timeline qua 6 giai đoạn P1→P6
  - Phân công công việc 2 thành viên (Hiếu + Tường)
  - Burndown chart / velocity từ Notion task completion
- **Bàn giao:** Chương "Phương pháp luận & Quy trình" trong báo cáo

#### [NEW] Task 3: `[P6-DOC.01] Bài học Chuyên môn & Roadmap Phát triển Cá nhân`
- **Giai đoạn:** P6 — Báo cáo & Bảo vệ
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Map:** CLO1 → Tiêu chí 3 "Học hỏi chuyên môn" + Tiêu chí 4 "Nhận thức sau thực tập" (mức TỐT: 4đ)
- **Mô tả:**
  - Liệt kê kỹ năng chuyên môn đã học: .NET Clean Architecture, YOLOv8/YOLO11 training, Gemini API integration, Docker containerization, Cloud deployment (Render + Supabase)
  - So sánh kỹ năng trước vs sau dự án
  - Lộ trình phát triển: YOLO11 upgrade, production scaling, revenue model
  - Bài học thực tiễn: free tier limitations, cold start, model optimization
- **Bàn giao:** Chương "Kết luận & Định hướng" + slide phần kết

---

### B. NHÓM 2 — Task mới cho YOLO11 Research & AI Upgrade

---

#### [NEW] Task 4: `[P4-AI.10] Nghiên cứu So sánh YOLOv8 vs YOLO11`
- **Giai đoạn:** P4 — Nâng cấp AI & Pro
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:**
  - Benchmark YOLOv8s (hiện tại) vs YOLO11s trên cùng dataset 30,896 ảnh
  - So sánh: mAP50, mAP50-95, inference time, model size, RAM usage
  - Test trên Render free tier (CPU-only): cold start, memory footprint
  - Document kết quả trong format paper-ready (bảng, biểu đồ)
  - Kết luận: nên/không nên migrate, điều kiện migrate
- **Bàn giao:** `docs/16_YOLO11_BENCHMARK_COMPARISON.md` + bảng so sánh cho báo cáo

#### [NEW] Task 5: `[P4-AI.11] Migration Path: YOLOv8 → YOLO11`
- **Giai đoạn:** P4 — Nâng cấp AI & Pro
- **Ưu tiên:** P1 (High)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:**
  - Tạo branch `feature/yolo11-upgrade`
  - Cập nhật `requirements.txt`: `ultralytics>=8.3` → hỗ trợ YOLO11
  - Retrain model trên cùng dataset, cùng hyperparameters
  - Export `best_yolo11.pt`, test inference trên cloud
  - Rollback plan nếu YOLO11 không cải thiện
- **Bàn giao:** Model YOLO11 trained + inference test report + rollback document

#### [NEW] Task 6: `[P4-AI.12] Test Set Evaluation & Scientific Report`
- **Giai đoạn:** P4 — Nâng cấp AI & Pro
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:**
  - Chạy `model.val()` trên test set (2,749 ảnh) riêng biệt cho cả YOLOv8 và YOLO11
  - Xuất: confusion matrix, precision-recall curve, per-class AP
  - So sánh kết quả test set vs validation set → evidence không overfit
  - Format kết quả theo chuẩn báo cáo khoa học
- **Bàn giao:** `docs/17_TEST_SET_EVALUATION_REPORT.md` + hình confusion matrix

---

### C. NHÓM 3 — Task mới cho Production Readiness & Người dùng thật

---

#### [NEW] Task 7: `[P3-CLOUD.01] Cloud Infrastructure Documentation`
- **Giai đoạn:** P3 — Ổn định Nền tảng
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Trạng thái:** ✅ Hoàn thành (retroactive — đã deploy xong)
- **Mô tả:** Document toàn bộ cloud deployment: Render.com (2 services), Supabase (PostgreSQL + Storage), Docker containerization, data migration SQL Server → PostgreSQL
- **Bàn giao:** `docs/10_SUPABASE_RENDER_CLOUD_SETUP.md` (đã có)

#### [NEW] Task 8: `[P3-CLOUD.02] Fix RLS — AiCorrectionEvent Security`
- **Giai đoạn:** P3 — Ổn định Nền tảng
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:** Enable RLS + tạo policy cho `AiCorrectionEvent`. Hiện là lỗ hổng bảo mật duy nhất (Supabase Security Advisor: ERROR).
- **Bàn giao:** RLS enabled, Supabase security advisor 0 error

#### [NEW] Task 9: `[P3-CLOUD.03] Cold Start & Health Monitoring`
- **Giai đoạn:** P3 — Ổn định Nền tảng
- **Ưu tiên:** P1 (High)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:**
  - Cron job / external ping giữ backend warm (free tier tối đa)
  - Health check dashboard (UptimeRobot free hoặc tương đương)
  - Document cold start latency thực tế (evidence cho báo cáo)
- **Bàn giao:** Monitoring configured + cold start benchmark data

#### [NEW] Task 10: `[P5-CLOUD.01] E2E Cloud Smoke Test`
- **Giai đoạn:** P5 — Kiểm thử & Đánh giá
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Cả hai
- **Mô tả:**
  - Full E2E trên cloud production: Register → Onboarding → Food Search → Add Diary → Scan Photo → View Reports
  - Test trên thiết bị thật (không chỉ emulator)
  - Record video demo (evidence cho CLO3)
  - Document: response time, error rate, edge cases
- **Bàn giao:** Test report + video recording + evidence screenshots

#### [NEW] Task 11: `[P5-CLOUD.02] Mobile Production Build & URL Config`
- **Giai đoạn:** P5 — Kiểm thử & Đánh giá
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:**
  - Tạo `.env.production` với Render URLs thật
  - Build APK release trỏ đúng cloud endpoints
  - Test APK release trên thiết bị thật (không qua Expo Dev)
  - Verify: auto-detect cloud vs localhost đã hoạt động đúng
- **Bàn giao:** APK release file + `.env.production` configured

#### [NEW] Task 12: `[P5-PROD.01] Production Readiness Checklist`
- **Giai đoạn:** P5 — Kiểm thử & Đánh giá
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Cả hai
- **Mô tả:** Checklist đầy đủ cho app chuẩn production (free tier):
  - ✅ HTTPS (Render auto), ✅ RLS (Supabase), ✅ JWT Auth
  - ✅ Error handling + crash recovery
  - ✅ Input validation (backend + mobile)
  - ✅ Rate limiting (Gemini API)
  - ✅ Health checks (backend + AI)
  - ✅ Logging & monitoring
  - ✅ Data backup strategy (Supabase auto-backup)
  - ✅ Privacy policy + Terms of Service
  - ✅ i18n (Vietnamese)
  - ⬜ App Store listing (nếu có thời gian)
- **Bàn giao:** `docs/18_PRODUCTION_READINESS_CHECKLIST.md`

---

### D. NHÓM 4 — Task mới cho Báo cáo & Bảo vệ (CLO3)

---

#### [NEW] Task 13: `[P6-SLIDE.01] Slide Bảo vệ — Cấu trúc CLO-aligned`
- **Giai đoạn:** P6 — Báo cáo & Bảo vệ
- **Ưu tiên:** P0 (Critical)
- **Người thực hiện:** Cả hai
- **Map:** CLO3 → Tiêu chí 7 "Phương tiện trình bày" (mức TỐT: 1đ)
- **Mô tả:**
  - Slide chuyên nghiệp, có cấu trúc logic rõ ràng
  - Bắt buộc: diagram kiến trúc hệ thống, demo video, YOLO benchmark chart
  - Dùng hình ảnh/video thực tế từ app (không placeholder)
  - Mỗi slide ≤ 10 dòng text, ưu tiên visual
  - Cấu trúc đề xuất:
    1. Bối cảnh & Vấn đề (thị trường HealthTech)
    2. Giải pháp EatFitAI (USP)
    3. Kiến trúc hệ thống (Cloud architecture diagram)
    4. Demo AI: YOLOv8 → YOLO11 benchmark
    5. Demo App: Live cloud deployment
    6. Kết quả & Đánh giá
    7. Bài học & Roadmap
- **Bàn giao:** File slide (.pptx/.pdf) + demo video embedded

#### [NEW] Task 14: `[P6-QA.01] Chuẩn bị Q&A Hội đồng`
- **Giai đoạn:** P6 — Báo cáo & Bảo vệ
- **Ưu tiên:** P1 (High)
- **Người thực hiện:** Cả hai
- **Map:** CLO3 → Tiêu chí 8 "Khả năng thuyết trình" (mức TỐT: 1đ)
- **Mô tả:**
  - Soạn ≥ 20 câu hỏi dự kiến từ Hội đồng + câu trả lời
  - Các chủ đề: Tại sao chọn YOLO? So sánh với CNN thuần? Gemini vs local LLM? Free tier production viability? Scale strategy?
  - Rehearsal ≥ 2 lần trước bảo vệ
- **Bàn giao:** Document Q&A + evidence rehearsal

#### [NEW] Task 15: `[P6-DOC.02] Data Migration & Deployment Evidence`
- **Giai đoạn:** P6 — Báo cáo & Bảo vệ
- **Ưu tiên:** P1 (High)
- **Người thực hiện:** Đinh Công Hiếu
- **Mô tả:**
  - Screenshot Render dashboard (2 services running)
  - Screenshot Supabase dashboard (tables, data counts, RLS status)
  - Performance metrics: API response time, AI inference time on cloud
  - Evidence: 57 users, 1,230 meal diaries, 581 AI logs
- **Bàn giao:** Folder screenshots + metrics report cho phụ lục báo cáo

---

### E. NHÓM 5 — Cập nhật Task Hiện Có

| # | Task Code | Hành động | Chi tiết |
|---|---|---|---|
| 1 | `P4-AI.05` | **Cập nhật deliverable** | Thêm "Enable RLS cho AiCorrectionEvent" vào sản phẩm bàn giao (liên kết P3-CLOUD.02) |
| 2 | `P4-AI.06` | **Đổi scope** | Từ "PhoWhisper STT Integration" → "Gemini STT/Multimodal Integration" (production dùng Gemini, không dùng PhoWhisper) |
| 3 | `P4-FE.05` | **Đổi scope** | Từ "Parser Hybrid Rule-first" → "Gemini-based Smart Parser" (Gemini API xử lý parsing trực tiếp) |
| 4 | `P4-FE.10` | **Cập nhật notes** | Thêm note: "BLOCKED — STT disabled on cloud (ENABLE_STT=false). Depends on P4-AI.06 completion." |
| 5 | `P4-AI.08` | **Cập nhật notes** | Thêm note: "BLOCKED — STT disabled on cloud. Re-evaluate after P4-AI.06." |
| 6 | `P5-02` | **Cập nhật deliverable** | Thêm "UAT phải test trên cloud endpoints thật, không chỉ emulator localhost" |
| 7 | `P5-03` | **Cập nhật deliverable** | Tách: "Test scan (cloud OK) vs Test voice (BLOCKED — STT off)" |
| 8 | `P5-04` | **Cập nhật prerequisite** | "Rehearsal phải demo trên cloud endpoints. Cần P5-CLOUD.01 và P5-CLOUD.02 hoàn thành trước." |

---

## Rubric Coverage Map

Bảng đối chiếu đảm bảo **100% coverage** cho tất cả tiêu chí rubric:

| CLO | Tiêu chí | Điểm tối đa | Task đảm bảo đạt "Tốt" | Evidence |
|---|---|---|---|---|
| CLO1.1 | Tìm hiểu Doanh nghiệp | 2đ | `P1-DOC.01` | Phân tích thị trường, SWOT, đối thủ |
| CLO1.2 | Nhiệm vụ được giao | 2đ | `P1-DOC.02` | Sprint timeline, task board, burndown |
| CLO1.3 | Học hỏi chuyên môn | 2đ | `P6-DOC.01` + `P4-AI.10` + `P4-AI.12` | Skills matrix, YOLO research, scientific evaluation |
| CLO1.4 | Nhận thức sau thực tập | 2đ | `P6-DOC.01` | Roadmap: YOLO11, scaling, revenue model |
| CLO3.7 | Phương tiện trình bày | 1đ | `P6-SLIDE.01` | Slide pro, architecture diagram, demo video |
| CLO3.8 | Khả năng thuyết trình | 1đ | `P6-QA.01` | Q&A prep, rehearsal evidence |

**Tổng CLO1 + CLO3 = 10 điểm → Mục tiêu: ≥ 8.5/10 (Hội đồng chấm)**

---

## Open Questions

> [!IMPORTANT]
> **Voice/STT Decision:** STT hiện bị disable trên cloud (`ENABLE_STT=false`). Bạn muốn:
> - **(A)** Enable STT trên cloud (cần thêm RAM/CPU trên Render → có thể phải upgrade plan) 
> - **(B)** Giữ STT off, scope out các task Voice cho bảo vệ, focus vào Scan + Text input
> - **(C)** Dùng Gemini cho STT (nhẹ hơn, nhưng cần implement)
> 
> → Quyết định này ảnh hưởng trực tiếp đến 3 task: P4-AI.06, P4-AI.08, P4-FE.10

> [!IMPORTANT]
> **YOLO11 Timing:** Bạn muốn:
> - **(A)** Research + Benchmark ngay (trước bảo vệ) → có kết quả so sánh cho báo cáo
> - **(B)** Research only (benchmark trên giấy) + migrate sau bảo vệ
> - **(C)** Full migration trước bảo vệ (rủi ro cao nếu model kém hơn)
> 
> → Đề xuất: **(A)** — Research + Benchmark để có evidence học thuật, giữ YOLOv8 production

---

## Verification Plan

### Automated Tests
```bash
# Verify tất cả task đã được tạo trên Notion
# Query database sau khi tạo xong → đếm total tasks
# Expected: 53 (hiện có) + 15 (mới) = 68 tasks

# Verify RLS fix
# Chạy Supabase security advisor → 0 errors
```

### Manual Verification
- Kiểm tra trực tiếp trên Notion board: tất cả 15 task mới xuất hiện đúng giai đoạn, đúng ưu tiên
- Kiểm tra 8 task cập nhật: scope/notes/deliverables đã thay đổi
- Cross-check rubric coverage map: mỗi tiêu chí có ≥ 1 task tương ứng
