# YOLO Scan Lightsail Cutover - 2026-05-11

Status document for the guarded migration from Render runtime to two
AWS Lightsail $7 Singapore instances.

## Current topology

Production runtime is prepared on two Lightsail instances:

| Role | Instance | Plan | Public endpoint | Private endpoint |
| --- | --- | --- | --- | --- |
| Backend | `eatfitai-backend-sg` | $7, 1 GB RAM, 2 vCPU, 40 GB SSD, 2 TB transfer | `https://api.18.141.119.165.nip.io` | `172.26.13.91` |
| AI provider | `eatfitai-ai-provider-test-sg` | $7, 1 GB RAM, 2 vCPU, 40 GB SSD, 2 TB transfer | `https://ai.3.0.208.56.nip.io` | `172.26.11.92:5050` |

Backend Lightsail calls AI provider over the Lightsail private network:

```text
AIProvider__VisionBaseUrl=http://172.26.11.92:5050
AIProvider__VoiceBaseUrl=http://172.26.11.92:5050
```

Render is retained as a manual rollback bridge:

| Render service | Status | Policy |
| --- | --- | --- |
| `eatfitai-ai-provider` | Suspended | Cold backup only, `autoDeploy=no`, no new deploys |
| `eatfitai-backend` | Live | Temporary bridge until mobile production release is confirmed, `autoDeploy=no` |

The mobile production build config now points to Lightsail backend in
`eatfitai-mobile/eas.json`:

```text
EXPO_PUBLIC_API_BASE_URL=https://api.18.141.119.165.nip.io
```

Do not suspend Render backend until an EAS production update/build has been
published and a real-device smoke passes against the Lightsail URL.

## Release

- Release SHA: `253039d6a837fd87ba4daaa37087243a1f53c778`
- Render backend manual deploy: `dep-d80sglosfn5c739qpc30`, live at
  `2026-05-11T12:19:43Z`
- Lightsail backend and provider are running native systemd services.

## Free HTTPS hostname decision

The original free hostname plan preferred `sslip.io`. DNS worked, but Caddy
hit a Let's Encrypt rate limit for the registered domain `sslip.io`. Retrying
would only increase ACME noise, so the rollout switched to `nip.io`.

Current HTTPS hostnames:

- Backend: `api.18.141.119.165.nip.io`
- AI provider: `ai.3.0.208.56.nip.io`

This avoids buying a domain for beta, but it is less reliable than owning a
real domain. A paid domain remains the cleaner long-term production option.

## Cost guard

Rules applied during rollout:

- No EC2.
- No load balancer.
- No managed database.
- No extra Lightsail disk.
- No scheduled snapshots.
- No paid CloudWatch log pipeline.
- Two static IPs only, both attached to running Lightsail instances.
- Media remains on Cloudflare R2 and is not proxied through backend.

Static IPs are safe only while attached. If a static IP is ever detached and
not reused, delete it promptly.

AWS Budget alert was not completed in this session because CloudShell was
blocked by account verification and a notification email still needs to be
confirmed by the owner. Recommended budget: actual `14 USD`, forecast
`16 USD`, email-only, no Budget Report.

## Hardening applied

Backend:

- Caddy terminates HTTPS on `:443`.
- ASP.NET backend listens on `127.0.0.1:10000`.
- UFW public allowlist: `22/tcp`, `80/tcp`, `443/tcp`.
- systemd service restart tracking: `NRestarts=0` after checks.
- Swap configured at 2 GB.

AI provider:

- Caddy terminates HTTPS on `:443`.
- Gunicorn binds to private IP `172.26.11.92:5050`.
- UFW allows `5050/tcp` only from backend private IP `172.26.13.91`.
- Public firewall is limited to `22/tcp`, `80/tcp`, `443/tcp`.
- systemd service restart tracking: `NRestarts=0` after checks.
- Swap configured at 2 GB.

AI provider low-memory runtime:

```text
WEB_CONCURRENCY=1
GUNICORN_THREADS=1
YOLO_ONNX_LOW_MEMORY=true
YOLO_ONNX_INTRA_OP_THREADS=1
YOLO_ONNX_INTER_OP_THREADS=1
YOLO_GEMINI_VISION_FALLBACK_ENABLED=false
```

Temporary rollout SSH access:

- Temporary public key comment: `codex-cutover-2026-05-11`
- Removed from both instances after rollout checks.
- Local private/public key files were deleted from `C:\Temp\eatfitai-rollout`.

## Verification evidence

### Service health

Latest direct checks:

