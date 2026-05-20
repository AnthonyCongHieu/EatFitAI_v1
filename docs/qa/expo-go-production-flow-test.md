# EatFitAI Expo Go Production Flow Test

Mục tiêu của tài liệu này là giúp một máy khác chạy lại cùng một quy trình QA cho Expo Go, có video, screenshot, UI dump, logcat và checklist đánh giá theo chuẩn production.

## Nguyên tắc an toàn

- Chỉ thao tác trong Expo Go package `host.exp.exponent` khi chạy harness Expo Go.
- Nếu foreground package lệch khỏi Expo Go ngoài ý muốn, dừng ngay và ghi lại bằng chứng.
- Không bấm mò theo screenshot. Ưu tiên UIAutomator text/accessibility bounds, chỉ fallback tọa độ khi node không dump được.
- Không dùng dữ liệu nhạy cảm thật. Dùng tài khoản demo hoặc biến môi trường local.
- Logcat phải được redact token trước khi commit evidence.
- Không đánh dấu pass chỉ vì màn hình “trông giống đúng”; phải có screenshot, UI dump hoặc lý do visual fallback rõ ràng.

## Chuẩn bị thiết bị

1. Cắm Android thật hoặc emulator, bật USB debugging.
2. Kiểm tra ADB:

```powershell
adb devices
```

3. Nếu có nhiều device, set serial:

```powershell
$env:ANDROID_SERIAL="device_serial"
```

4. Đảm bảo Expo Go đã cài và đang đăng nhập được app EatFitAI.
5. Chạy Metro local hoặc để harness tự khởi động:

```powershell
npm --prefix .\eatfitai-mobile run dev -- --localhost --port 8081
```

## Expo Go audit có record

Chạy:

```powershell
npm --prefix .\eatfitai-mobile run device:expo-go-flow-audit:android
```

Chạy deep mode khi muốn test tạo diary entry qua UI. Luồng này có ghi dữ liệu mới vào tài khoản đang đăng nhập trong Expo Go:

```powershell
$env:EXPO_GO_AUDIT_DEEP="1"
$env:EXPO_GO_AUDIT_FOOD_QUERY="rice"
npm --prefix .\eatfitai-mobile run device:expo-go-flow-audit:android
```

Output nằm tại:

```text
_logs/expo-go-flow-audit/<timestamp>/
```

Các artifact bắt buộc:

- `expo-go-flow.mp4`: video toàn bộ luồng.
- `review.md`: báo cáo đọc nhanh.
- `report.json`: dữ liệu machine-readable.
- `*.png`: screenshot từng checkpoint.
- `*-ui.xml`: UI tree khi dump được.
- `logcat-tail.txt`: logcat đã redact token.

## Click strategy chuẩn

Harness dùng thứ tự sau:

1. Dump UI tree bằng `uiautomator`.
2. Tìm node theo `text`, `content-desc`, hoặc `resource-id`.
3. Ưu tiên node exact match và `clickable="true"`.
4. Tap tâm bounds của node.
5. Nếu UI tree không có node, fallback tọa độ theo tỉ lệ màn hình và ghi `ratio-fallback` vào `Interaction Trace`.

Các click chính hiện tại:

| Action | Target | Expected |
| --- | --- | --- |
| Mở MoChi hub | Bottom center dock | Sheet `MOCHI THÊM NHANH` mở |
| Thêm bữa | `Thêm bữa` | Food Search screen |
| Quét thức ăn | `Quét thức ăn` | AI Food Scanner camera screen |
| Giọng nói | `Giọng nói` | Voice assistant screen |
| Nhật ký | Bottom diary tab | Meal Diary screen |
| Thống kê | Bottom stats tab | Stats screen |
| Cá nhân | Bottom profile tab | Profile screen |

## Production test cases

### P0 - Navigation and Daily Loop surface

| ID | Steps | Expected |
| --- | --- | --- |
| NAV-01 | Open Expo Go app | Home loads, no fixed Daily Loop card, dashboard still usable |
| NAV-02 | Scroll Home down/up | No text overlap, bottom nav remains usable |
| NAV-03 | Tap Diary, Stats, Profile | Each tab loads with stable title/content |
| NAV-04 | Open MoChi hub from Home | Only one MoChi surface is visible; no toast/overlay/card stacking |
| NAV-05 | Open MoChi hub from Profile | Sheet works outside Home without duplicate MoChi |

### P0 - Logging loop

| ID | Steps | Expected |
| --- | --- | --- |
| LOG-01 | MoChi hub -> Thêm bữa | Food Search opens |
| LOG-02 | Type a simple food query, e.g. `banana` | Results show or empty state is explicit |
| LOG-03 | Add first result if available | Diary readback count increases |
| LOG-04 | Return Home | Home remaining calories and diary list update |
| LOG-05 | Re-open Diary | Added item remains visible |

### P0 - Scan loop

| ID | Steps | Expected |
| --- | --- | --- |
| SCAN-01 | MoChi hub -> Quét thức ăn | Camera screen opens |
| SCAN-02 | Tap `Chọn từ thư viện` | Android picker is the only accepted intentional app switch |
| SCAN-03 | Select prepared food image | App returns to scan/review flow |
| SCAN-04 | If confidence is low/medium | User must review before save |
| SCAN-05 | Save confirmed result | Diary readback confirms entry |

