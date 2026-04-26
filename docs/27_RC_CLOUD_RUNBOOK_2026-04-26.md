# RC Cloud Runbook - 2026-04-26

Phạm vi: deploy và verify cloud RC cho `hieu_deploy/production` trên Render dev services:

- Backend: `eatfitai-backend-dev`
- AI provider: `eatfitai-ai-provider-dev`

Runbook này không chứa API key, token nội bộ, password, verification code, hoặc secret. Nếu secret bị dán vào chat/log, rotate ngay sau khi deploy xong.

## Trạng Thái Khóa Gần Nhất

Lần verify gần nhất sau khi khóa runbook:

- Branch: `hieu_deploy/production`
- Commit: `c64602c fix(rc): use lightweight ai smoke fixtures`
- Render verify: pass 2 services
- Cloud smoke tuần tự: preflight pass, auth API pass, user API pass, AI API pass 36/36
- Evidence:
  - `_logs/production-smoke/2026-04-25T18-17-45-180Z/render-verify.json`
  - `_logs/production-smoke/2026-04-25T18-19-59-278Z/preflight-results.json`
  - `_logs/production-smoke/2026-04-25T18-19-59-278Z/auth-api-report.json`
  - `_logs/production-smoke/2026-04-25T18-20-21-260Z/user-api-report.json`
  - `_logs/production-smoke/2026-04-25T18-20-21-260Z/ai-api-report.json`

## Điều Kiện Trước Khi Chạy

1. Worktree sạch và HEAD đã push:

```powershell
git fetch --prune origin
git status --short --branch
git log --oneline --decorate -3
```

2. `RENDER_API_KEY` đã set trong process shell hoặc user env. Không ghi key vào repo:

```powershell
$env:RENDER_API_KEY='<render-api-key>'
```

3. Backend dev có các env chỉ dùng cho smoke/dev:

```text
Auth__AllowAuthCodesInResponse=true
RateLimiting__AuthPermitLimit=60
RateLimiting__AuthQueueLimit=5
RateLimiting__AuthWindowSeconds=60
AIProvider__VisionDetectTimeoutSeconds=35
```

4. AI provider dev có env:

```text
YOLO_IMAGE_SIZE=320
```

Không bật `Auth__AllowAuthCodesInResponse=true` trên production thật.

## 1. Deploy Backend Và AI Provider

Chạy từ root repo. Script này trigger deploy cho 2 service Render dev, không in secret ra output.

```powershell
$ErrorActionPreference = 'Stop'
$apiKey = $env:RENDER_API_KEY
if (-not $apiKey) { throw 'Missing RENDER_API_KEY' }

$base = 'https://api.render.com/v1'
$headers = @{
  Authorization = "Bearer $apiKey"
  Accept = 'application/json'
  'Content-Type' = 'application/json'
  'User-Agent' = 'EatFitAI-RC-Runbook/1.0'
}

$backend = 'srv-d7m33abrjlhs739qve7g'
$aiProvider = 'srv-d7m33fjeo5us73ejbv4g'

$backendEnv = @{
  'Auth__AllowAuthCodesInResponse' = 'true'
  'RateLimiting__AuthPermitLimit' = '60'
  'RateLimiting__AuthQueueLimit' = '5'
  'RateLimiting__AuthWindowSeconds' = '60'
  'AIProvider__VisionDetectTimeoutSeconds' = '35'
}

foreach ($entry in $backendEnv.GetEnumerator()) {
  $key = [uri]::EscapeDataString($entry.Key)
  $body = @{ value = $entry.Value } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Put -Uri "$base/services/$backend/env-vars/$key" -Headers $headers -Body $body | Out-Null
}

$aiKey = [uri]::EscapeDataString('YOLO_IMAGE_SIZE')
$aiBody = @{ value = '320' } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Put -Uri "$base/services/$aiProvider/env-vars/$aiKey" -Headers $headers -Body $aiBody | Out-Null

$deployBody = @{ clearCache = 'do_not_clear' } | ConvertTo-Json -Compress
$backendDeploy = Invoke-RestMethod -Method Post -Uri "$base/services/$backend/deploys" -Headers $headers -Body $deployBody
$aiDeploy = Invoke-RestMethod -Method Post -Uri "$base/services/$aiProvider/deploys" -Headers $headers -Body $deployBody

[pscustomobject]@{
  backendDeployId = $backendDeploy.id
  backendStatus = $backendDeploy.status
  aiProviderDeployId = $aiDeploy.id
  aiProviderStatus = $aiDeploy.status
} | ConvertTo-Json -Compress
```

