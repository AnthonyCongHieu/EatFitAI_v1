# EatFitAI Appium Lane

This folder contains the secondary Appium lane used for edge-case validation and device diagnostics.

## Prerequisites

- Android emulator running
- App built and launched with package `com.eatfitai.app`
- Appium server running on `http://127.0.0.1:4723`
- UiAutomator2 driver installed

Recommended install:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Install-Appium.ps1
```

## Local install

```powershell
cd .\tools\appium
npm install
```

## Start Appium server

```powershell
appium
```

## Android defaults

- App package: `com.eatfitai.app`
- App activity: `com.eatfitai.app.MainActivity`
- Platform name: `Android`
- Automation name: `UiAutomator2`

## Optional env vars

- `EATFITAI_DEMO_EMAIL`
- `EATFITAI_DEMO_PASSWORD`
- `APPIUM_HOST`
- `APPIUM_PORT`
- `ANDROID_DEVICE_NAME`
- `ANDROID_PLATFORM_VERSION`

## Run Appium flows

```powershell
cd .\tools\appium
npm run sanity:android
npm run edge:android
npm run cloud-proof:android -- --output .\_logs\production-smoke\<timestamp>
```

Current Appium responsibilities:

1. attach to the running Android app
2. verify the lane can still locate selectors from `eatfitai-mobile/src/testing/testIds.ts`
3. login if credentials are provided
4. verify app resume / process-death recovery
5. keep a very short sanity path alive for device debugging
6. capture cloud-proof evidence bundles with screenshots, page source, and logcat

Appium is no longer the primary smoke gate. Maestro owns the default happy-path smoke suite under `eatfitai-mobile/.maestro`.

For Android release-gate work, install the non-debuggable preview/release-like APK first. Debug builds with Metro are for dev smoke only.

Selector contract:

- source of truth is `eatfitai-mobile/src/testing/testIds.ts`
- Appium reads selectors from that file at runtime to avoid hardcoded duplicate IDs

Recommended order:

1. `npm --prefix eatfitai-mobile run automation:doctor`
2. `npm --prefix eatfitai-mobile run maestro:smoke:android`
3. `npm --prefix eatfitai-mobile run maestro:hero:android`
4. start `appium` only when the secondary diagnostics lane is needed
5. `npm run edge:android` only for device/system cases Maestro does not cover well
6. `npm --prefix eatfitai-mobile run release:gate -- android` or full release gate when canh release

If the installed Android app is a debug build, Metro must already be reachable on `127.0.0.1:8081` before Maestro/Appium lanes can validate startup reliably.

## Cloud proof lane

`cloud-proof:android` is the preferred Appium lane when you need product-grade UI evidence for cloud verification.

It will:

- attach to the authenticated app session
- capture home, diary, and reopen screenshots
- write page source and metadata for each capture
- export logcat into the same session output tree when `EATFITAI_SMOKE_OUTPUT_DIR` is set

Recommended usage:

```powershell
$env:EATFITAI_SMOKE_OUTPUT_DIR = (Resolve-Path .\_logs\production-smoke\cloud-proof-2026-04-17).Path
cd .\tools\appium
npm run cloud-proof:android
```

If you do not set `EATFITAI_SMOKE_OUTPUT_DIR`, the lane falls back to `artifacts/appium`.
