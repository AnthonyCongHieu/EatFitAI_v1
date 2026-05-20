# EatFitAI Full App E2E Recording Runbook

Created: 2026-05-20  
Scope: planning only, no build/install/device action performed while writing this document.

## Goal

Create a repeatable QA process where a tester records every major EatFitAI flow as a separate end-to-end video. The process must cover not only happy paths, but also wrong input, cancel/back behavior, state readback, MoChi/notification overlap, and whether the daily nutrition loop is actually useful.

This runbook is intentionally detailed so another machine/tester can reproduce the evidence without guessing where to tap next.

## External References Used

- Android adb official docs: `adb` supports selecting a target device with `-s`, installing APKs, pulling files, `screencap`, and `screenrecord`.
- Android `screenrecord` official docs: records MP4, no audio, default/native orientation, max `--time-limit` is 180 seconds.
- Android UIAutomator official docs: hierarchy dump can export XML, but it should be treated as support evidence rather than the only source of truth.
- Expo EAS Build official docs: internal distribution build profiles can generate installable Android APKs.

## Non-Negotiable Recording Rules

1. One E2E goal equals one video.
2. Do not record one giant app tour as the primary evidence.
3. Keep each video under 150 seconds when possible, because `adb screenrecord` max is 180 seconds.
4. Lock phone orientation before recording. Do not rotate during a video.
5. Start each recording from a clearly named state.
6. End each recording only after the result is visible.
7. If the flow leaves EatFitAI unexpectedly, stop and mark the testcase blocked or failed.
8. Passwords must be typed only into hidden fields.
9. Written report must redact passwords, JWTs, refresh tokens, reset OTPs, and email content that is not necessary for proof.
10. Videos may naturally show Google/Gmail/OTP evidence, but reports must not transcribe OTP values.

## Artifact Structure

Recommended root:

```text
_logs/full-app-e2e/<YYYY-MM-DDTHH-mm-ss>/
```

Folder layout:

```text
_logs/full-app-e2e/<timestamp>/
  00-environment/
    device.txt
    app-package.txt
    apk-proof.txt
    qa-notes.md
  AUTH-01-email-login-success/
    video.mp4
    notes.md
    logcat-redacted.txt
  AUTH-03A-google-login-returning-user/
    video.mp4
    notes.md
    logcat-redacted.txt
  ...
  MANIFEST.md
  EXECUTION_REPORT.md
```

Each `notes.md` should use this template:

```markdown
# <ID> <Flow Name>

Result: PASS | FAIL | BLOCKED | DEGRADED

Start state:

End state:

Steps actually performed:
1.
2.
3.

Expected:

Observed:

Production judgment:

MoChi/overlay/toast check:

Data readback check:

Issues:
- Severity:
- Evidence timestamp:
- Repro step:

Redaction notes:
```

## Recording Naming Convention

Use this pattern:

```text
E2E-<ID>-<short-kebab-flow-name>.mp4
```

Examples:

```text
E2E-AUTH-01-email-login-success.mp4
E2E-AUTH-03A-google-login-returning-user.mp4
E2E-AUTH-05-reset-mailbox-gmail-code.mp4
E2E-HOME-04-over-target-recovery.mp4
E2E-SCAN-01-gallery-food-scan-save.mp4
E2E-MOCHI-03-toast-overlay-collision.mp4
```

## Recording Command Template For Future Execution

This is documentation only. Do not run it while preparing this plan.

```powershell
$env:ANDROID_SERIAL = "<real_device_serial>"
$root = Resolve-Path "_logs\full-app-e2e\<timestamp>"
$id = "AUTH-01"
$name = "email-login-success"
$caseDir = Join-Path $root "$id-$name"
New-Item -ItemType Directory -Force $caseDir | Out-Null

$remote = "/sdcard/E2E-$id-$name.mp4"
$local = Join-Path $caseDir "video.mp4"

adb -s $env:ANDROID_SERIAL shell rm -f $remote
$rec = Start-Process adb -ArgumentList @(
  "-s", $env:ANDROID_SERIAL,
  "shell", "screenrecord",
  "--time-limit", "150",
  $remote
) -PassThru -WindowStyle Hidden

# Tester performs the manual E2E flow here.

Wait-Process -Id $rec.Id -Timeout 160
adb -s $env:ANDROID_SERIAL pull $remote $local
```

