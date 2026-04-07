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
```

Current Appium responsibilities:

1. attach to the running Android app
2. verify the lane can still locate selectors from `eatfitai-mobile/src/testing/testIds.ts`
3. login if credentials are provided
4. verify app resume / process-death recovery
5. keep a very short sanity path alive for device debugging

Appium is no longer the primary smoke gate. Maestro owns the default happy-path smoke suite under `eatfitai-mobile/.maestro`.

Selector contract:

- source of truth is `eatfitai-mobile/src/testing/testIds.ts`
- Appium reads selectors from that file at runtime to avoid hardcoded duplicate IDs

Recommended order:

1. `npm --prefix eatfitai-mobile run automation:doctor`
2. `npm --prefix eatfitai-mobile run maestro:smoke:android`
3. `npm run edge:android` only for device/system cases Maestro does not cover well
