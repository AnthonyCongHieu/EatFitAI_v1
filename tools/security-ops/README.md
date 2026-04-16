# Security Ops

`security_ops.py` là CLI API-first để inventory, rotate và verify rollout bảo mật cho `EatFitAI_v1` và `EatFitAI_Admin`.

## Mục tiêu

- Bật và verify GitHub secret scanning + push protection.
- Inventory trạng thái live của GitHub, Render, Vercel, Supabase và Firebase.
- Rotate an toàn `Jwt__Key` với `Jwt__PreviousKeys` để giữ grace window nếu có current key.
- Rotate Supabase DB password rồi đồng bộ lại `ConnectionStrings__DefaultConnection` trên Render.
- Áp Android restriction cho Firebase API key theo package + SHA-1.
- Chuẩn bị lane scrub git history bằng `git filter-repo` trên mirror clone.

## Chuẩn bị credential

Copy `.env.example` ra file env cục bộ hoặc export trực tiếp vào shell:

```powershell
$env:RENDER_API_KEY="..."
$env:SUPABASE_ACCESS_TOKEN="..."
$env:VERCEL_TOKEN="..."
$env:GOOGLE_OAUTH_ACCESS_TOKEN="..."
```

`GITHUB_TOKEN` là optional nếu máy đã có `git credential` cho `github.com`.

## Lệnh chính

Inventory:

```powershell
python tools/security-ops/security_ops.py inventory
```

Verify nhanh:

```powershell
python tools/security-ops/security_ops.py verify
```

Bật GitHub secret scanning + push protection cho cả 2 repo:

```powershell
python tools/security-ops/security_ops.py github-enable-security
```

Rotate toàn bộ các lane an toàn đang hỗ trợ:

```powershell
python tools/security-ops/security_ops.py rotate --github --internal-token --jwt --db --firebase
```

Rotate JWT với grace window:

```powershell
$env:CURRENT_JWT_KEY="current-live-jwt-secret"
python tools/security-ops/security_ops.py render-rotate-jwt --wait
```

Rotate shared internal token giữa backend và AI provider:

```powershell
python tools/security-ops/security_ops.py render-rotate-internal-token --wait
```

Nếu chấp nhận force logout toàn bộ access token cũ:

```powershell
python tools/security-ops/security_ops.py render-rotate-jwt --force-logout --wait
```

Rotate Supabase DB password và sync lại Render:

```powershell
python tools/security-ops/security_ops.py supabase-rotate-db-password --wait
```

Áp Android restriction cho Firebase API key:

```powershell
$env:FIREBASE_ANDROID_SHA1_RELEASE="AA:BB:CC:..."
python tools/security-ops/security_ops.py firebase-restrict-android-key
```

Tạo plan scrub history:

```powershell
python tools/security-ops/security_ops.py history-rewrite-plan
```

## Ghi chú an toàn

- `render-rotate-jwt` sẽ fail-safe nếu không có current live key và bạn chưa truyền `--force-logout`.
- `render-rotate-internal-token` sẽ ghi cùng một secret mới vào `AIProvider__InternalToken` và `AI_PROVIDER_INTERNAL_TOKEN`, rồi redeploy cả hai service.
- `supabase-rotate-db-password` chỉ rotate sau khi lấy được connection string hiện tại từ Render, để tránh tự cắt backend khỏi DB.
- `history-rewrite-execute` không push mặc định. Muốn force-push mirror phải truyền cờ explicit.
- Output luôn mask/fingerprint secret, không in plaintext ra terminal.