## Execution Phases

### Phase 0: Environment And Stale Build Guard

Purpose: prove every later video is running the intended build.

Record:

- `APK-00` launch proof.
- `APK-01` relaunch proof.

Manual checklist:

1. Confirm device serial is the intended real phone.
2. Confirm package id is `com.eatfitai.app`.
3. Confirm install/update timestamp is newer than APK build timestamp.
4. Confirm version name/code.
5. Confirm app data state before auth flows.
6. Confirm crash logcat is empty after launch.

Fail if:

- Package timestamp is older than current APK.
- App opens a visibly old UI.
- Splash hangs.
- Crash appears before auth screen.

### Phase 1: Auth Branches

Auth must be split because users enter the product through different doors.

#### AUTH-00 Welcome Choice Map

Start: fresh logged-out app.

Steps:

1. Open app.
2. Observe Welcome.
3. Tap `Continue with Email`, then return.
4. Tap `Continue with Google`, stop at account picker then cancel.
5. Tap register link if visible, then return.

Expected:

- Every visible CTA has one clear destination.
- Cancel from Google returns to EatFitAI.
- No spinner remains after cancel.

#### AUTH-01 Email Login Success

Start: Login screen.

Steps:

1. Tap email field.
2. Enter demo email.
3. Tap password field.
4. Enter password into hidden field.
5. Tap eye icon once, then hide again if this does not expose password in final video policy; otherwise skip eye in credential video and cover it in `AUTH-12`.
6. Tap login.
7. Wait for Home.

Expected:

- Home appears.
- No auth loop.
- No duplicated MoChi/toast immediately after login.

#### AUTH-02 Wrong Password

Start: Login screen with no session.

Steps:

1. Enter valid demo email.
2. Enter intentionally wrong password.
3. Tap login.
4. Wait for validation.
5. Try tapping login again without changing password.

Expected:

- Error is visible.
- Password remains hidden.
- Login button recovers from loading state.
- No token/session stored.

#### AUTH-03A Google Returning User

Start: logged out, Google account already has EatFitAI profile.

Steps:

1. Tap Google login.
2. Select `hieuleebeat@gmail.com` if that is the intended test account.
3. Wait for return to EatFitAI.
4. Observe whether it lands on Home or onboarding.

Expected:

- Returning profile lands in app shell.
- Account picker is the only external Google surface.
- If onboarding appears, classify as first-time variant, not failure.

#### AUTH-03B Google First-Time User

Start: logged out, Google account has no complete EatFitAI profile.

Steps:

1. Tap Google login.
2. Pick account.
3. Complete onboarding step by step.
4. Finish onboarding.
5. Observe first Home and MoChi tutorial.

Expected:

- Onboarding fields validate.
- User lands on Home.
- Only one MoChi tutorial/overlay is visible.

#### AUTH-04 Forgot Password Request

Start: Login screen.

Steps:

1. Tap forgot password.
2. Enter demo email.
3. Tap send code.
4. Wait for OTP step.

Expected:

- OTP step appears.
- App says to check email.
- No dev code visible.
- OTP is not autofilled from backend response.

#### AUTH-05 Reset Via Gmail

Start: Forgot password OTP step.

Steps:

1. Leave EatFitAI only by opening Gmail.
2. Confirm Gmail is showing the mailbox that receives demo reset mail.
3. Search or locate latest EatFitAI reset email.
4. Read OTP.
5. Return to EatFitAI.
6. Enter OTP.
7. Tap confirm.

Expected:

- External surface is Gmail only.
- OTP comes from real email.
- App proceeds to new password step.

Blocker classification:

