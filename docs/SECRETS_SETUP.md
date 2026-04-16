# Secrets Setup

This repository no longer stores development secrets in tracked config files.

## Backend local setup

Use `.NET user-secrets` for local development:

```powershell
cd E:\tool edit\eatfitai_v1\eatfitai-backend
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<your-local-connection-string>"
dotnet user-secrets set "Jwt:Key" "<your-development-jwt-key>"
dotnet user-secrets set "Encryption:Key" "<your-32-char-encryption-key>"
```

## AI provider local setup

Set environment variables before running the Flask service:

```powershell
$env:AI_PROVIDER_INTERNAL_TOKEN="<internal-runtime-token>"
$env:SUPABASE_URL="<supabase-url>"
$env:SUPABASE_SERVICE_KEY="<supabase-service-key>"
```

## Admin app local setup

Use `.env.local` or your local env workflow for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `API_BASE_URL`
- `AI_PROVIDER_URL`
- `ADMIN_ALLOWED_EMAILS`

## Smoke and demo scripts

The smoke/demo scripts no longer ship default credentials. Set these explicitly before running them:

```powershell
$env:EATFITAI_DEMO_EMAIL="<demo-email>"
$env:EATFITAI_DEMO_PASSWORD="<demo-password>"
$env:EATFITAI_SMOKE_EMAIL="<smoke-email>"
$env:EATFITAI_SMOKE_PASSWORD="<smoke-password>"
```

You can also pass `-Email` and `-Password` to `seed-scan-demo.ps1`, or use the matching `--email` / `--password` CLI args for the Node-based smoke scripts.

Do not commit live credentials, generated tokens, or provider config files with real secrets.
