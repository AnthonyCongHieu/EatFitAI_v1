# Chỉ mục tài liệu EatFitAI

Cập nhật: `2026-04-26`

Thư mục `docs/` tập trung các tài liệu kỹ thuật phục vụ phát triển, kiểm thử, và vận hành dự án.

## Tài liệu chính

| File | Mô tả | Khi nào đọc |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc hệ thống mobile, backend, AI provider, database | Cần nắm nhanh topology và boundary |
| [USERFLOW.md](USERFLOW.md) | Bản đồ user flow và màn hình chính | Cần đối chiếu flow UI với backend/API |
| [AI_FLOW.md](AI_FLOW.md) | Luồng AI vision, nutrition, voice, fallback | Cần hiểu lane AI và các điểm trust/risk |
| [SECRETS_SETUP.md](SECRETS_SETUP.md) | Quản lý secrets cho tất cả runtime (backend, mobile, AI, admin) | Cần setup secrets cho máy mới hoặc deploy |
| [AUTH_AND_INFRA.md](AUTH_AND_INFRA.md) | Xác thực (Google, email, forgot-password) và hạ tầng triển khai | Cần đối chiếu auth hoặc fix infra |
| [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md) | Gate kiểm thử, ADB/UIAutomator/scrcpy runbook thiết bị thật, smoke production, keep-alive strategy | Cần chạy test hoặc chốt release readiness |
| [STABILIZATION_PLAN.md](STABILIZATION_PLAN.md) | Kế hoạch ổn định tổng thể, audit code, quyết định kỹ thuật, phụ lục ops | Cần tra cứu quyết định kiến trúc hoặc ops |
| [19_SECURITY_AUDIT_BASELINE_2026-04-16.md](19_SECURITY_AUDIT_BASELINE_2026-04-16.md) | Baseline security audit — findings và evidence | Cần đối chiếu bảo mật hoặc remediation |
| [20_SECURITY_REMEDIATION_REPORT_2026-04-16.md](20_SECURITY_REMEDIATION_REPORT_2026-04-16.md) | Báo cáo remediation đã thực hiện | Xem lại những gì đã sửa và còn tồn đọng |
| [21_PRODUCT_CHECKLIST_2026-04-19.md](21_PRODUCT_CHECKLIST_2026-04-19.md) | Checklist sản phẩm, benchmark, roadmap tính năng | Cần đánh giá tiến độ hoặc ưu tiên feature |
| [23_QA_FULL_APP_AUDIT_2026-04-25.md](23_QA_FULL_APP_AUDIT_2026-04-25.md) | QA audit toàn app: inventory, evidence matrix, AI scorecards, UI backlog, cleanup log, release recommendation | Cần chốt tình trạng QA/release gate ngày 2026-04-25 |
| [24_TOKEN_SAVING_TOOLS_ASSESSMENT_2026-04-25.md](24_TOKEN_SAVING_TOOLS_ASSESSMENT_2026-04-25.md) | Đánh giá Serena, RTK, Context Mode và các repo tiết kiệm token cho workflow Codex/EatFitAI | Cần quyết định có nên cài tool giảm token/context hay không |
| [25_TOKEN_TOOLING_PILOT_RESULTS_2026-04-25.md](25_TOKEN_TOOLING_PILOT_RESULTS_2026-04-25.md) | Kết quả setup/pilot Serena, RTK, Codebase-Memory trên Windows cho EatFitAI | Cần xem tool nào giữ, pilot, defer hoặc rollback |
| [26_RC_STABILIZATION_REPORT_2026-04-25.md](26_RC_STABILIZATION_REPORT_2026-04-25.md) | Báo cáo RC Phase 2 với evidence thật: code gates pass, Android/cloud/auth blockers, AI benchmark, UI backlog | Cần quyết định unblock seed/auth/deploy trước khi chốt internal RC |
| [27_RC_CLOUD_RUNBOOK_2026-04-26.md](27_RC_CLOUD_RUNBOOK_2026-04-26.md) | Runbook cloud RC đã khóa: deploy backend/AI provider, Render verify, warm-up AI provider, smoke preflight/auth/user/AI tuần tự | Cần chạy lại cloud RC gate hoặc chuẩn bị demo/release smoke |

## Thư mục phụ

- `archive/` — Các báo cáo lịch sử, evidence bundles, tài liệu đã đưa ra khỏi luồng execution hàng ngày
- `templates/` — Template dùng lại cho rehearsal, UAT, và báo cáo

## Cách dùng

- Dựng môi trường và test app → đọc [SETUP_GUIDE.md](../SETUP_GUIDE.md) ở root trước
- Hiểu hệ thống được xây thế nào → đọc `ARCHITECTURE.md`, `USERFLOW.md`, `AI_FLOW.md`
- Setup secrets cho máy mới → đọc `SECRETS_SETUP.md`
- Vận hành auth hoặc fix infra → đọc `AUTH_AND_INFRA.md`
- Chạy test hoặc chốt release → đọc `TESTING_AND_RELEASE.md`
- Chạy cloud RC sau deploy → đọc `27_RC_CLOUD_RUNBOOK_2026-04-26.md`

## Nguyên tắc cập nhật

1. Runtime và database truth ưu tiên hơn cảm giác demo
2. Tài liệu mới phải nói rõ phạm vi và ngày cập nhật
3. Không tạo thêm file trùng mục đích nếu có thể cập nhật vào doc hiện có
4. Toàn bộ docs sử dụng tiếng Việt có dấu