- If Gmail is signed into the wrong mailbox, mark `BLOCKED_ENV_MAILBOX`.
- If Gmail requires 2FA/security challenge, mark `BLOCKED_ENV_GOOGLE_SECURITY`.
- If EatFitAI email never arrives, mark `FAIL_EMAIL_DELIVERY` if mailbox is correct.

#### AUTH-06 Reset Complete And Login

Start: New password step.

Steps:

1. Enter temporary password into hidden field.
2. Confirm password.
3. Submit reset.
4. Login with temporary password.
5. Restore original password through Change Password or repeat reset.
6. Login with original password.

Expected:

- Temporary login works.
- Original password is restored before ending QA.
- Written report does not include either password.

### Phase 2: First-Run Onboarding And Daily Loop

#### ONB-01 Complete Onboarding

Record all steps from first onboarding screen to Home.

Watch:

- Required field validation.
- Numeric keyboard behavior.
- Goal copy.
- Health/safety wording.
- Final transition into Home.

#### HOME-01 No-Log Daily Loop

Start: logged in user with no meals today.

Steps:

1. Open Home.
2. Read primary daily action.
3. Open quick add/search from the daily action.
4. Return without saving.

Expected:

- Home answers "what should I do next?"
- It does not show an always-redundant card if MoChi already provides the action.

#### HOME-02 Partial-Day Daily Loop

Start: one meal exists today.

Steps:

1. Open Home.
2. Observe totals and missing meal/action.
3. Tap action to add next meal.
4. Cancel back to Home.

Expected:

- Partial status is clear.
- Next action matches missing meal or useful recovery.

#### HOME-04 Over-Target Recovery

Start: day calories above target.

Steps:

1. Open Home.
2. Observe recovery message.
3. Tap suggested action if available.
4. Return to Home.

Expected:

- Copy is non-judgmental.
- It suggests adjustment, not meal skipping.

#### HOME-05 Under-Target Recovery

Start: day calories far under target.

Steps:

1. Open Home.
2. Observe under-target guidance.
3. Tap snack/search suggestion if available.

Expected:

- Suggests practical snack/addition.
- Does not shame or panic user.

### Phase 3: Diary CRUD And Food Logging

#### DIARY-02 Search Add Food

Start: logged in, Diary tab.

Steps:

1. Tap add/search.
2. Search a common Vietnamese food.
3. Open result or quick-add.
4. Select meal type.
5. Save.
6. Return to Diary.
7. Verify entry and totals.
8. Go Home and verify totals changed.

Expected:

- The saved meal is visible.
- Home and Diary agree.

#### DIARY-04 Edit Meal

Start: Diary with known entry.

Steps:

1. Open entry.
2. Edit grams/serving.
3. Save.
4. Read Diary totals.
5. Reopen entry.

Expected:

- Entry changed, not duplicated.
- Calories/macros scale.

#### DIARY-05 Delete Meal

Start: Diary with known entry.

Steps:

1. Open entry actions.
2. Tap delete.
3. Cancel once in separate run if needed.
4. Confirm delete.
5. Verify entry removed and totals update.

Expected:

- Confirmation protects from accidental delete.
- Totals update.

#### DIARY-07 Recent Quick Add

Start: recent food exists.

Steps:

1. Open FoodSearch.
2. Switch to recent.
3. Quick-add a recent food.
4. Verify Diary readback.

Expected:

- Under 30 seconds for tester using prepared state.
- No unnecessary deep edit screen unless confidence/serving requires it.

### Phase 4: Scan, Barcode, Review

#### SCAN-01 Gallery Scan Save

Start: logged in, prepared food image in album.

Steps:

1. Open scan from Home or MoChi hub.
2. Tap gallery.
3. Pick prepared food image.
4. Wait for detection.
5. Review detected food/source/confidence.
6. Adjust grams if needed.
7. Save to Diary.
8. Verify readback in Diary and Home.

Expected:

- Low confidence requires review.
- Save does not fail.
- Missing nutrients are not presented as zero.

#### SCAN-04 Gallery Cancel

Start: scan screen.

Steps:

