# 🔍 EatFitAI — Rà Soát Task Notion vs Hiện Trạng Cloud/Production

**Ngày rà soát:** 2026-04-10
**Người rà soát:** Antigravity (AI Audit)

---

## 1. Tổng Quan Task Hiện Có

Tổng cộng **53 task** trong database Notion `📋 EatFitAI - Task Management`, phân bố qua 6 giai đoạn:

| Giai đoạn | Tổng | ✅ Hoàn thành | 🔄 Đang thực hiện | 📋 Chưa bắt đầu | 👀 Đang review |
|---|---|---|---|---|---|
| P1 — Khảo sát & Phân tích | 6 | 0 | 0 | 5 | 1 |
| P2 — Thiết kế Hệ thống | 4 | 0 | 0 | 4 | 0 |
| P3 — Ổn định Nền tảng | 14 | 12 | 0 | 2 | 0 |
| P4 — Nâng cấp AI & Pro | 17 | 4 | 1 | 12 | 0 |
| P5 — Kiểm thử & Đánh giá | 9 | 2 | 3 | 2 | 1 |
| P6 — Báo cáo & Bảo vệ | 8 | 0 | 0 | 8 | 0 |

---

## 2. Hiện Trạng Production / Cloud

### 2.1 Supabase (Database — `bjlmndmafrajjysenpbm`)
- **Trạng thái:** `ACTIVE_HEALTHY` ✅
- **Region:** `ap-southeast-1` (Singapore)
- **22 bảng** trong schema `public`, tất cả có RLS enabled **NGOẠI TRỪ `AiCorrectionEvent`** ⚠️
- **Dữ liệu thực:**
  - Users: 57 | MealDiary: 1,230 | AILog: 581 | BodyMetric: 77
  - FoodItem: 73 | NutritionTarget: 85 | UserFoodItem: 35

### 2.2 Render.com (Backend & AI Provider)
- **Backend:** .NET 9 Docker (Alpine), port 10000, health check `/health/ready`
- **AI Provider:** Python 3.11 + YOLO + Gemini, port 5050, health check `/healthz`
- **Cả hai đều dùng plan `free`** → cold start, auto-sleep, RAM/CPU giới hạn

### 2.3 Cấu hình Environment
- Backend kết nối Supabase Storage (buckets: `food-images`, `user-food`)
- AI Provider dùng `gemini-2.5-flash` + key pool
- **STT đã bị TẮT** (`ENABLE_STT=false`) trên production

---

## 3. 🚨 CRITICAL GAPS — Task Thiếu So Với Thực Tế

> [!CAUTION]
> Những lỗ hổng nghiêm trọng giữa task Notion và hiện trạng thực tế

### GAP-1: KHÔNG CÓ TASK "Cloud Migration / Deployment"
**Nghiêm trọng nhất.** Toàn bộ Notion không có task nào cover việc:
- Containerize backend + AI provider (Dockerfile)
- Deploy lên Render.com
- Migrate SQL Server → PostgreSQL/Supabase
- Cấu hình `render.yaml`, env vars, Supabase buckets
- Data migration (đã thực hiện xong trong conversation history)

→ Công việc đã làm **KHÔNG được track** trong hệ thống quản lý.

### GAP-2: `AiCorrectionEvent` thiếu RLS
- Table `AiCorrectionEvent` (`rls_enabled: false`) là **lỗ hổng bảo mật** trên production
- Task `P4-AI.05` (Active Learning Correction API) đánh dấu ✅ Hoàn thành nhưng **chưa bật RLS**

### GAP-3: STT/Voice bị disable trên cloud
- `ENABLE_STT=false` trong `render.yaml`
- Nhưng có hàng loạt task P4 liên quan Voice: `P4-FE.10`, `P4-AI.06`, `P4-AI.08`
- Task `P5-03` (AI Regression) ghi blocker: "voice ADD_FOOD trên cloud"
- → Voice **KHÔNG HOẠT ĐỘNG** trên production, các task Voice cần đánh giá lại scope

### GAP-4: Free tier limitations không được document
- Render free tier: **auto-sleep sau 15 phút idle**, cold start ~30-60s
- Supabase free tier: giới hạn connections, storage, bandwidth
- Không có task nào về monitoring, alerting, uptime SLA

---

## 4. 📊 Đánh Giá Chi Tiết Từng Nhóm Task

### P3 — Ổn định Nền tảng (14 task, 12 done)

