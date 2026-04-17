# Supabase + Render cloud setup

This repo is now prepared for a cloud path with:

- Render web service for `eatfitai-backend`
- Render web service for `eatfitai-ai-provider`
- Supabase Postgres for application data
- Supabase Storage public buckets `food-images` and `user-food`

## 0. Production source of truth

Use these production resources only:

- Supabase project: `EatFitAI v1`
- Render backend URL: `https://eatfitai-backend.onrender.com`
- Render AI provider URL: `https://eatfitai-ai-provider.onrender.com`

Ignore the old paused Supabase project `EatFitAI`.

## 0.1. Render environment group layout

To preserve production config outside live services, keep these environment groups in Render:

- `eatfitai-backend-shared-prod`
- `eatfitai-backend-jwt-prod`
- `eatfitai-ai-provider-prod`

Operational rules:

- do not store production source of truth in service-local env only
- do not link or relink env groups on a healthy live service unless you are intentionally performing a controlled cutover
- for a rebuild or recreate, attach the AI provider group first, then backend shared group, then backend JWT group

## 1. Supabase bootstrap

Run these SQL files in order inside the Supabase SQL editor:

1. [eatfitai-backend/supabase_schema.sql](../eatfitai-backend/supabase_schema.sql)
2. [eatfitai-backend/supabase_storage.sql](../eatfitai-backend/supabase_storage.sql)

Required outcomes:

- application tables exist
- extension `pgcrypto` exists
- storage buckets `food-images` and `user-food` exist and are public

Optional operator commands from the repo root:

```powershell
python .\scripts\cloud\supabase_cloud_ops.py bootstrap-storage
python .\scripts\cloud\supabase_cloud_ops.py audit
python .\scripts\cloud\supabase_cloud_ops.py migrate-media-urls
python .\scripts\cloud\supabase_cloud_ops.py migrate-media-urls --apply
```

## 2. Render backend env

Set these env vars on the `eatfitai-backend` service:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Key`
- `Jwt__Issuer`
- `Jwt__Audience`
- `AIProvider__VisionBaseUrl`
- `Google__WebClientId`
- `Google__AndroidClientId`
- `Google__IosClientId`
- `Supabase__Url`
- `Supabase__ServiceRoleKey`
- `Supabase__FoodImagesBucket`
- `Supabase__UserFoodBucket`
- `Brevo__ApiKey`
- `Brevo__SenderEmail`
- `Brevo__SenderName`

Important:

- `AIProvider__VisionBaseUrl` must be the public HTTPS URL of the Render AI provider service.
- `Supabase__ServiceRoleKey` is required because backend uploads user thumbnails to Supabase Storage.
- `ConnectionStrings__DefaultConnection` should use Supavisor session mode on port `5432` for the long-lived .NET backend service.
- `Brevo__SenderEmail` must be a sender that is verified inside Brevo.
- Render free web services cannot use outbound SMTP ports, so production email delivery now goes through the Brevo HTTPS API instead of SMTP.

## 3. Render AI provider env

Set these env vars on the `eatfitai-ai-provider` service:

- `GEMINI_API_KEY`
- `ENABLE_STT`

Deploy order:

1. Deploy AI provider
2. Copy its public URL into backend `AIProvider__VisionBaseUrl`
3. Deploy backend

Recreate order when recovering from a broken Render service:

1. Recreate `eatfitai-ai-provider`
2. Wait for public `GET /healthz` to return `200`
3. Recreate `eatfitai-backend`
4. Wait for public `GET /health/ready` to return `200`

## 4. Mobile production env

Create a production env file from [eatfitai-mobile/.env.production.example](../eatfitai-mobile/.env.production.example).

Required values:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

Behavior:

- production-like Expo builds now require explicit `EXPO_PUBLIC_API_BASE_URL`
- production-like Expo builds now require explicit `EXPO_PUBLIC_SUPABASE_URL`
- local IP auto-detection is only used in development

## 5. Smoke checks

Backend:

- `GET /health/live`
- `GET /health/ready`
- `GET /health`
- Render blueprint health check should point to `/health/ready`

Core user flows:

- register/login with email
- verify email / forgot password / reset password
- Google sign-in via `POST /api/auth/google/signin`
- AI scan and nutrition requests
- create/update `UserFoodItem` with image upload

Expected storage behavior:

- `UserFoodItem.thumbnailUrl` is a full public Supabase Storage URL in cloud
- `FoodItem.ThumbNail` can stay as bucket keys or full URLs, but must not point to the legacy project host
