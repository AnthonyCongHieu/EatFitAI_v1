# Lightsail DuckDNS Cutover Runbook - 2026-05-12

This runbook completes the Render-to-Lightsail cutover after the May 2026
Lightsail rollout. It intentionally keeps Render as a suspended cold backup,
not as the primary runtime.

## Targets

| Role | Primary target |
| --- | --- |
| Backend public URL | `https://eatfitai-api.duckdns.org` |
| Backend static IP | `18.141.119.165` |
| Backend private IP | `172.26.13.91` |
| AI provider private URL | `http://172.26.11.92:5050` |
| Optional AI provider smoke URL | `https://eatfitai-ai.duckdns.org` |
| AI provider static IP | `3.0.208.56` |

Render backup targets are tracked in
`infra/lightsail/render-backup-targets.json`.

## Stop-The-Loop Rule

If the same cutover step fails twice in a row, or three times total, stop
retrying. Read the official docs for the failing component, write the observed
root cause in the smoke output notes, then change the fix strategy.

Use this rule for DuckDNS, Caddy/ACME, Lightsail firewall, Brevo, Render API,
Expo/EAS, Cloudflare R2, Supabase, Gemini, and Android device smoke.

## Phase 1 - DNS And HTTPS

1. Create or update DuckDNS:
   - `eatfitai-api.duckdns.org -> 18.141.119.165`
   - Optional: `eatfitai-ai.duckdns.org -> 3.0.208.56`
2. Verify DNS from the operator machine:

   ```powershell
   Resolve-DnsName eatfitai-api.duckdns.org
   Resolve-DnsName eatfitai-ai.duckdns.org
   ```

3. Update `/etc/caddy/Caddyfile` on the backend Lightsail instance:

   ```text
   eatfitai-api.duckdns.org {
       reverse_proxy 127.0.0.1:10000
   }
   ```

4. Optional provider public health while smoke is needed:

   ```text
   eatfitai-ai.duckdns.org {
       reverse_proxy 172.26.11.92:5050
   }
   ```

5. Validate Caddy and cert issuance:

   ```bash
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   sudo systemctl status caddy --no-pager
   curl -fsS https://eatfitai-api.duckdns.org/health/ready
   curl -fsS https://eatfitai-ai.duckdns.org/healthz
   ```

If ACME fails twice, stop and read Caddy + Let's Encrypt rate-limit docs before
retrying.

## Phase 2 - Lightsail Runtime And Brevo

1. Confirm backend still calls AI provider privately:

   ```text
   AIProvider__VisionBaseUrl=http://172.26.11.92:5050
   AIProvider__VoiceBaseUrl=http://172.26.11.92:5050
   ```

2. Confirm Brevo env on backend:

   ```text
   Brevo__ApiKey=<valid Brevo key>
   Brevo__SenderEmail=<Brevo verified sender>
   Brevo__SenderName=EatFitAI
   ```

   If Brevo API key IP restrictions are enabled, authorize both the backend
   static IPv4 and the observed AWS IPv6 egress address before auth smoke:

   ```text
   18.141.119.165
   2406:da18:1e1f:9800:a190:253d:31f0:2907
   ```

   A 401 from Brevo that mentions an unrecognised IP means the backend env can
   be correct while Brevo still rejects mail. Check Brevo Security >
   Authorized IPs and Transactional > Email > Real time before retrying.

3. Keep rate limits tunable on Lightsail:

   ```text
   RateLimiting__AuthPermitLimit=10
   RateLimiting__AuthQueueLimit=2
   RateLimiting__AuthWindowSeconds=60
   RateLimiting__AiPermitLimit=20
   RateLimiting__AiQueueLimit=5
   RateLimiting__AiWindowSeconds=60
   RateLimiting__GeneralPermitLimit=120
   RateLimiting__GeneralQueueLimit=10
   RateLimiting__GeneralWindowSeconds=60
   ```

4. Restart and inspect services:

   ```bash
   sudo systemctl restart eatfitai-backend
   sudo systemctl status eatfitai-backend --no-pager
   sudo systemctl show eatfitai-backend -p NRestarts
   sudo systemctl status eatfitai-ai --no-pager
   sudo systemctl show eatfitai-ai -p NRestarts
   ```

## Phase 3 - Smoke Gates

Use the DuckDNS backend target unless intentionally testing rollback:

```powershell
$env:EATFITAI_SMOKE_BACKEND_URL = 'https://eatfitai-api.duckdns.org'
$env:EATFITAI_SMOKE_AI_PROVIDER_URL = 'https://eatfitai-ai.duckdns.org'
powershell -ExecutionPolicy Bypass -File .\start-mobile-cloud-smoke.ps1
```

Required gates:

- Preflight: backend `/health/live`, backend `/health/ready`, provider
  `/healthz`, provider `/healthz/gemini`.
- Auth: register, email verify, login, refresh, forgot/reset password,
  change password, cleanup.
- API: user, AI, regression, metrics, backend non-UI summary.
- Real device: production Android build installed; login, profile, R2 upload,
  scan, diary save/readback, and voice if in release scope.
- Performance: 20 beta-user light load; backend common API p95 under 500 ms,
  AI scan p95 under 6 s at concurrency 3, zero unexpected 5xx, zero service
  restarts.
- Abuse: auth spam and AI spam return 429 with `Retry-After`; oversized upload
  is rejected; missing provider internal token is rejected; private/loopback
  media URL is rejected.

If AI p95 misses the gate repeatedly, upgrade the AI provider Lightsail plan
before doing deeper model optimization.

AI primary-path smoke fixtures must match the deployed Lightsail YOLO class
set. The current ONNX model does not expose `apple`, `banana`, or `orange`, so
those fruit images are benchmark/training follow-up material, not cutover
primary gate fixtures. The release smoke primary set is `rice`, `beef`,
`broccoli`, `fried_egg`, and `spinach`.

## Phase 4 - Render Freeze And Suspend

Inspect Render state:

```powershell
python .\scripts\cloud\render_backup_gate.py
```

Do not suspend until every gate above has passed and the real-device result is
recorded. Then run:

```powershell
python .\scripts\cloud\render_backup_gate.py --execute-suspend --gates-passed
python .\scripts\cloud\render_backup_gate.py --require-suspended
```

Expected final state:

| Render service | Final state |
| --- | --- |
| `eatfitai-backend` | suspended |
| `eatfitai-ai-provider` | suspended |
| `eatfitai-backend-dev` | suspended |
| `eatfitai-ai-provider-dev` | suspended |

## Rollback

Render rollback is manual because DuckDNS is not a Cloudflare-managed owned
domain. If Lightsail fails after cutover:

1. Resume the required Render service from the Render dashboard or API.
2. Verify it with:

   ```powershell
   $env:EATFITAI_SMOKE_BACKEND_URL = 'https://eatfitai-backend.onrender.com'
   npm --prefix .\eatfitai-mobile run smoke:preflight
   ```

3. Ship an EAS OTA/native config update to point the mobile app back to the
   Render URL, or temporarily proxy DuckDNS through Lightsail if Lightsail is
   still reachable and only the backend process is unhealthy.
