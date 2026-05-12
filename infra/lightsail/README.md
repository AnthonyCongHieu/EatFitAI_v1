# EatFitAI Lightsail Runtime

This folder documents the native Lightsail deployment used for the May 2026
Render-to-Lightsail cutover.

## Production shape

The accepted runtime uses two AWS Lightsail Singapore $7 instances:

| Role | Instance | Public endpoint | Private endpoint |
| --- | --- | --- | --- |
| Backend | `eatfitai-backend-sg` | `https://api.18.141.119.165.nip.io` | `172.26.13.91` |
| AI provider | `eatfitai-ai-provider-test-sg` | `https://ai.3.0.208.56.nip.io` | `172.26.11.92:5050` |

Render runtime policy:

- `eatfitai-ai-provider`: suspended cold backup only.
- `eatfitai-backend`: temporary bridge until the native mobile production build
  is installed/submitted and real-device smoke passes against the Lightsail
  backend URL.

## Runtime layout

```text
/opt/eatfitai/repo                 git checkout of release SHA
/opt/eatfitai/backend-publish      dotnet publish output
/opt/eatfitai/backend.env.json     backend runtime env, chmod 0600
/opt/eatfitai/ai-provider.env      provider runtime env, chmod 0600
/etc/systemd/system/eatfitai-backend.service
/etc/systemd/system/eatfitai-ai.service
/etc/caddy/Caddyfile
```

Services are native systemd processes. Docker Compose is intentionally avoided
to reduce RAM pressure on 1 GB instances.

## Network

Backend public HTTPS:

```text
api.18.141.119.165.nip.io {
    reverse_proxy 127.0.0.1:10000
}
```

Provider public HTTPS:

```text
ai.3.0.208.56.nip.io {
    reverse_proxy 172.26.11.92:5050
}
```

Backend calls provider over private Lightsail networking:

```text
AIProvider__VisionBaseUrl=http://172.26.11.92:5050
AIProvider__VoiceBaseUrl=http://172.26.11.92:5050
```

Provider firewall allows `5050/tcp` only from backend private IP
`172.26.13.91`.

## Firewall baseline

Both instances:

```text
22/tcp
80/tcp
443/tcp
```

Provider only:

```text
5050/tcp from 172.26.13.91
```

Do not open provider `5050` to the public internet.

## Cost guard

Allowed:

- Two $7 Lightsail instances.
- Two attached static IPs.
- Built-in instance transfer.

Not allowed for this rollout:

- EC2.
- Lightsail load balancer.
- Managed database.
- Extra block disk.
- Scheduled snapshots.
- Paid CloudWatch log pipeline.
- Detached static IPs left allocated.

Stopped Lightsail instances can still accrue charges. Delete unused resources
instead of only stopping them when the intent is to stop billing.

## Current verification

Release SHA: `253039d6a837fd87ba4daaa37087243a1f53c778`

Mobile release:

- EAS account: `anthonyconghieu`
- EAS project: `@anthonyconghieu/eatfitai-mobile`
- Production Android OTA update: `019e179c-9649-7ee0-a5c6-d4d86cc99fdf`
- Production Android native build: `31a487d9-9ed2-4ceb-9921-4a65782aaad5`
- Build artifact: `https://expo.dev/artifacts/eas/78xCvjN9trgc9SKTrcVXGR.tar.gz`

Health:

```text
curl https://api.18.141.119.165.nip.io/health/ready
curl https://ai.3.0.208.56.nip.io/healthz
```

Expected:

- HTTP 200 for both.
- `eatfitai-backend`, `eatfitai-ai`, and `caddy` active.
- `NRestarts=0` after rollout smoke.

Smoke evidence:

- Render backend + Lightsail provider:
  `_logs/production-smoke/2026-05-11T12-20-52-927Z-render-backend-ls-provider`
- Lightsail backend + private provider:
  `_logs/production-smoke/2026-05-11T12-22-20-777Z-lightsail-backend-private-provider`
- Render backend post-cache:
  `_logs/production-smoke/2026-05-11T12-23-48-293Z-render-backend-post-cache`

The infrastructure checks passed, but Lightsail auth/email smoke is blocked by
Brevo delivery/configuration on the backend instance. The AI primary-path
quality gate also still has existing model/fixture failures. See
`docs/53_YOLO_SCAN_LIGHTSAIL_ROLLOUT_2026-05-11.md`.

## Release checklist

1. Confirm both Lightsail services are healthy.
2. Confirm Render backend is either a bridge or suspended, never the intended
   long-term production runtime.
3. Confirm `eatfitai-mobile/eas.json` production points to
   `https://api.18.141.119.165.nip.io`.
4. Confirm Lightsail backend Brevo settings:
   `Brevo__ApiKey`, `Brevo__SenderEmail`, `Brevo__SenderName`.
5. Smoke login, profile, R2 upload, scan, and diary save on a real device.
6. Submit/install the successful production Android build.
7. Suspend Render backend only after the app is verified on Lightsail.
8. Remove any temporary SSH keys used during rollout.

Current rollout key status:

- Key comment `codex-cutover-2026-05-11` was removed from both instances.
- The temporary local key files were deleted after removal was verified.
