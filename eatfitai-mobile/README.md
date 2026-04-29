# EatFitAI Mobile

Expo / React Native client for EatFitAI.

## Development contract

- Use Node `20.x`
- Default development target is the cloud backend so emulator work only needs the UI bundle
- Use `.env.development` for the cloud-first profile
- Use `.env.development.local` only when you intentionally debug a local backend
- Render `free` is supported. If the service is sleeping, the first API call can take longer while it wakes up.

Default cloud backend target:

```env
EXPO_PUBLIC_API_BASE_URL=https://eatfitai-backend.onrender.com
```

- Local Android emulator override:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247
```

## Start commands

```powershell
npm install
npm run dev
```

Useful scripts:

- `npm run dev`
- `npm run dev:cloud`
- `npm run dev:local`
- `npm run android`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run api:health`
- `npm run typegen`
- `npm run automation:doctor`
- `npm run device:doctor:android`
- `npm run device:probe:android`
- `npm run device:auth-entry:android`

## Environment files

- `.env.development.example`: canonical cloud-first template
- `.env.development.local.example`: local backend override template
- `.env.development`: active cloud-first development config
- `.env.development.local`: optional local backend override
- `.env`: optional non-dev Expo profile

## Automation lanes

Automation should target a development build or APK. Do not use Expo Go as the automation binary.

### Selector contract

Automation selectors live in [src/testing/testIds.ts](/D:/EatFitAI_v1/eatfitai-mobile/src/testing/testIds.ts). API and device evidence lanes should keep using this contract where the app exposes stable test IDs.

Rules:

- add new selectors only in `src/testing/testIds.ts`
- prefer `testID` over visible text for stable selectors
- keep screen-level `screen` selectors for every major route
- only add `accessible` when a nested touch target needs it

### Real-device ADB lane

The primary Android debug/evidence lane uses ADB, UIAutomator best-effort dumps, screenshots, logcat, screenrecord, and scrcpy:

- lane-alive sanity for release-like APKs
- login-screen tap/type probe on real devices
- device/system interaction without helper APKs
- screenshot and logcat evidence capture

Recommended local loop:

```powershell
npm run automation:doctor
npm run device:doctor:android
npm run device:probe:android
```

Extended lanes:

- `npm run device:scrcpy:android`
- `npm run device:auth-entry:android`

The dedicated release runbook lives in [docs/TESTING_AND_RELEASE.md](/D:/EatFitAI_v1/docs/TESTING_AND_RELEASE.md).