Automation note: the Expo Go harness records SCAN-01 as `VISUAL` because camera screens may not expose UI XML. Album picking is manual unless a stable test media provider is available.

### P0 - Voice loop

| ID | Steps | Expected |
| --- | --- | --- |
| VOICE-01 | MoChi hub -> Giọng nói | Voice screen opens |
| VOICE-02 | Type `add 100 grams banana to snack` | Text remains readable, keyboard does not hide primary action |
| VOICE-03 | Execute | App returns review/result or explicit error |
| VOICE-04 | Save/confirm if result appears | Diary readback confirms entry |

Automation note: if microphone recording is unstable, type command manually. This still validates the voice execution/review path.

### P1 - CRUD/readback

| ID | Steps | Expected |
| --- | --- | --- |
| CRUD-01 | Create diary entry via UI/API smoke | Backend returns entry id |
| CRUD-02 | Read diary day | New entry appears, baseline count increases |
| CRUD-03 | Update amount/grams if UI supports it | Calories/macros update and persist |
| CRUD-04 | Delete entry if UI supports it | Entry removed and totals update |

Current deterministic scripts cover create/readback. Update/delete should be added only after stable UI markers exist for edit/delete controls.

Expo Go deep mode currently covers create/readback visually through Food Search. API-level readback for the same Expo Go session is intentionally not inferred unless the auth token for that exact session is available.

Automation note: avoid Telex-sensitive strings such as `banana` on devices using a Vietnamese keyboard, because Android key events can be transformed into accented text before React Native receives them. Use `rice` for smoke automation, and keep `banana`/Vietnamese normalization as a separate product search test.

## Existing device commands

Use these only when a native Android build `com.eatfitai.app` is installed and proven to be the current build. They are not Expo Go commands.

Native version gate before any non-Expo conclusion:

```powershell
adb -s <serial> shell dumpsys package com.eatfitai.app | Select-String -Pattern 'versionName|versionCode|firstInstallTime|lastUpdateTime'
```

Minimum rule:

- If `lastUpdateTime` is older than the code change being tested, do not use the native app result.
- If the app was not installed by the current branch/build lane, mark the result as stale.
- If using native readback scripts, set both guards explicitly:

```powershell
$env:EATFITAI_ANDROID_TARGET="real-device"
$env:ANDROID_SERIAL="<serial>"
```

If the installed native app is stale, reinstall the current build first or run the Expo Go harness instead.

```powershell
npm --prefix .\eatfitai-mobile run device:full-tab-ui-smoke:android
npm --prefix .\eatfitai-mobile run device:food-search-ui-readback:android
npm --prefix .\eatfitai-mobile run device:scan-save-readback:android
npm --prefix .\eatfitai-mobile run device:voice-text-readback:android
npm --prefix .\eatfitai-mobile run device:stats-profile-smoke:android
```

Use Expo Go command first for this lane:

```powershell
npm --prefix .\eatfitai-mobile run device:expo-go-flow-audit:android
```

## MoChi review checklist

MoChi is allowed in one active surface at a time:

- Dock sprite at bottom navigation.
- Hub sheet anchored from dock.
- Overlay nudge.
- Toast.
- Inline notice.

Fail if any screen shows two independent MoChi surfaces at once, for example dock sprite plus overlay sprite plus toast sprite, or a fixed card containing another MoChi while the hub is open.

Expected current behavior:

- Home does not show the old fixed Daily Loop card.
- The daily loop recommendation can feed MoChi context.
- When a richer MoChi surface is active, the dock should behave as the anchor/control, not spawn a second standalone overlay.

## Strict production review notes

Treat these as blockers:

- Crash, ANR, redbox, auth loop, or token leak in logcat.
- Blank screen after navigation.
- Transition leaves the previous screen visible for more than a normal animation moment.
- Bottom nav blocked by keyboard/sheet/system gesture bar.
- Low-confidence AI save without review.
- Missing nutrient shown as zero instead of unknown/missing.
- Notification/toast appears while a MoChi overlay or sheet is already active.

Treat these as polish issues:

- A title or button wraps awkwardly but remains usable.
- Skeleton/loading state is visible briefly under normal network delay.
- Camera UI cannot expose UI XML but visual screenshot is correct.

## Evidence review

Before marking a run pass:

1. Open `review.md`.
2. Check every row is `PASS` or a justified `VISUAL`.
3. Open `expo-go-flow.mp4`.
4. Inspect Home, MoChi hub, Add Meal, Scan, Voice screenshots.
5. Search logcat:

```powershell
Select-String -Path .\_logs\expo-go-flow-audit\<timestamp>\logcat-tail.txt -Pattern 'FATAL EXCEPTION|ANR|ReactNativeJS|Error:|Exception|Unable to|Network Error|redbox|Invariant Violation|Bearer' -CaseSensitive:$false
```

6. Run code gates:

```powershell
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile test -- --runInBand deviceAutomationMarkers
python .\scripts\cloud\check_mojibake.py
```
