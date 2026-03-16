# Secrets Checklist

Use this checklist before running locally, sharing the repo, or deploying.

## Backend

- [ ] `eatfitai-backend/appsettings*.json` does not contain real secrets.
- [ ] `Jwt:Key` is set via `dotnet user-secrets` or deployment env vars.
- [ ] `ConnectionStrings:DefaultConnection` is set via `dotnet user-secrets` or deployment env vars.
- [ ] SMTP credentials are set via `dotnet user-secrets` or deployment env vars.
- [ ] Production values are injected through env vars or a secret store, not committed JSON.

## Mobile

- [ ] `eatfitai-mobile/.env.development` exists only locally and is not committed.
- [ ] `EXPO_PUBLIC_API_BASE_URL` points to the correct backend for the current device/emulator.
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set for Google Sign-In.
- [ ] `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is set when native iOS sign-in is enabled.
- [ ] Only `.env*.example` templates are tracked in git.

## AI Provider

- [ ] `ai-provider/.env` exists only locally and is not committed.
- [ ] `ROBOFLOW_API_KEY` is set only when downloading datasets.
- [ ] `HF_TOKEN` is set only when downloading gated Hugging Face assets.
- [ ] Ollama endpoint/model values match the local environment.

## Pre-commit / Pre-deploy

- [ ] Run a secret scan or grep for `api_key`, `token`, `password`, `Jwt:Key`, and connection strings.
- [ ] Review `git diff --staged` for copied credentials, machine names, local IPs, and personal emails.
- [ ] Confirm new setup docs point to placeholders or examples, not real values.
- [ ] Rotate any secret immediately if it was ever committed or shared.