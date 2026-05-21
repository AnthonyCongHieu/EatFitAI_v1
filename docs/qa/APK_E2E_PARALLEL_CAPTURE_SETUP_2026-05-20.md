# EatFitAI APK E2E Parallel Capture Setup

Created: 2026-05-20

## Goal

Prepare a repeatable APK QA lane where each user flow has its own evidence folder, one primary screen recording, screenshots, Android logcat, optional backend logs, notes, and spreadsheet-ready results.

This setup is for real APK evidence, not Expo Go evidence.

## What The Suite Creates

Root:

```text
_logs/apk-e2e-full/<timestamp>/
```

Per flow:

```text
<ID>-<flow-name>/
  notes.md
  testcase.json
  00-before-flow.png
  99-after-flow.png
  video.mp4
  logcat-redacted.txt
  backend-log-redacted.txt
  backend-log-status.json
  adb-flow-output/
    report.json
    ...
```

Suite-level files:

```text
MANIFEST.md
BACKEND_LOG_SETUP.md
testcase-matrix.json
testcase-matrix.csv
testcase-results.csv
suite-summary.json
EXECUTION_REPORT.md
```

## One-Time Prepare

This command creates folders for the full app matrix. It does not touch the device.

```powershell
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:prepare
```

The latest root is stored at:

```text
_logs/apk-e2e-full/latest.txt
```

## Required Real Device Guards

Before running APK flows:

```powershell
$env:EATFITAI_ANDROID_TARGET = "real-device"
$env:ANDROID_SERIAL = "<device_serial>"
```

Optional backend log capture:

```powershell
$env:EATFITAI_E2E_BACKEND_LOG_FILE = "D:\EatFitAI_v1\_logs\backend\backend.log"
```

or:

```powershell
$env:EATFITAI_E2E_BACKEND_LOG_COMMAND = "powershell -NoLogo -NoProfile -Command Get-Content -Path D:\EatFitAI_v1\_logs\backend\backend.log -Wait"
```

The suite always captures Android logcat. Backend logs are captured only when one of the backend variables is set.

## Automated APK Flow Run

Run automated P0 flows that already have stable ADB harness support:

```powershell
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:run -- --only P0 --record
```

Run one automated flow:

```powershell
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:run -- --id AUTH-01 --record
```

Automated mappings currently include:

| ID | Existing ADB mode |
|---|---|
| APK-00 | doctor |
| APK-01 | probe |
| AUTH-01 | login-real |
| HOME-01 | home-smoke |
| DIARY-01 | food-diary-readback |
| DIARY-02 | food-search-ui-readback |
| SCAN-01 | scan-save-readback |
| VOICE-01 | voice-text-readback |
| STATS-01 | stats-profile-smoke |
| PROF-01 | stats-profile-smoke |
| MOCHI-02 | visual-ui-audit --flow core-app |
| NAV-01 | full-tab-ui-smoke |
| PERF-02 | backend-frontend-live-check |

## Manual Recorded Flow

Use this for flows that require Gmail, Google picker, gallery picker, permission sheets, camera, reset OTP, or visual judgment.

```powershell
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:record -- --id AUTH-05 --duration 150
```

During the recording window, perform the flow manually from the specified start state. The suite records video, Android logcat, backend logs if configured, and before/after screenshots into that flow folder.

## Refresh Report

After any run or manual recording:

```powershell
npm --prefix .\eatfitai-mobile run device:apk-e2e-suite:report
```

Use the generated `testcase-results.csv` and `EXECUTION_REPORT.md` to update the QA workbook.

## Spreadsheet Artifact

The prepared workbook is:

```text
outputs/eatfitai-apk-e2e-testcase-workbook.xlsx
```

Sheets:

- `Dashboard`
- `Testcase Tracker`
- `P0 Release Gate`
- `Run Setup`
- `Evidence Schema`

## Pass/Fail Rule

Do not mark a flow pass because the screen opened. A pass needs:

- Known start state.
- Visible end state.
- No crash, redbox, ANR, auth loop, or stale APK evidence.
- No token/password/OTP leak in written logs.
- Data readback when the flow mutates app state.
- MoChi/toast/overlay does not block the main action.
- Vietnamese text remains readable and not mojibake.
