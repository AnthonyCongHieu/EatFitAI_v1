# Chỉ mục tài liệu EatFitAI

Cập nhật: `2026-04-18`

Thư mục `docs/` tập trung các tài liệu kỹ thuật phục vụ phát triển, kiểm thử, và vận hành dự án.

## Tài liệu chính

| File | Mô tả | Khi nào đọc |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Kiến trúc hệ thống mobile, backend, AI provider, database | Cần nắm nhanh topology và boundary |
| [USERFLOW.md](USERFLOW.md) | Bản đồ user flow và màn hình chính | Cần đối chiếu flow UI với backend/API |
| [AI_FLOW.md](AI_FLOW.md) | Luồng AI vision, nutrition, voice, fallback | Cần hiểu lane AI và các điểm trust/risk |
| [SECRETS_SETUP.md](SECRETS_SETUP.md) | Quản lý secrets cho tất cả runtime (backend, mobile, AI, admin) | Cần setup secrets cho máy mới hoặc deploy |
| [AUTH_AND_INFRA.md](AUTH_AND_INFRA.md) | Xác thực (Google, email, forgot-password) và hạ tầng triển khai | Cần đối chiếu auth hoặc fix infra |
| [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md) | Gate kiểm thử, Maestro suites, runbook thiết bị thật, smoke production | Cần chạy test hoặc chốt release readiness |

## Thư mục phụ

- `archive/` — Các báo cáo lịch sử, evidence bundles, tài liệu đã đưa ra khỏi luồng execution hàng ngày
- `templates/` — Template dùng lại cho rehearsal, UAT, và báo cáo

## Cách dùng

- Dựng môi trường và test app → đọc [SETUP_GUIDE.md](../SETUP_GUIDE.md) ở root trước
- Hiểu hệ thống được xây thế nào → đọc `ARCHITECTURE.md`, `USERFLOW.md`, `AI_FLOW.md`
- Setup secrets cho máy mới → đọc `SECRETS_SETUP.md`
- Vận hành auth hoặc fix infra → đọc `AUTH_AND_INFRA.md`
- Chạy test hoặc chốt release → đọc `TESTING_AND_RELEASE.md`

## Nguyên tắc cập nhật

1. Runtime và database truth ưu tiên hơn cảm giác demo
2. Tài liệu mới phải nói rõ phạm vi và ngày cập nhật
3. Không tạo thêm file trùng mục đích nếu có thể cập nhật vào doc hiện có
4. Toàn bộ docs sử dụng tiếng Việt có dấu