| Task | Trạng thái | Đánh giá Cloud |
|---|---|---|
| P3-BE.01 Fix xUnit Test | ✅ | OK — test infra chuẩn |
| P3-BE.02 Google Auth + JWT | ❌ Chưa bắt đầu | ⚠️ **PHẢI LÀM** trước khi UAT trên cloud. JWT config đã có trong render.yaml nhưng task chưa done |
| P3-BE.03 Backend Proxy Voice | ✅ | OK nhưng STT off trên cloud |
| P3-BE.04 Dọn Secrets | ✅ | OK — 0 secret trong code |
| P3-BE.05 DB Migration + Index | ✅ | ⚠️ Cần re-verify index trên PostgreSQL (gốc từ SQL Server) |
| P3-BE.06 API Validate | ✅ | OK |
| P3-BE.07 Food Search | ✅ (archived) | OK |
| P3-FE.01 Fix TypeScript | ❌ Chưa bắt đầu | ⚠️ Critical cho quality — nên làm |
| P3-FE.02 Google Login Mobile | ❌ Chưa bắt đầu | ⚠️ **CẦN config Google OAuth credentials cho production domain** |
| P3-FE.03-10 | ✅ (đã archived) | OK |

### P4 — Nâng cấp AI & Pro (17 task, chỉ 4 done)

| Task | Trạng thái | Đánh giá Cloud |
|---|---|---|
| P4-AI.01 Structured JSON | ❌ | ⚠️ Gemini 2.5 Flash hỗ trợ structured output natively → scope thay đổi |
| P4-AI.02 Health State Machine | ✅ | OK |
| P4-AI.03 Benchmark YOLO | 🔄 Đang thực hiện | OK — cần chạy trên cloud data |
| P4-AI.04 Data Pipeline | ❌ | OK để backlog |
| P4-AI.05 Correction API | ✅ | ⚠️ **RLS chưa bật** → cần fix ngay |
| P4-AI.06 PhoWhisper STT | ❌ | ⚠️ **THAY ĐỔI SCOPE**: Production dùng Gemini STT, không dùng PhoWhisper |
| P4-AI.07 Giải thích AI | ❌ | OK để backlog |
| P4-AI.08 Voice Quality Gate | ❌ | ⚠️ Phụ thuộc STT enable → blocked |
| P4-FE.01 Confidence-gated | ❌ | OK — nên làm |
| P4-FE.02 Profile + Avatar | ❌ | ⚠️ Avatar upload cần verify với Supabase Storage |
| P4-FE.05 Parser Hybrid | ❌ | ⚠️ Scope thay đổi — Gemini API xử lý parsing |
| P4-FE.06 Onboarding Fallback | ✅ | OK |
| P4-FE.10 Voice UX | ❌ | ⚠️ Blocked — STT off |
| P4-FE.11 Scan Review | ✅ | OK |
| P4-FE.12 Recent Meals | ❌ | OK — nên làm |

### P5 — Kiểm thử & Đánh giá (9 task)

| Task | Trạng thái | Đánh giá Cloud |
|---|---|---|
| P5-01 Thu thập ảnh | ❌ | OK backlog |
| P5-02 Test Cases + UAT | 🔄 | ⚠️ **CẦN test trên cloud thật**, không chỉ emulator local |
| P5-03 AI Regression | 🔄 | ⚠️ Ghi nhận blocker voice → cần decouple test voice và test scan |
| P5-04 Rehearsal Demo | 🔄 | ⚠️ Demo phải chạy trên cloud, không phải localhost |
| P5-05 Seed Data Demo | ✅ | ⚠️ Seed data cần verify trên Supabase production |
| P5-09 Critical Metrics | ✅ | OK |

---

## 5. 🆕 ĐỀ XUẤT TASK MỚI CẦN BỔ SUNG

> [!IMPORTANT]
> Các task dưới đây THIẾU trong Notion và cần thêm ngay

### Task mới 1: `[P3-CLOUD.01] Cloud Deployment Documentation & Track`
- **Ưu tiên:** P0 (Critical)
- **Giai đoạn:** P3
- **Mô tả:** Document toàn bộ infrastructure đã deploy: Render.com services, Supabase project, env vars, Docker config, data migration. Retroactive tracking cho công việc đã làm.
- **Bàn giao:** README deployment section + architecture diagram phản ánh cloud thực tế

### Task mới 2: `[P3-CLOUD.02] Fix RLS trên AiCorrectionEvent`
- **Ưu tiên:** P0 (Critical)
- **Giai đoạn:** P3
- **Mô tả:** Enable RLS + tạo policy cho table `AiCorrectionEvent`. Hiện tại là lỗ hổng bảo mật duy nhất.
- **Bàn giao:** RLS enabled, Supabase security advisor 0 error

