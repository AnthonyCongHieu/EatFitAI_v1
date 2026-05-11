# EatFitAI Lightsail $7 Runtime

This folder documents the provider-first rollout on one Lightsail $7 Singapore instance.

## What This Does

- Runs AI provider as the primary production provider.
- Optionally runs a backend test service on the same instance for comparison with Render backend.
- Uses native systemd services instead of Docker to reduce RAM pressure.
- Keeps Render backend as production until the backend benchmark decision gate.

## What This Must Not Do

- No second Lightsail instance.
- No EC2, load balancer, managed database, extra disk, scheduled snapshots, or paid log pipeline.
- No production EAS/mobile API URL change during provider rollout.

## Runtime Layout

```text
/opt/eatfitai/repo                 git checkout of release SHA
/opt/eatfitai/backend-publish      dotnet publish output
/opt/eatfitai/ai-provider.env      AI provider runtime env
/opt/eatfitai/backend.env          backend test runtime env
/etc/systemd/system/eatfitai-ai.service
/etc/systemd/system/eatfitai-backend.service
/etc/caddy/Caddyfile
```

## Domains

- `ai-provider.eatfitai.com` -> Lightsail static IP, proxied to private `:5050`.
- `api-ls.eatfitai.com` -> Lightsail static IP, proxied to local backend test `:10000`.

## Benchmark Order

1. Baseline Render AI provider direct.
2. Baseline Render backend production.
3. Deploy Lightsail AI provider and benchmark direct.
4. Point Render backend to Lightsail AI provider and smoke scan.
5. Suspend Render AI provider as cold backup.
6. Deploy Lightsail backend test.
7. Benchmark Render backend vs Lightsail backend with the same release SHA.
