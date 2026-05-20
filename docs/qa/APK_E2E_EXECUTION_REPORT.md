# EatFitAI APK E2E Execution Report

Run timestamp: `2026-05-20T16-56-59`

Artifact root: `_logs/apk-e2e/2026-05-20T16-56-59/`

## Verdict

Current APK is installable and the main authenticated app shell is usable, but this is not a full production pass yet.

Production blockers:
- `SCAN-01` fails on real device readback: gallery scan save returns backend HTTP 400.
- `AUTH-05` and `AUTH-06` are blocked because the Gmail app on the device did not expose the demo account reset mailbox, so the OTP could not be retrieved from the real mailbox.

High-priority issues:
- Reset password dev-code UX was present in code and has been removed before this APK build.
- Android automation on this Xiaomi/MIUI device has degraded UIAutomator reliability; screenshot/video evidence is usable, but marker-based automation is not consistently stable.
- Device logs include SecureStore warnings for values larger than 2048 bytes after login. This can become a persistence/session reliability issue.

## Code Changes Included Before Build

- Removed mobile display/autofill of backend `resetCode` from forgot-password flow.
- Removed the visible dev reset-code card and dev-mode toast copy.
- Added regression coverage that backend-provided reset codes are not exposed in UI.
- Converted `src/assets/icon.png` and `src/assets/adaptive-icon.png` from JPEG-content-with-PNG-extension to valid PNG files. This fixed the Android release resource build failure.

## Preflight Result

| Check | Result |
|---|---|
| `npm --prefix .\eatfitai-mobile run typecheck` | PASS |
| `npm --prefix .\eatfitai-mobile run lint` | PASS |
| `ForgotPasswordScreen.test.tsx` | PASS |
| MoChi/device marker targeted tests | PASS |
| Mojibake scan for edited user-facing auth files | PASS |
| `git diff --check` | PASS with CRLF warnings only |

## APK Proof

APK:
- Path: `eatfitai-mobile/android/app/build/outputs/apk/release/app-release.apk`
- SHA256: `1EA687B21E7FA1B0DAC50E5E34E4857351B2475AA120F37086E863DB312C4192`

Device package proof:
- Package: `com.eatfitai.app`
- Version: `1.0.0`
- Version code: `1`
- First install time: `2026-05-20 16:56:28`
- Last update time: `2026-05-20 16:56:28`

Artifacts:
- `APK-00-apk-sha256.txt`
- `APK-00-package-dumpsys.txt`
- `APK-00-launch.png`
- `APK-00-logcat-tail.txt`
- `APK-00-crash-logcat.txt`

## Recorded Evidence

| Flow | Video |
|---|---|
| AUTH-01 email login | `E2E-AUTH-01-email-login-success.mp4` |
| AUTH-03 Google login, first-time onboarding | `E2E-AUTH-03-google-login-hieuleebeat.mp4` |
| AUTH-03 Google login after onboarding | `E2E-AUTH-03-google-login-hieuleebeat-v2.mp4` |
| AUTH-04 forgot-password request | `E2E-AUTH-04-forgot-password-request-clean.mp4` |
| AUTH-05 Gmail open attempt | `E2E-AUTH-05-reset-mailbox-gmail-code.mp4` |
| LOG-01 food search add/readback | `E2E-LOG-01-food-search-add-readback.mp4` |
| NAV-01 bottom tabs | `E2E-NAV-01-bottom-tabs-all.mp4` |
| NAV-02 bottom nav visual audit | `E2E-NAV-02-bottom-nav-visual-audit.mp4` |
| STATS/PROFILE navigation | `E2E-STATS-PROFILE-01-stats-profile-navigation.mp4` |

## Flow Results

### APK-00 Build/Install Proof

Result: PASS

The APK built successfully after fixing invalid PNG assets. The package dump confirms a same-day install/update time and the expected package id. Launch screenshot confirms the newly installed app opened from clean state.

### AUTH-01 Email Login

Result: PASS, degraded

The real-device login script authenticated using the owner-supplied demo account and reached an authenticated Home state. The harness reported degraded status because UIAutomator was unreliable on the Xiaomi device and coordinate fallback was used.

Evidence:
- `_logs/real-device-adb/2026-05-20T09-59-06-167Z-login-real/`
- `E2E-AUTH-01-email-login-success.mp4`

### AUTH-03 Google Login

Result: PASS, degraded

Google account picker appeared and the selected on-device Google account returned to the app. First login for that Google account triggered onboarding, which completed into the app. A second Google recording returned to an authenticated app surface. The final v2 screenshot landed on Notifications after a coordinate tap, so it proves auth return but is not a clean Home-only ending.