### Task mới 3: `[P5-CLOUD.01] E2E Smoke Test trên Cloud Production`
- **Ưu tiên:** P0 (Critical)
- **Giai đoạn:** P5
- **Mô tả:** Chạy full E2E test: Register → Onboarding → Search Food → Add Diary → Scan → View Reports, tất cả trên cloud endpoints thật (không phải localhost).
- **Bàn giao:** Script `start-mobile-cloud-smoke.ps1` pass + evidence screenshots

### Task mới 4: `[P3-CLOUD.03] Cold Start Mitigation & Monitoring`
- **Ưu tiên:** P1 (High)
- **Giai đoạn:** P3
- **Mô tả:** Giải pháp cho cold start (cron ping, Render always-on check), setup basic health monitoring.
- **Bàn giao:** Uptime check configured, cold start < 15s

### Task mới 5: `[P4-CLOUD.01] Supabase Storage Integration Test`
- **Ưu tiên:** P1 (High)
- **Giai đoạn:** P4
- **Mô tả:** Verify avatar upload, food image upload với Supabase Storage buckets trên cloud. Liên quan task P4-FE.02.
- **Bàn giao:** Upload/download ảnh qua API thành công trên cloud

### Task mới 6: `[P4-AI.09] Gemini API Rate Limiting & Cost Control`
- **Ưu tiên:** P1 (High)
- **Giai đoạn:** P4
- **Mô tả:** Monitor Gemini API usage, implement rate limiting per user, cost projection cho production traffic. Key pool đã có nhưng chưa có giám sát.
- **Bàn giao:** Rate limit middleware + usage dashboard/log

### Task mới 7: `[P5-CLOUD.02] Mobile App Cloud Base URL Configuration`
- **Ưu tiên:** P0 (Critical)
- **Giai đoạn:** P5
- **Mô tả:** Đảm bảo mobile app có build config (flavor/variant) cho production cloud URLs vs development localhost. APK release phải trỏ đúng cloud.
- **Bàn giao:** Build variant `release` trỏ Render URLs, debug trỏ localhost

---

## 6. 📝 ĐỀ XUẤT CẬP NHẬT TASK HIỆN CÓ

| Task Code | Hành động | Lý do |
|---|---|---|
| `P4-AI.05` | Thêm subtask "Enable RLS" | RLS chưa bật → security hole |
| `P4-AI.06` | **Thay đổi scope** → "Gemini STT Integration" | Production không dùng PhoWhisper, dùng Gemini |
| `P4-AI.08` | Đánh dấu **BLOCKED** | STT off trên cloud |
| `P4-FE.05` | **Thay đổi scope** → "Gemini-based Parser" | Hybrid rule-first không phù hợp, Gemini xử lý trực tiếp |
| `P4-FE.10` | Đánh dấu **BLOCKED** | STT off trên cloud |
| `P3-BE.02` | Kiểm tra lại trạng thái | JWT config có trong render.yaml nhưng task "Chưa bắt đầu" → có thể đã implement rồi? |
| `P3-FE.02` | Thêm subtask "Cloud OAuth Config" | Google Login cần credentials match production domain |
| `P5-02` | Cập nhật deliverable | Cần UAT **trên cloud endpoints**, không chỉ emulator local |
| `P5-03` | Split thành 2 sub-task | Tách test ảnh (cloud OK) vs test voice (blocked) |
| `P5-04` | Cập nhật prerequisite | Rehearsal phải chạy trên cloud, cần cloud endpoints sẵn sàng |
| `P5-05` | Verify seed data trên Supabase | Seed data cũ cho SQL Server, cần verify trên PostgreSQL |
| `P5-06` | Thêm section "Cloud Limitations" | Hạn chế free tier, cold start, STT disabled cần document |

---

## 7. Tóm Tắt Rủi Ro

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| RLS disabled trên `AiCorrectionEvent` | 🔴 Critical | Task mới P3-CLOUD.02 |
| Không track deployment work | 🔴 Critical | Task mới P3-CLOUD.01 |
| Voice/STT off trên production | 🟡 High | Quyết định: enable hay scope out cho bảo vệ? |
| Cold start 30-60s trên Render free | 🟡 High | Task mới P3-CLOUD.03 |
| Mobile chưa verify Cloud URLs | 🔴 Critical | Task mới P5-CLOUD.02 |
| Nhiều task P1/P2 "Chưa bắt đầu" (SRS, Diagram) | 🟡 Medium | Ưu tiên cho P6 Báo cáo |
| Gemini API cost không kiểm soát | 🟡 Medium | Task mới P4-AI.09 |

---

> [!NOTE]
> Tổng cộng đề xuất: **7 task mới** + **12 task cần cập nhật**. Ưu tiên cao nhất là fix RLS, document cloud deployment, và verify E2E trên cloud.
