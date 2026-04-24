# npm Audit Risk Acceptance

Updated: `2026-04-24`

## Current Status

The mobile production dependency audit currently reports:

- Moderate: `19`
- High: `0`
- Critical: `0`

The release gate intentionally blocks on `high` and `critical` production advisories:

```powershell
npm --prefix .\eatfitai-mobile audit --omit=dev --audit-level=high
```

## Why Moderate Advisories Are Not Force-Fixed

Most current moderate findings are in the Expo SDK 54 toolchain chain:

- `expo`
- `@expo/cli`
- `@expo/config`
- `@expo/config-plugins`
- `@expo/metro-config`
- `@expo/prebuild-config`
- `expo-constants`
- `expo-auth-session`
- `expo-linking`
- `expo-notifications`
- `expo-splash-screen`
- `xcode`
- `uuid`

`npm audit fix --force` suggests incompatible major changes and can downgrade or break the Expo / React Native version set. Do not use it for this project unless the Expo SDK upgrade plan explicitly allows it.

## Acceptance Conditions

This risk acceptance is valid only when all conditions below are true:

- `npm audit --omit=dev --audit-level=high` exits successfully.
- No `high` or `critical` production advisory is present.
- Moderate findings are documented here or in a linked release note.
- Expo package updates are applied only through compatible SDK 54 patch/minor updates or an explicit Expo SDK upgrade.
- Android preview build, Appium smoke, and cloud smoke pass after dependency changes.

## Revisit Triggers

Re-open this acceptance if any of these happen:

- A moderate advisory becomes high or critical.
- Expo publishes a compatible SDK 54 patch that removes the advisory.
- The project upgrades to a newer Expo SDK.
- The advisory affects runtime request handling, auth, token storage, file upload, or WebView behavior.