| Check | Result |
| --- | --- |
| `https://api.18.141.119.165.nip.io/health/ready` | HTTP 200, about 0.55 s |
| `https://ai.3.0.208.56.nip.io/healthz` | HTTP 200, about 0.31 s |
| Backend service restarts | 0 |
| Provider service restarts | 0 |

Final public health recheck after SSH key cleanup:

| Check | Result |
| --- | --- |
| Backend ready | HTTP 200, about 0.28 s |
| Provider healthz | HTTP 200, about 0.32 s |

### Provider direct benchmark

Direct provider tests showed the $7 provider is usable but does not always hit
the original `p95 <= 3s` target when crop recovery runs:

| Run | Result |
| --- | --- |
| Sequential round 1 | avg 2417 ms, p95 5844 ms |
| Sequential round 2 | avg 4678 ms, p95 7950 ms |
| Concurrency 3 | wall 6368 ms |

Observed bottleneck: primary ONNX is usually around 1.0-1.5 s, but sparse
recovery and crop recovery can add several seconds. Gemini blocking fallback
was disabled and was not the latency source.

### Backend smoke comparison

Render backend and Lightsail backend both use the same release SHA and the
Lightsail AI provider.

| Path | Output dir | Result |
| --- | --- | --- |
| Render backend + Lightsail provider | `_logs/production-smoke/2026-05-11T12-20-52-927Z-render-backend-ls-provider` | 36/36 API checks passed, 2 quality gate failures, avg 1739 ms, p95 6691 ms |
| Lightsail backend + private Lightsail provider | `_logs/production-smoke/2026-05-11T12-22-20-777Z-lightsail-backend-private-provider` | 36/36 API checks passed, 2 quality gate failures, avg 286 ms, p95 3231 ms |
| Render backend post-cache | `_logs/production-smoke/2026-05-11T12-23-48-293Z-render-backend-post-cache` | 36/36 API checks passed, 2 quality gate failures, avg 1785 ms, p95 3706 ms |

The two quality gate failures are unchanged across both backends:

- `vision-primary-path-no-usable-detection`
- `nutrition-primary-path-used-fallback`

These are model/fixture/product-quality issues, not HTTP availability issues.

### Backend-only comparison

Backend-only timing was measured with repeated `health/ready`, `login`, and
`api/ai/status` calls:

| Backend | Health avg / p95 | Login avg / p95 | AI status avg / p95 |
| --- | --- | --- | --- |
| Render | 145 ms / 357 ms | 442 ms / 497 ms | 2519 ms / 23863 ms |
| Lightsail | 82 ms / 347 ms | 159 ms / 164 ms | 66 ms / 70 ms |

Render had a large `api/ai/status` outlier in this sample. Lightsail backend
was more stable in this benchmark.

## Remaining blockers

1. EAS is not logged in locally:

```text
npx eas-cli@latest whoami
Not logged in
```

Production mobile cannot be published from this machine until Expo/EAS login or
an `EXPO_TOKEN` is provided. Render backend must remain live until the mobile
release has been verified.

2. AWS Budget alert needs owner email confirmation.

CloudShell could not be used because account verification is still in progress.
Create the budget from the AWS Billing UI or provide the notification email to
finish it later.

3. Free hostname risk remains.

`nip.io` works now, but beta production reliability is better with an owned
domain. This is not required for the current no-domain plan.

4. Scan quality gate is still red.

Infrastructure is serving requests, but the primary-path smoke still records
the same detection/nutrition fallback failures. Do not interpret the current
infra rollout as a model-accuracy fix.

5. Gemini free-tier quota is finite.

The provider is healthy and has available Gemini projects, but one project was
observed as provider RPD exhausted during smoke. The pool failover works, yet
LLM/nutrition features can still hit daily quota limits under repeated tests.

## Decision

The two-instance Lightsail setup is a better production candidate than keeping
backend on Render Free:

- Provider no longer depends on Render Free cold CPU.
- Backend no longer depends on Render Free runtime for production once EAS is
  published.
- Lightsail backend is materially faster in the backend-only smoke.

Keep Render backend live only as a temporary bridge until mobile production is
released against `https://api.18.141.119.165.nip.io`, then suspend it.

## References

- AWS Lightsail static IP docs:
  `https://docs.aws.amazon.com/en_us/lightsail/latest/userguide/understanding-static-ip-addresses-in-amazon-lightsail.html`
- AWS Lightsail billing FAQ:
  `https://docs.aws.amazon.com/en_us/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html`
- AWS Budgets pricing:
  `https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/`
- Cloudflare Quick Tunnel docs:
  `https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/`
- sslip.io:
  `https://sslip.io/`
- nip.io:
  `https://nip.io/`