Evidence:
- `AUTH-03-after-google-tap.png`
- `AUTH-03-after-account-select.png`
- `AUTH-03-google-final.png`
- `AUTH-03-home-after-google.png`
- `AUTH-03-google-v2-final.png`

### AUTH-04 Forgot Password Request

Result: PASS

The app entered the OTP step after submitting the demo email. No `devResetCode`, no auto-filled OTP, and no visible `MÃ DEV` style dev card appeared. This validates the mobile-side removal of dev-code UX for release APK.

Evidence:
- `AUTH-04-keyevent-after-submit2.png`
- `E2E-AUTH-04-forgot-password-request-clean.mp4`

### AUTH-05 Reset Via Gmail

Result: BLOCKED

Gmail opened successfully, but the mailbox shown on the device did not show the demo account reset email. Because the plan requires reading a real reset email from Gmail and not using backend/dev codes, this flow was stopped as an environment blocker.

Evidence:
- `AUTH-05-gmail-open.png`
- `E2E-AUTH-05-reset-mailbox-gmail-code.mp4`

### LOG-01 Food Search Add/Readback

Result: PASS, degraded

A clean harness run passed food search add/readback and diary totals updated. The harness failed to pull its own long screenrecord on MIUI, so a separate manual `adb screenrecord` video was captured for the same flow family.

Evidence:
- `_logs/real-device-adb/2026-05-20T10-13-13-054Z-food-search-ui-readback/`
- `E2E-LOG-01-food-search-add-readback.mp4`

### SCAN-01 Gallery Scan Save

Result: FAIL

The scan save/readback flow failed with HTTP 400. The returned backend message contained mojibake in the captured report, indicating at least one API/error path still has encoding handling risk. This should block claiming scan-save production readiness.

Evidence:
- `_logs/real-device-adb/2026-05-20T10-16-40-817Z-scan-save-readback/`

### VOICE-01 Voice/Text Command

Result: PASS, degraded

The voice text fallback readback passed in the harness, but the built-in recorder failed to pull the mp4 from the device. The flow is functionally passed, but dedicated video evidence still needs a clean manual recording.

Evidence:
- `_logs/real-device-adb/2026-05-20T10-19-14-944Z-voice-text-readback/`

### NAV-01, PROFILE-01, NOTIF-01

Result: PASS, degraded

Bottom tab traversal, profile/stats navigation, and notification surface navigation did not crash or blank. No evidence showed two MoChi surfaces at the same time. The first-login MoChi tutorial can still dominate the Home surface until dismissed, which is expected but should be reviewed for CTA obstruction.

Evidence:
- `E2E-NAV-01-bottom-tabs-all.mp4`
- `E2E-NAV-02-bottom-nav-visual-audit.mp4`
- `E2E-STATS-PROFILE-01-stats-profile-navigation.mp4`
- `AUTH-03-google-v2-final.png`

## Production Findings

1. Blocker: scan save/readback fails on real device.
   - Risk: the app advertises AI scan, but a normal scan-save flow can fail after user effort.
   - Next check: inspect backend validation payload for scan save and fix the 400 path. Add a real-device regression around the exact payload.

2. Blocker: reset-password mailbox cannot be completed on the current device setup.
   - Risk: final proof does not yet cover real mailbox OTP retrieval and password restoration.
   - Next check: add the demo Gmail mailbox to the device or provide a reachable mailbox for the demo app account, then rerun AUTH-05 and AUTH-06.

3. High: SecureStore oversized value warnings after login.
   - Risk: token/session persistence may silently become unreliable on some devices.
   - Next check: inspect what is stored in SecureStore and move bulky user/profile payloads to AsyncStorage or API refetch.

4. Medium: MIUI UIAutomator instability.
   - Risk: future automation can false-fail if it depends only on UI dump markers.
   - Next check: keep screenshot/video evidence and add coordinate fallback only for stable, documented device test flows.

5. Medium: first Google login routes through full onboarding.
   - Risk: acceptable for a new account, but E2E assertions need to distinguish “auth succeeded but onboarding required” from Home-ready login.
   - Next check: split Google login testcase into first-time and returning-user variants.

## Retest Checklist

1. Fix `SCAN-01` backend 400 and mojibake error path.
2. Add demo Gmail mailbox to the device or switch demo reset account to an accessible real mailbox.
3. Rerun AUTH-05, AUTH-06, SCAN-01, SCAN-02, DIARY-01, DIARY-02, LOG-02, LOG-03.
4. Capture a dedicated manual `VOICE-01` mp4.
5. Run a final pass where `SESSION-01` starts from Home, logs out, and logs back in cleanly.