Poll đến khi cả hai service `live`:

```powershell
$deploys = @{
  backend = $backendDeploy.id
  aiProvider = $aiDeploy.id
}
$services = @{
  backend = $backend
  aiProvider = $aiProvider
}
$success = @('live', 'succeeded', 'success', 'deployed')
$failure = @('build_failed', 'failed', 'canceled', 'cancelled', 'update_failed', 'deactivated', 'timed_out')

for ($i = 1; $i -le 18; $i++) {
  $rows = @()
  $allDone = $true

  foreach ($name in @('backend', 'aiProvider')) {
    $payload = Invoke-RestMethod -Method Get -Uri "$base/services/$($services[$name])/deploys/$($deploys[$name])" -Headers $headers
    $deploy = if ($payload.deploy) { $payload.deploy } else { $payload }
    $status = ([string]$deploy.status).ToLowerInvariant()
    $rows += "$name=$status"

    if ($failure -contains $status) { throw "Render deploy failed: $name=$status" }
    if (-not ($success -contains $status)) { $allDone = $false }
  }

  Write-Host ("poll {0}: {1}" -f $i, ($rows -join ', '))
  if ($allDone) { break }
  Start-Sleep -Seconds 15
}
```

## 2. Render Verify

Verify branch, commit, owner, rootDir, docker paths, latest deploy status, và deploy freshness:

```powershell
$env:RENDER_VERIFY_WAIT_MS = '90000'
$env:RENDER_VERIFY_POLL_MS = '5000'
npm --prefix .\eatfitai-mobile run smoke:render:verify
```

Pass criteria:

- Exit code `0`
- Report nói `Render verify passed for 2 service(s)`
- `render-verify.json` có `summary.passed=true`
- `latestDeploy.commitId` khớp HEAD hiện tại

## 3. Warm-Up AI Provider

Render starter/free có cold-start chậm. `/healthz` có thể 200 trước khi YOLO model sẵn sàng cho `/detect`; request detect đầu tiên sau deploy/restart có thể mất trên 90 giây. Chạy warm-up bằng fixture nhẹ trước khi AI smoke hoặc demo.

```powershell
@'
import fs from 'node:fs';
import path from 'node:path';

const apiKey = process.env.RENDER_API_KEY;
if (!apiKey) throw new Error('Missing RENDER_API_KEY');

const serviceId = 'srv-d7m33fjeo5us73ejbv4g';
const envKey = encodeURIComponent('AI_PROVIDER_INTERNAL_TOKEN');
let health = await (await fetch('https://eatfitai-ai-provider-dev.onrender.com/healthz')).json();

if (health.model_loaded) {
  console.log(JSON.stringify({
    alreadyLoaded: true,
    modelFile: health.model_file,
    yoloImageSize: health.yolo_image_size,
  }, null, 2));
  process.exit(0);
}

const envRes = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${envKey}`, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
if (!envRes.ok) throw new Error(`Cannot read AI provider token metadata: ${envRes.status}`);

const envPayload = await envRes.json();
const token = (envPayload.envVar || envPayload).value;
if (!token || /REDACTED|UNAVAILABLE/i.test(token)) {
  throw new Error('AI_PROVIDER_INTERNAL_TOKEN is not readable by this Render API key');
}

const filePath = path.resolve('tools/fixtures/scan-demo/ai-primary-banana-02.jpg');
const form = new FormData();
form.append('file', new Blob([fs.readFileSync(filePath)], { type: 'image/jpeg' }), path.basename(filePath));

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 180000);
const startedAt = Date.now();

