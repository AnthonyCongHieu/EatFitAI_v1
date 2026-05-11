# YOLO Scan Lightsail Provider Rollout - 2026-05-11

Guarded rollout for moving only the AI provider runtime away from Render Free first.
Backend migration is a benchmark decision, not an automatic cutover.

## Target topology

- Production mobile keeps calling Render backend until the backend decision gate passes.
- Render backend production stays live and can be benchmarked against a Lightsail backend test.
- Lightsail $7 Singapore runs the production AI provider.
- Render production AI provider stays as a cold backup after baseline and provider cutover.
- A Lightsail backend test can run on the same $7 instance at `api-ls.eatfitai.com` for comparison only.

## Safety gates

Stop and verify before:

1. Creating AWS resources beyond one $7 Lightsail instance and one attached static IP.
2. Changing Cloudflare DNS records.
3. Updating Render production env vars.
4. Suspending Render AI provider.
5. Changing EAS/mobile production API URL.

## Render production policy

- `eatfitai-ai-provider`: no new deploys; suspend only after Lightsail provider direct benchmark and Render backend smoke pass.
- `eatfitai-backend`: keep live; deploy the same release SHA used on Lightsail before backend comparison.
- Render backend may point to `https://ai-provider.eatfitai.com` after Lightsail provider passes direct benchmark.

## Lightsail $7 runtime

Use native systemd services to avoid Docker memory overhead.

AI provider:

```text
PORT=5050
AI_PROVIDER_BIND_IP=<lightsail-private-ip>
AI_PROVIDER_INTERNAL_TOKEN=<same-token-as-backend>
WEB_CONCURRENCY=1
GUNICORN_THREADS=1
YOLO_ONNX_LOW_MEMORY=true
YOLO_ONNX_INTRA_OP_THREADS=1
YOLO_ONNX_INTER_OP_THREADS=1
YOLO_GEMINI_VISION_FALLBACK_ENABLED=false
YOLO_PRELOAD_ON_STARTUP=false
MEDIA_PUBLIC_BASE_URL=https://pub-9081bce8ff6b4db5b4403ca7adae7b80.r2.dev
AI_PROVIDER_ALLOWED_MEDIA_HOSTS=pub-9081bce8ff6b4db5b4403ca7adae7b80.r2.dev,media.eatfitai.com,bjlmndmafrajjysenpbm.supabase.co
```

Backend test:

```text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:10000
SchemaBootstrap__RunOnStartup=false
AIProvider__VisionBaseUrl=http://<lightsail-private-ip>:5050
AIProvider__VisionMaxConcurrentRequests=2
AIProvider__VisionQueueLimit=10
AIProvider__VisionQueueTimeoutSeconds=5
AIProvider__VisionDetectTimeoutSeconds=35
```

## Cost guard

- Do not create EC2, load balancer, managed database, extra disk, paid log pipeline, scheduled snapshots, or second Lightsail instance during this rollout.
- Static IP is acceptable only while attached to the instance.
- Keep only ports `22`, `80`, and `443` open in Lightsail firewall.
- Keep R2 as media source; do not proxy media through backend.

## Acceptance

- AI provider direct warm p95 <= 3s sequential and concurrency 3 wall <= 5s.
- Render backend + Lightsail provider scan p95 <= 5s sequential and <= 8s concurrency 3.
- Lightsail backend test has 0% 502/504 and no service restarts during benchmark.
- Available RAM does not stay below 100MB and swap usage is not continuously growing.

## Decision gate

After benchmarks:

- If backend on same $7 is stable, it becomes a candidate for a later production API cutover.
- If same-machine backend hurts AI latency or memory, keep backend on Render or evaluate a second Lightsail backend instance.
- Do not change `EXPO_PUBLIC_API_BASE_URL` production before this decision.