1. Tap gallery.
2. Cancel picker.
3. Return to scan.
4. Tap back to Home.

Expected:

- No stuck loading.
- No phantom image selected.

#### SCAN-07 Barcode Mode

Start: scan screen, barcode product ready.

Steps:

1. Switch to barcode lane.
2. Scan barcode.
3. Observe result source.
4. Save or gracefully fallback.

Expected:

- Barcode result is labeled as barcode/provider source.
- Unknown barcode offers fallback.

### Phase 5: Voice/Text Command

#### VOICE-01 Text Command Add Food

Start: Voice tab.

Steps:

1. Tap text input.
2. Type a natural Vietnamese command, for example "thêm 2 quả trứng vào bữa sáng".
3. Tap process/send.
4. Review result.
5. Confirm if required.
6. Verify Diary readback.

Expected:

- App does not hallucinate unsupported command.
- Creates meal only after clear review/confirmation when needed.

#### VOICE-02 Mic Record

Start: Voice tab, mic permission available.

Steps:

1. Tap mic.
2. Speak command manually.
3. Stop recording.
4. Wait for parse.
5. Confirm or record fallback.

Expected:

- Recording animation is clear.
- Since `screenrecord` has no audio, notes must describe spoken phrase.

### Phase 6: Stats, Weekly Coach, Target

#### STATS-01 Stats Overview

Start: logged in.

Steps:

1. Tap Stats tab.
2. Observe summary.
3. Switch week/month if available.
4. Pull refresh if available.

Expected:

- Empty/weak data states are honest.
- No blank charts.

#### STATS-03 Weekly One Action

Start: user with enough data or seeded data.

Steps:

1. Open weekly review.
2. Read the review.
3. Tap accept/done/snooze/replace if visible.
4. Reopen review.

Expected:

- One primary action, not a long insight list.
- Outcome persists.

#### STATS-07 Adaptive Target Suggestion

Start: enough clean data.

Steps:

1. Open target/adaptive suggestion surface.
2. Read explanation.
3. Dismiss or apply only if this is a prepared account.
4. Verify undo path if applied.

Expected:

- No auto-apply without explicit user action.
- Explanation includes data quality/period reason.

### Phase 7: Profile And Settings

#### PROF-02 Edit Profile

Start: Profile tab.

Steps:

1. Open Edit Profile.
2. Change a harmless field.
3. Save.
4. Return/reopen.

Expected:

- Field persists.
- No mojibake.

#### PROF-03 Body Metrics

Start: Profile.

Steps:

1. Open Body Metrics.
2. Open Basic Info if linked.
3. Update safe metric value.
4. Save.
5. Return to Profile/Stats.

Expected:

- Target/BMI dependent UI refreshes.
- Invalid values are blocked.

#### PROF-08 Notification Settings

Start: Profile.

Steps:

1. Open Notifications settings.
2. Toggle one setting.
3. Change quiet-hour/cooldown if visible.
4. Save/back.
5. Reopen.

Expected:

- Setting persists.
- Copy implies smart reminders, not noisy fixed spam.

### Phase 8: MoChi And Overlay Governance

Run these after normal functional flows because they depend on collision points.

#### MOCHI-01 First Login Tutorial

Start: first Home after onboarding.

Steps:

1. Observe tutorial.
2. Step through all tutorial pages.
3. Finish.
4. Navigate Home -> Diary -> Home.

Expected:

- Tutorial does not replay immediately.
- No second MoChi surface appears behind it.

#### MOCHI-02 MoChi Hub

Start: logged in Home.

Steps:

1. Tap center bottom MoChi command.
2. Observe sheet/hub.
3. Tap each visible safe action without committing destructive state, or record planned destination.
4. Close hub.

Expected:

- Hub opens once.
- It does not stack with another overlay or permanent card.

#### MOCHI-03 Toast/Overlay Collision

Start: flow that triggers toast, such as save meal.

Steps:

1. Trigger action that shows toast.
2. Observe whether MoChi inline/overlay is also visible.
3. Try tapping the primary next CTA.

