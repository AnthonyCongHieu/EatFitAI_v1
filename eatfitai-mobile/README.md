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

## Environment files

- `.env.development.example`: canonical local template
- `.env.development`: active local development config
- `.env`: optional non-dev Expo profile

## Automation lane

Appium selectors are defined for the smoke path used by Codex/Appium:

- login
- home
- food search
- AI scan from gallery
- add meal from vision
- meal diary
- retry/error flow

See [tools/appium/README.md](/D:/EatFitAI_v1/tools/appium/README.md).
