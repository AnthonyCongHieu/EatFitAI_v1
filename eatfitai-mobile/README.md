# EatFitAI Mobile

Expo / React Native client for EatFitAI.

## Local development contract

- Use Node `20.x`
- Use `.env.development` for local development
- Default local backend target for Android emulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247
```

- Physical device on the same LAN is supported as a secondary profile

## Start commands

```powershell
npm install
npm run dev
```

Useful scripts:

- `npm run dev`
- `npm run android`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run typegen`
- `npm run maestro:smoke:android`
- `npm run maestro:regression:android`
- `npm run maestro:studio`
- `npm run appium:edge:android`
- `npm run automation:doctor`

## Environment files

- `.env.development.example`: canonical local template
- `.env.development`: active local development config
- `.env`: optional non-dev Expo profile

## Automation lanes

Automation should target a development build or APK. Do not use Expo Go as the automation binary.

### Selector contract

Automation selectors live in [src/testing/testIds.ts](/D:/EatFitAI_v1/eatfitai-mobile/src/testing/testIds.ts). Maestro and Appium both use this contract.

Rules:

- add new selectors only in `src/testing/testIds.ts`
- prefer `testID` over visible text for stable selectors
- keep screen-level `screen` selectors for every major route
- only add `accessible` when a nested touch target needs it

### Maestro

Maestro is the primary UI automation lane:

- `.maestro/smoke`: PR-safe happy path coverage
- `.maestro/regression`: broader UI contract checks
- `.maestro/device`: physical-device-safe flows

Recommended local loop:

```powershell
npm run automation:doctor
npm run maestro:smoke:android
```

EAS workflow config lives in `.eas/workflows/e2e-test-android.yml` and uses the `e2e-test` build profile from `eas.json`.

Authenticated Maestro flows expect:

- `EATFITAI_DEMO_EMAIL`
- `EATFITAI_DEMO_PASSWORD`
- `EXPO_EAS_PROJECT_ID` for real EAS linkage

### Appium

Appium is the secondary lane for edge/debug coverage:

- lane-alive sanity
- process-death and resume diagnostics
- device/system interactions that are harder or flakier in Maestro

Use Appium after Maestro passes locally, or when you need a device-level repro. The dedicated Appium docs live in [tools/appium/README.md](/D:/EatFitAI_v1/tools/appium/README.md).