try {
  const res = await fetch('https://eatfitai-ai-provider-dev.onrender.com/detect', {
    method: 'POST',
    headers: { 'X-Internal-Token': token },
    body: form,
    signal: controller.signal,
  });
  await res.text();
  console.log(JSON.stringify({
    warmStatus: res.status,
    warmOk: res.ok,
    warmMs: Date.now() - startedAt,
  }, null, 2));
} finally {
  clearTimeout(timer);
}

health = await (await fetch('https://eatfitai-ai-provider-dev.onrender.com/healthz')).json();
console.log(JSON.stringify({
  modelLoaded: health.model_loaded,
  modelFile: health.model_file,
  yoloImageSize: health.yolo_image_size,
}, null, 2));
'@ | node --input-type=module -
```

Pass criteria:

- `modelLoaded=true`
- `modelFile=best.pt`
- `yoloImageSize=320`
- Warm-up detect trả `warmOk=true`, hoặc health đã `alreadyLoaded=true`

Nếu warm-up abort nhưng `/healthz` sau đó báo `modelLoaded=true`, đợi 30-60 giây rồi warm lại bằng `ai-primary-banana-02.jpg`.

## 4. Chạy Smoke Tuần Tự

Không chạy song song preflight/auth/user/AI smoke. Auth smoke có cleanup và token rotation, nên chạy song song có thể làm preflight refresh `401` giả.

```powershell
npm --prefix .\eatfitai-mobile run smoke:preflight
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:EATFITAI_SMOKE_AUTH_MAILBOX_TIMEOUT_MS = '30000'
$env:EATFITAI_SMOKE_AUTH_TIMEOUT_MS = '15000'
$env:EATFITAI_SMOKE_AUTH_RETRY_ATTEMPTS = '1'
npm --prefix .\eatfitai-mobile run smoke:auth:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm --prefix .\eatfitai-mobile run smoke:user:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm --prefix .\eatfitai-mobile run smoke:ai:api
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Pass criteria:

- Preflight: backend live/ready 200, AI healthz 200, auth login/refresh 200
- Auth API: `passed=true`, `failureCount=0`, cleanup pass
- User API: `passed=true`, `failures=0`
- AI API: `passed=true`, `summary.failed=0`, `summary.blocked=0`

## 5. Khi Fail Thì Đọc Theo Thứ Tự

1. Render verify fail:
   - Xem `render-verify.json`.
   - Nếu `commitMatches=false`, deploy lại service và verify lại.
   - Nếu `rootDirMatches=false` hoặc `dockerPathsMatch=false`, sửa cấu hình service trước khi smoke.

2. Preflight `refresh=401`:
   - Kiểm tra có đang chạy auth smoke song song không.
   - Chạy lại preflight riêng một mình.

3. Auth smoke fail:
   - Nếu response code source không phải `response`, kiểm tra `Auth__AllowAuthCodesInResponse=true` trên backend dev.
   - Nếu request bị abort/queue, kiểm tra `RateLimiting__AuthPermitLimit`.

4. AI smoke fail ở vision timeout:
   - Kiểm tra `/healthz` có `modelLoaded=true`.
   - Warm-up bằng fixture nhẹ.
   - Không đưa fixture benchmark nặng vào pass-path smoke; để chúng trong benchmark lane riêng.

5. AI smoke fail ở Gemini/cooking/nutrition:
   - Kiểm tra `/healthz` có `geminiConfigured=true`.
   - Rerun một lần sau 30-60 giây nếu lỗi 502/503 ngắn hạn.

## 6. Bảo Mật Sau Khi Chạy

- Nếu Render API key đã bị paste vào chat/log, revoke key đó và tạo key mới.
- Không commit `_logs/`.
- Không commit `.env`, mailbox token, password, reset code, verification code.
- Env smoke/dev có trả auth code trong response chỉ được dùng trên service dev.
