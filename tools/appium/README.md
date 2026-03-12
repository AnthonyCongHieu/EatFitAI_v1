# EatFitAI Appium Lane

This folder contains the emulator-first smoke lane used for Appium and Codex MCP.

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

## Run smoke flow

```powershell
cd .\tools\appium
npm run smoke:android
```

Current smoke path:

1. attach to the running Android app
2. detect login or home screen
3. login if credentials are provided
4. verify home
5. navigate to food search and back
6. navigate to meal diary and back when available

The repo now also exposes stable `testID` values for the core flow used by Appium/Codex.
