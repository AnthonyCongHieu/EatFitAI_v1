# EatFitAI APK E2E Testcase Matrix

Artifact root: `_logs/apk-e2e/2026-05-20T16-56-59/`

Device target:
- Serial: `a12c6888629b`
- Model: `2201116SG`
- Android: `13`
- Package: `com.eatfitai.app`

Run rules:
- Install the freshly built APK before testing.
- Clear app data before credential-sensitive auth flows.
- Record one video per flow with `adb screenrecord`.
- Use screenshots as checkpoints before and after each flow.
- Redact passwords, tokens, and reset codes in written reports.
- Stop and mark blocker if auth redirects outside the expected app, Google picker, or Gmail surfaces.

## Preflight Commands

```powershell
git status --short
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile test -- ForgotPasswordScreen.test.tsx --runInBand
npm --prefix .\eatfitai-mobile test -- mochiNotificationSurfaces.test.ts mochiSurfaceCoordinator.test.ts mochiUnifiedShell.test.js dailyLoopMoChiContext.test.ts deviceAutomationMarkers.test.js --runInBand
python scripts\cloud\check_mojibake.py eatfitai-mobile\src\app\screens\auth\ForgotPasswordScreen.tsx eatfitai-mobile\__tests__\ForgotPasswordScreen.test.tsx eatfitai-mobile\src\i18n\vi.ts
```

## Build And Install

```powershell
$env:ANDROID_SERIAL = "a12c6888629b"
$env:EATFITAI_ANDROID_TARGET = "real-device"
npm --prefix .\eatfitai-mobile run build:android:preview
adb -s $env:ANDROID_SERIAL install -r .\eatfitai-mobile\android\app\build\outputs\apk\release\app-release.apk
adb -s $env:ANDROID_SERIAL shell pm clear com.eatfitai.app
adb -s $env:ANDROID_SERIAL shell dumpsys package com.eatfitai.app
```

## Matrix

| ID | Flow | Start State | Steps | Expected Evidence | Current Result |
|---|---|---|---|---|---|
| APK-00 | Build/install proof | Device connected | Build APK, install, clear app data, launch | APK hash, package dump, launch screenshot | PASS |
| AUTH-01 | Email login success | Logged out | Login with demo credentials supplied by owner | Home authenticated, no auth loop | PASS |
| AUTH-02 | Wrong password | Logged out | Submit correct email and wrong password | Clear error, no crash, no token stored | NOT RUN |
| AUTH-03 | Google login | Logged out | Tap Google, choose `hieuleebeat@gmail.com`, complete onboarding if required | Google picker and authenticated app surface | PASS, degraded by first-time onboarding |
| AUTH-04 | Forgot password request | Logged out | Forgot password, enter demo email, send code | OTP step, no dev code shown | PASS |
| AUTH-05 | Reset via Gmail | OTP step | Open Gmail, read latest EatFitAI reset email, return app | Gmail mailbox evidence, OTP entered | BLOCKED: Gmail opened a mailbox that did not show demo reset mail |
| AUTH-06 | Reset complete + login | New password step | Set temporary password, login, restore original password | Login succeeds after reset and original restored | BLOCKED by AUTH-05 |
| HOME-01 | Daily loop Home | Logged in | Open Home after authenticated login | One daily action, no duplicate MoChi/toast/overlay | PASS from nav/home evidence |
| LOG-01 | Search add meal | Logged in | Search food, add meal, verify diary/home kcal | Meal readback and updated totals | PASS, degraded by recorder pull issue in harness |
| LOG-02 | Recent/common quick add | Existing meal available | Re-add existing food | Under 30 seconds, totals update | NOT RUN as standalone |
| LOG-03 | Rough/manual fallback | Logged in | Add rough/manual estimate | Rough/low-confidence marker visible | NOT RUN |
| SCAN-01 | Gallery scan save | Prepared image in album | Open scan, choose gallery image, review, save | Draft/review then saved meal readback | FAIL: backend returned HTTP 400 |
| SCAN-02 | Scan cancel/error | Scan screen | Cancel/back or unsupported image | Graceful fallback, no stuck loading | NOT RUN |
| VOICE-01 | Voice/text command | Logged in | Use text command fallback | Meal/action readback or clear fallback | PASS, no dedicated video due recorder issue |
| DIARY-01 | Diary edit meal | Existing meal | Edit quantity/serving | Calories update | NOT RUN |
| DIARY-02 | Diary delete meal | Existing meal | Delete meal | Entry removed and totals update | NOT RUN |
| TARGET-01 | Nutrition target | Logged in | Open target/settings | Calories/macro visible, no unsafe auto-apply | COVERED by stats/profile smoke only |
| INSIGHT-01 | Insights/weekly review | Logged in | Open stats/insight/week | Weak data handled honestly | COVERED by stats/profile smoke only |
| PROFILE-01 | Profile/settings | Logged in | Open profile/settings | Stable navigation, no crash | PASS |
| NOTIF-01 | Notification surfaces | Logged in | Open notification UI | No duplicate MoChi; no noisy fixed-reminder claim | PASS from Google v2 final screenshot |
| NAV-01 | Bottom tabs | Logged in | Visit all tabs repeatedly | No blank/frozen transition | PASS |
| SESSION-01 | Logout/login again | Logged in | Logout, login again | Session clears and restores | PARTIAL: logout reached login during reset setup; full loop not recorded |

## Recording Command Template

```powershell
$env:ANDROID_SERIAL = "a12c6888629b"
$root = Resolve-Path "_logs\apk-e2e\<timestamp>"
$remote = "/sdcard/E2E-<ID>-<flow-name>.mp4"
$local = Join-Path $root "E2E-<ID>-<flow-name>.mp4"

adb -s $env:ANDROID_SERIAL shell rm -f $remote
$rec = Start-Process adb -ArgumentList @(
  "-s", $env:ANDROID_SERIAL,
  "shell", "screenrecord", "--time-limit", "90", $remote
) -PassThru -WindowStyle Hidden

# Perform flow here. Keep all taps inside the app unless the flow expects Google/Gmail.

Wait-Process -Id $rec.Id -Timeout 95
adb -s $env:ANDROID_SERIAL pull $remote $local
```