Expected:

- Toast does not block primary CTA.
- Only one major MoChi surface is visible.

### Phase 9: Full Navigation Sweep

This is supplementary, not a replacement for per-flow videos.

Steps:

1. Start on Home.
2. Visit all bottom tabs twice.
3. From Home open notification, streak, settings/avatar.
4. From Diary open search, detail, custom dish, common meals.
5. From Scan open gallery then cancel.
6. From Voice open text command then back.
7. From Stats open week/month/insight if available.
8. From Profile open each menu item and back.

Expected:

- No blank screen.
- Android back behavior remains understandable.
- Bottom tab selected state stays correct.
- No accumulated overlays.

## Production Review Rubric

Score each completed testcase:

| Score | Meaning |
|---:|---|
| 5 | Production-ready: clear, useful, stable, readback verified |
| 4 | Good: minor UX issue but no functional risk |
| 3 | Works but confusing: user may complete it with friction |
| 2 | Degraded: pass requires tester knowledge or retry |
| 1 | Fail: normal user likely blocked |
| 0 | Blocked/unavailable: cannot evaluate due environment or crash |

Each flow must answer:

1. Did the user know what to do next?
2. Did the app give feedback after each tap?
3. Did state persist/read back?
4. Did the nutrition loop become more useful after the action?
5. Did MoChi help without crowding the UI?
6. Did Vietnamese text remain correct?
7. Did the app avoid medical/safety overclaiming?

## Execution Order For The Next QA Session

Recommended order:

1. Environment proof: `APK-00`, `APK-01`
2. Auth foundations: `AUTH-00`, `AUTH-01`, `AUTH-02`
3. Google branch: `AUTH-03A`, `AUTH-03B`, `AUTH-03C`
4. Reset branch: `AUTH-04`, `AUTH-05`, `AUTH-06`, `AUTH-07`
5. Onboarding: `ONB-01`, `ONB-05`
6. Daily loop: `HOME-01` through `HOME-05`, `HOME-10`
7. Diary CRUD: `DIARY-01` through `DIARY-08`
8. Scan/barcode: `SCAN-01` through `SCAN-08`
9. Voice: `VOICE-01` through `VOICE-06`
10. Stats/weekly/adaptive: `STATS-01` through `STATS-08`
11. Profile/settings: `PROF-01` through `PROF-10`
12. MoChi governance: `MOCHI-01` through `MOCHI-06`
13. Full navigation sweep: `NAV-01` through `NAV-05`
14. Error/offline/performance feel: `ERR-01` through `PERF-02`

## What Not To Do

- Do not mark a flow pass if only the screen opened.
- Do not merge Google login and email login into one testcase.
- Do not merge forgot-password request and Gmail OTP retrieval into one vague "reset works" claim.
- Do not accept a backend/dev reset code as mailbox proof.
- Do not keep recording after the tester is unexpectedly outside EatFitAI, except for allowed Google/Gmail/gallery/permission surfaces.
- Do not ignore MoChi duplication just because the core CRUD action passed.
- Do not use Expo Go evidence as APK evidence.
- Do not treat a smoke script pass as production UX pass without watching the video.

## Final Report Template

```markdown
# EatFitAI Full App E2E Recording Report

Run timestamp:
APK/package proof:
Device:
Tester:

## Summary

Total testcases planned:
Executed:
PASS:
FAIL:
DEGRADED:
BLOCKED:
NOT RUN:

## Release Verdict

Verdict: PASS | NO-GO

Reasons:

## P0 Results

| ID | Result | Video | Notes |
|---|---|---|---|

## Product Findings

| Priority | Area | Finding | Evidence | Recommendation |
|---|---|---|---|---|

## MoChi/Overlay Findings

| Flow | Surfaces visible | Issue | Severity |
|---|---|---|---|

## Reset/Auth Evidence

Google account picker:
Gmail mailbox:
Password restoration:

## Data Integrity Evidence

Diary add/edit/delete:
Home totals:
Stats readback:

## Remaining Gaps

## Final Decision
```

