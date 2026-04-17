# Security Automation Execution Report - 2026-04-16

## Scope

Pass này ghi lại phần triển khai thực tế của automation lane trong:

- `E:\tool edit\eatfitai_v1\tools\security-ops\security_ops.py`
- `E:\tool edit\eatfitai_v1\tools\security-ops\targets.json`

## Những gì đã triển khai vào repo

- Tạo CLI `security_ops.py` cho:
  - `inventory`
  - `verify`
  - `github-enable-security`
  - `rotate`
  - `render-rotate-jwt`
  - `render-rotate-internal-token`
  - `supabase-rotate-db-password`
  - `vercel-inventory`
  - `vercel-upsert-env`
  - `firebase-restrict-android-key`
  - `history-rewrite-plan`
  - `history-rewrite-execute`
- Tạo:
  - `tools/security-ops/.env.example`
  - `tools/security-ops/README.md`
  - `docs/21_SECURITY_LIVE_ROLLOUT_RUNBOOK_2026-04-16.md`
- Bổ sung test JWT previous-key validation trong backend
- Dọn thêm raw provider/detail leaks ở:
  - `AIController.cs`
  - `AdminAIController.cs`
  - `AdminRuntimeController.cs`
- Bổ sung `AIProvider__InternalToken` vào `render.yaml`

## Live actions đã thực hiện

### 1. GitHub secret scanning

Kết quả thực thi:

- `EatFitAI_v1`: `secretScanning=enabled`, `pushProtection=enabled`
- `EatFitAI_Admin`: API trả `422 Secret scanning is not available for this repository`

Kết luận:

- repo chính đã pass lane GitHub
- repo admin hiện đang bị chặn bởi availability của GitHub cho loại repo/gói hiện tại, không phải lỗi script

### 2. Render internal token rotation

Đã chạy:

- generate secret nội bộ mới
- ghi vào backend env `AIProvider__InternalToken`
- ghi vào AI provider env `AI_PROVIDER_INTERNAL_TOKEN`
- trigger deploy cho cả 2 service

Inventory sau mutation xác nhận:

- backend `AIProvider__InternalToken`: `configured`
- AI provider `AI_PROVIDER_INTERNAL_TOKEN`: `configured`
- fingerprint hai phía trùng nhau: `ab3f1c98f25e`

Health check sau deploy:

- `https://eatfitai-backend.onrender.com/health/ready` -> `200`
- `https://eatfitai-ai-provider.onrender.com/healthz` -> `200`

Ghi chú:

- lượt chờ deploy bằng CLI bị timeout ở backend sau `240s`, nhưng health check và inventory sau đó đều xác nhận rollout đã lên ổn

## Live inventory hiện tại

### GitHub

- `EatFitAI_v1`: enabled
- `EatFitAI_Admin`: disabled_or_unavailable

### Render backend

- `ConnectionStrings__DefaultConnection`: configured
- `AIProvider__InternalToken`: configured
- `Jwt__Key`: configured
- `Jwt__PreviousKeys`: missing

### Render AI provider

- `AI_PROVIDER_INTERNAL_TOKEN`: configured
- `GEMINI_API_KEY`: configured

## Test / verify đã chạy

- `python -m py_compile tools/security-ops/security_ops.py`: pass
- `dotnet test EatFitAI.API.Tests.csproj --filter ValidateTokenAsync`: pass `3/3`
- live inventory bằng `security_ops.py inventory`: pass
- live verify bằng `security_ops.py verify`: fail expected do còn blocker chưa có credential / availability

## Blocker còn lại

- Supabase DB password rotation: thiếu `SUPABASE_ACCESS_TOKEN`
- Vercel env inventory/upsert: thiếu `VERCEL_TOKEN`
- Firebase restriction: thiếu `GOOGLE_OAUTH_ACCESS_TOKEN` hoặc `gcloud auth`, và thiếu `FIREBASE_ANDROID_SHA1_RELEASE`
- JWT zero-downtime rotation: chưa có `CURRENT_JWT_KEY`, nên chưa thể set `Jwt__PreviousKeys` một cách an toàn
- Git history rewrite: chưa chạy vì đây là lane phá hủy và nên chỉ chạy sau khi rotate xong secret thật

## Khuyến nghị bước tiếp theo

1. Cấp `SUPABASE_ACCESS_TOKEN`
2. Cấp `VERCEL_TOKEN`
3. Cấp Google access token/session và `FIREBASE_ANDROID_SHA1_RELEASE`
4. Cung cấp `CURRENT_JWT_KEY` nếu muốn zero-downtime JWT rotation; nếu không thì chốt rõ có chấp nhận force logout hay không
