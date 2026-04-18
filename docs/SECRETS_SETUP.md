# Quản lý Secrets

Cập nhật: `2026-04-18`

Tài liệu này là hướng dẫn bàn giao cho đồng đội về biến môi trường và quản lý secrets cho:

- `eatfitai-backend`
- `ai-provider`
- `eatfitai-mobile`
- `EatFitAI_Admin`
- `tools/security-ops`

## Recommended model

Do **not** use one live `.env` file for the whole workspace.

This codebase spans multiple runtimes with different loading rules:

- Next.js loads `.env*` from the app root and only exposes `NEXT_PUBLIC_*` to the browser.
- Expo inlines `EXPO_PUBLIC_*` into the app bundle, so those values are never secret.
- ASP.NET Core already supports `User Secrets` in development and environment variables in deployed environments.
- Python `dotenv` can read a local `.env`, but that does not mean the same file should be shared with the other apps.

The safe pattern for this repository is:

1. Keep **one committed manifest/example layer** for teammate onboarding.
2. Keep **one local secret source per app/runtime**.
3. Keep **production secrets only in platform secret stores** such as Render and Vercel.

For the committed manifest, use:

- [archive/ENVIRONMENT_MANIFEST.example](archive/ENVIRONMENT_MANIFEST.example)

This manifest is for reference only. It is **not** a runtime file.

## Why not one shared runtime `.env`

Using one real `.env` for the whole workspace sounds convenient, but it creates avoidable risk:

- It mixes browser-safe values with server-only secrets.
- It encourages copying the same secret set into more places than necessary.
- It does not match how .NET, Next.js, Expo, and Python actually resolve configuration.
- It makes accidental commits more likely because one file becomes the single blast radius.

For this repo, the right compromise is:

- one **reference manifest**
- multiple **runtime-local secret stores**

## Source of truth by app

### `eatfitai-backend`

Use `.NET User Secrets` for local development.

Do not put live development secrets back into `appsettings.Development.json`.

Local development:

```powershell
cd .\eatfitai-backend
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "<local-connection-string>"
dotnet user-secrets set "Jwt:Key" "<development-jwt-key>"
dotnet user-secrets set "Encryption:Key" "<32-char-encryption-key>"
dotnet user-secrets set "AIProvider:InternalToken" "<local-internal-token>"
```

Production / deployed:

- Render env vars
- Examples:
  - `ConnectionStrings__DefaultConnection`
  - `Jwt__Key`
  - `Jwt__PreviousKeys`
  - `AIProvider__InternalToken`

### `ai-provider`

Use a local `.env` only for the Python service itself.

Committed:

- `ai-provider/.env.example`

Local only:

- `ai-provider/.env`

Typical keys:

- `AI_PROVIDER_INTERNAL_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `GEMINI_KEY_POOL_JSON`
- `GEMINI_EXTRA_KEY_POOL_JSON`

Production / deployed:

- Render env vars on `eatfitai-ai-provider`

### `eatfitai-mobile`

Only values prefixed with `EXPO_PUBLIC_` should be read directly by the mobile app bundle.

These are **not** secret.

Committed templates:

- `eatfitai-mobile/.env.development.example`
- `eatfitai-mobile/.env.development.local.example`
- `eatfitai-mobile/.env.production.example`

Local only:

- `eatfitai-mobile/.env.development.local`
- optionally `eatfitai-mobile/.env.development`

Do not place private keys, service-role keys, JWT signing keys, or database passwords in `EXPO_PUBLIC_*`.

### `EatFitAI_Admin`

For local development, standardize on:

- `.env.local`

For live/manual ops scripts, standardize on:

- `.env.live.local`

Committed templates:

- `EatFitAI_Admin/.env.example`
- `EatFitAI_Admin/.env.live.example`

Copy pattern:

```powershell
Copy-Item .env.example .env.local
Copy-Item .env.live.example .env.live.local
```

Rules:

- `NEXT_PUBLIC_*` may be exposed to the browser.
- Keep secrets out of `NEXT_PUBLIC_*`.
- Server-only values such as admin automation credentials stay in local files or platform env stores.

### `tools/security-ops`

Committed template:

- `tools/security-ops/.env.example`

Runtime use:

- Prefer shell/session env vars over saved plaintext files when possible.

Examples:

- `GITHUB_TOKEN`
- `RENDER_API_KEY`
- `VERCEL_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `GOOGLE_OAUTH_ACCESS_TOKEN`
- `CURRENT_JWT_KEY`

## Gitignore policy

The repository should commit:

- `*.example`
- documentation
- non-secret manifests

The repository should ignore:

- `.env`
- `.env.*`
- `.envrc`
- `.env.vault`
- `.direnv/`
- keystore / certificate artifacts such as `*.jks`, `*.keystore`, `*.p12`, `*.pfx`

Current hardening changes were added to:

- root `.gitignore`
- `EatFitAI_Admin/.gitignore`
- `ai-provider/.gitignore`
- `eatfitai-backend/.gitignore`

## Team onboarding flow

When a teammate joins:

1. Đưa file này và `archive/ENVIRONMENT_MANIFEST.example`.
2. Đưa link dashboard provider đúng, không gửi raw secrets qua chat.
3. Have them create their own local runtime files:
   - `EatFitAI_Admin/.env.local`
   - `EatFitAI_Admin/.env.live.local` if they do live ops
   - `eatfitai-mobile/.env.development.local`
   - `ai-provider/.env`
4. For backend local setup, use `.NET User Secrets`, not a tracked config file.
5. For deployed environments, use Render / Vercel env dashboards only.

## Production policy

Production secrets should live only in platform secret managers:

- Render environment variables for backend and AI provider
- Vercel project environment variables for admin
- Supabase dashboard / database credential rotation
- Firebase / Google Cloud restricted credentials

Do not send production secrets through:

- Git
- chat
- email
- markdown docs
- screenshots

## What to share with teammates

Safe to share:

- `.example` files
- `archive/ENVIRONMENT_MANIFEST.example`
- secret names
- provider locations
- setup commands

Not safe to share:

- raw PATs
- Render keys
- Supabase service role keys
- production JWT keys
- database passwords
- copied `.env` files

## Incident response rule

If any secret is pasted into chat, email, or a ticket:

1. Treat it as exposed.
2. Rotate or revoke it.
3. Update the platform env store.
4. Re-check git history and deployment config.

## Reality check

There is no such thing as absolute security.

What we can do is make the safe path the default:

- examples committed
- live secrets never committed
- platform env stores for deployed apps
- local per-app secret files
- user secrets for .NET
- strict `.gitignore`
- immediate rotation after accidental exposure

## References

- [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
- [ASP.NET Core configuration](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/?view=aspnetcore-9.0)
- [ASP.NET Core app secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-9.0)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Render environment variables](https://render.com/docs/configure-environment-variables)
- [The Twelve-Factor App: Config](https://12factor.net/config)
