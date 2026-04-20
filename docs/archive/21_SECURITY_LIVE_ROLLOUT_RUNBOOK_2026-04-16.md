# Security Live Rollout Runbook - 2026-04-16

## Scope

Runbook này là pass triển khai tự động hóa cho:

- GitHub secret scanning + push protection
- Rotate `Jwt__Key` trên Render với `Jwt__PreviousKeys`
- Rotate shared internal token giữa backend và AI provider trên Render
- Rotate Supabase DB password và đồng bộ lại Render
- Firebase Android API key restriction
- Plan lane scrub git history sau rotate

CLI trung tâm nằm tại:

- `E:\tool edit\eatfitai_v1\tools\security-ops\security_ops.py`

Target inventory được khóa tại:

- `E:\tool edit\eatfitai_v1\tools\security-ops\targets.json`

## Những gì đã được tự động hóa

### 1. Inventory + verify

CLI hiện hỗ trợ inventory đồng thời cho:

- GitHub
- Render
- Supabase
- Vercel
- Firebase / Google API Keys

Lệnh:

```powershell
python tools/security-ops/security_ops.py inventory
python tools/security-ops/security_ops.py verify
```

### 2. GitHub security settings

CLI hỗ trợ:

```powershell
python tools/security-ops/security_ops.py github-enable-security
```

Hành vi:

- lấy `GITHUB_TOKEN` từ env hoặc `git credential`
- bật `secret_scanning`
- bật `secret_scanning_push_protection`
- verify lại từng repo sau mutation

### 3. JWT rotation trên Render

CLI hỗ trợ:

```powershell
python tools/security-ops/security_ops.py render-rotate-jwt --wait
```

Safe default:

- nếu không đọc được current live key và không có `CURRENT_JWT_KEY`, lệnh sẽ block thay vì force logout âm thầm
- muốn bỏ grace window phải truyền `--force-logout`

### 4. Supabase DB password rotation

CLI hỗ trợ:

```powershell
python tools/security-ops/security_ops.py supabase-rotate-db-password --wait
```

Safe default:

- chỉ rotate sau khi đọc được connection string hiện tại từ Render
- patch password ở Supabase trước
- cập nhật ngay `ConnectionStrings__DefaultConnection` trên Render
- trigger deploy backend

### 5. Shared internal token rotation

CLI hỗ trợ:

```powershell
python tools/security-ops/security_ops.py render-rotate-internal-token --wait
```

Hành vi:

- generate một secret mới
- ghi vào `AIProvider__InternalToken` trên backend Render
- ghi vào `AI_PROVIDER_INTERNAL_TOKEN` trên AI provider Render
- redeploy cả hai service

### 6. Firebase restriction

CLI hỗ trợ:

```powershell
python tools/security-ops/security_ops.py firebase-restrict-android-key
```

Yêu cầu:

- `GOOGLE_OAUTH_ACCESS_TOKEN` hoặc session `gcloud auth`
- `FIREBASE_ANDROID_SHA1_RELEASE`
- optional `FIREBASE_ANDROID_SHA1_DEBUG`
- optional `FIREBASE_API_TARGETS`

### 7. History rewrite planning

CLI hỗ trợ:

```powershell
python tools/security-ops/security_ops.py history-rewrite-plan
```

Và có lane execute riêng:

```powershell
python tools/security-ops/security_ops.py history-rewrite-execute --repo EatFitAI_v1 --mirror-dir <path> --confirm-rewrite-history
```

Lane này vẫn tách khỏi rollout chính vì:

- rewrite history là thao tác phá hủy
- cần maintenance window
- không nên chạy trước khi rotate xong secret thật

## Trạng thái rollout tại thời điểm tạo runbook

### Đã làm trong code

- Thêm JWT key-ring support để validate `Jwt__PreviousKeys`
- Gỡ hardcoded dev secret khỏi `start-backend.ps1`
- Dọn thêm response leak ở:
  - `AIController.cs`
  - `AdminAIController.cs`
  - `AdminRuntimeController.cs`
- Bổ sung test xác nhận token cũ vẫn hợp lệ nếu nằm trong `Jwt:PreviousKeys`

### Đã sẵn sàng để chạy live ngay

- GitHub enable/verify
- Render inventory
- Shared internal token rotation
- History rewrite planning

### Còn block bởi credential/session ngoài repo

- Supabase DB password rotation: cần `SUPABASE_ACCESS_TOKEN`
- Vercel env inventory/upsert: cần `VERCEL_TOKEN`
- Firebase restriction: cần Google access token/session và SHA-1 release
- JWT zero-downtime rotation: cần `CURRENT_JWT_KEY` hoặc chấp nhận `--force-logout`
- GitHub secret scanning cho `EatFitAI_Admin`: API đang trả `422 Secret scanning is not available for this repository`

## Lệnh rollout đề xuất

### Bước 1 - Inventory

```powershell
python tools/security-ops/security_ops.py inventory
```

### Bước 2 - GitHub

```powershell
python tools/security-ops/security_ops.py github-enable-security
```

### Bước 3 - JWT

```powershell
$env:CURRENT_JWT_KEY="..."
python tools/security-ops/security_ops.py render-rotate-jwt --wait
```

### Bước 4 - Internal token

```powershell
python tools/security-ops/security_ops.py render-rotate-internal-token --wait
```

### Bước 5 - DB password

```powershell
$env:SUPABASE_ACCESS_TOKEN="..."
python tools/security-ops/security_ops.py supabase-rotate-db-password --wait
```

### Bước 6 - Firebase restriction

```powershell
$env:GOOGLE_OAUTH_ACCESS_TOKEN="..."
$env:FIREBASE_ANDROID_SHA1_RELEASE="AA:BB:CC:..."
python tools/security-ops/security_ops.py firebase-restrict-android-key
```

### Bước 7 - Verify

```powershell
python tools/security-ops/security_ops.py verify
```

### Bước 8 - History rewrite

```powershell
python tools/security-ops/security_ops.py history-rewrite-plan
```

Chỉ chạy execute sau khi:

- secret thật đã rotate xong
- team đã chốt maintenance window
- clone cũ đã được thông báo sẽ phải re-clone
