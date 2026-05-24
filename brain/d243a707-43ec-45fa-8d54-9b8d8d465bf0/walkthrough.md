# 📝 Walkthrough — EatFitAI Notion Task Update

## Tổng quan

Đã hoàn thành **23 thao tác** trên Notion database `📋 EatFitAI - Task Management`:
- ✅ **15 task mới** đã tạo thành công
- ✅ **8 task hiện có** đã cập nhật scope/deliverables

---

## Phase 1: 15 Task Mới Đã Tạo

### Nhóm Rubric (CLO1 + CLO3)
| # | Task Code | Tên | Giai đoạn | Ưu tiên |
|---|-----------|-----|-----------|---------|
| 1 | `P1-DOC.01` | Khảo sát & Phân tích Bối cảnh Khởi nghiệp HealthTech | P1 | P0 |
| 2 | `P1-DOC.02` | Tài liệu Quy trình Phát triển & Phương pháp luận | P1 | P0 |
| 3 | `P6-DOC.01` | Bài học Chuyên môn & Roadmap Phát triển Cá nhân | P6 | P0 |

### Nhóm YOLO11 Research
| # | Task Code | Tên | Giai đoạn | Ưu tiên |
|---|-----------|-----|-----------|---------|
| 4 | `P4-AI.10` | Nghiên cứu So sánh YOLOv8 vs YOLO11 | P4 | P0 |
| 5 | `P4-AI.11` | Migration Path: YOLOv8 → YOLO11 | P4 | P1 |
| 6 | `P4-AI.12` | Test Set Evaluation & Scientific Report | P4 | P0 |

### Nhóm Production Readiness
| # | Task Code | Tên | Giai đoạn | Ưu tiên | Status |
|---|-----------|-----|-----------|---------|--------|
| 7 | `P3-CLOUD.01` | Cloud Infrastructure Documentation | P3 | P0 | ✅ Done |
| 8 | `P3-CLOUD.02` | Fix RLS — AiCorrectionEvent Security | P3 | P0 | 📋 |
| 9 | `P3-CLOUD.03` | Cold Start & Health Monitoring | P3 | P1 | 📋 |
| 10 | `P5-CLOUD.01` | E2E Cloud Smoke Test | P5 | P0 | 📋 |
| 11 | `P5-CLOUD.02` | Mobile Production Build & URL Config | P5 | P0 | 📋 |
| 12 | `P5-PROD.01` | Production Readiness Checklist | P5 | P0 | 📋 |

### Nhóm Báo cáo & Bảo vệ
| # | Task Code | Tên | Giai đoạn | Ưu tiên |
|---|-----------|-----|-----------|---------|
| 13 | `P6-SLIDE.01` | Slide Bảo vệ — Cấu trúc CLO-aligned | P6 | P0 |
| 14 | `P6-QA.01` | Chuẩn bị Q&A Hội đồng | P6 | P1 |
| 15 | `P6-DOC.02` | Data Migration & Deployment Evidence | P6 | P1 |

---

## Phase 2: 8 Task Đã Cập Nhật

| Task Code | Thay đổi | Chi tiết |
|-----------|----------|----------|
| `P4-AI.05` | Thêm deliverable | + "Enable RLS cho AiCorrectionEvent (liên kết P3-CLOUD.02)" |
| `P4-AI.06` | **Đổi scope** | PhoWhisper → **Gemini STT/Multimodal Integration** |
| `P4-FE.05` | **Đổi scope** | Parser Hybrid Rule-first → **Gemini-based Smart Parser** |
| `P4-FE.10` | Thêm BLOCKED note | ⚠️ STT disabled on cloud. Depends on P4-AI.06 |
| `P4-AI.08` | Thêm BLOCKED note | ⚠️ STT disabled on cloud. Re-evaluate after P4-AI.06 |
| `P5-02` | Thêm cloud UAT | ⚠️ UAT PHẢI test trên cloud endpoints thật (Render) |
| `P5-03` | Tách test | TÁCH: Test scan (cloud OK ✅) vs Test voice (BLOCKED ⛔) |
| `P5-04` | Thêm prerequisite | PHẢI demo trên cloud. Cần P5-CLOUD.01 + P5-CLOUD.02 trước |

---

## Rubric Coverage Verification

| CLO | Tiêu chí | Điểm | Task chính | Trạng thái |
|-----|----------|------|-----------|------------|
| CLO1.1 | Tìm hiểu Doanh nghiệp | 2đ | `P1-DOC.01` | ✅ Task tạo |
| CLO1.2 | Nhiệm vụ được giao | 2đ | `P1-DOC.02` | ✅ Task tạo |
| CLO1.3 | Học hỏi chuyên môn | 2đ | `P6-DOC.01` + `P4-AI.10` | ✅ Task tạo |
| CLO1.4 | Nhận thức sau thực tập | 2đ | `P6-DOC.01` | ✅ Task tạo |
| CLO3.7 | Phương tiện trình bày | 1đ | `P6-SLIDE.01` | ✅ Task tạo |
| CLO3.8 | Khả năng thuyết trình | 1đ | `P6-QA.01` | ✅ Task tạo |

**→ 100% coverage cho CLO1 (8đ) + CLO3 (2đ) = 10 điểm**

---

## Tổng hợp Database Sau Cập Nhật

- **Tổng task dự kiến:** 53 (cũ) + 15 (mới) = **68 tasks**
- **Security fix pending:** `AiCorrectionEvent` RLS (task P3-CLOUD.02)
- **Blocked tasks:** P4-FE.10, P4-AI.08 (chờ STT enable)

---

## Next Steps Đề Xuất (Thứ Tự Ưu Tiên)

1. 🔴 **P3-CLOUD.02** — Fix RLS cho `AiCorrectionEvent` trên Supabase
2. 🔴 **P5-CLOUD.02** — Build APK release trỏ cloud endpoints
3. 🔴 **P5-CLOUD.01** — E2E smoke test trên thiết bị thật
4. 🟡 **P4-AI.10** — Benchmark YOLOv8 vs YOLO11 (evidence học thuật)
5. 🟡 **P3-CLOUD.03** — Setup health monitoring / cold start mitigation
6. 📝 **P1-DOC.01/02** — Viết chương báo cáo (bối cảnh + quy trình)
7. 📝 **P6-SLIDE.01** — Chuẩn bị slide bảo vệ
8. 📝 **P6-QA.01** — Soạn Q&A Hội đồng
