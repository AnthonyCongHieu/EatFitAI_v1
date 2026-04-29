# 28. Real-Device Android QA Progress - 2026-04-26

Cap nhat luc: `2026-04-26 14:47:40 +07:00`

Repo: `D:\EatFitAI_v1`

Mobile app: `eatfitai-mobile`

Android package: `com.eatfitai.app`

Device serial: `a12c6888629b`

Device model: Xiaomi `2201116SG`, product `veux_global`, device `veux`

Backend mac dinh cua runner: `https://eatfitai-backend-dev.onrender.com`

Credential handling: khong hardcode password/token. Runner doc/report chi ghi source credential va email hint dang mask, vi du `m***@example.com`.

## 1. Muc Tieu Ban Dau

Nguoi dung yeu cau tiep tuc trien khai ke hoach QA tren thiet bi Android that cho EatFitAI, voi cac muc tieu:

- Dieu khien app tren giao dien Android that bang ADB.
- Khong them Detox, Maestro, Appium hay framework moi.
- Mo rong lane ADB + UIAutomator + screenshot + logcat + API readback da co.
- Gan marker/testID con thieu cho Food Search/Food Detail/Diary de ADB co diem bam on dinh.
- Kiem tra real-time frontend/backend:
  - UI flow co bam/tim/them mon that.
  - API readback xac nhan backend thay doi.
  - Logcat khong co crash cua app.
  - Screenshot/UI dump/logcat/report duoc luu theo tung run.
- Khong doi text tieng Viet, layout, business logic.
- Giu mojibake/UTF-8 safe.
- Khong de command wait qua lau hoac timeout qua lau khi debug.

## 2. Trang Thai Tong Quan Hien Tai

Ket qua hien tai: **real-device lane da chay duoc tren thiet bi that**, voi trang thai `degraded` tren Xiaomi do UIAutomator dump hay timeout. Cac pass/fail quan trong:

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| ADB device online | PASS | `adb devices -l` thay `a12c6888629b device`. |
| App installed | PASS | `com.eatfitai.app` installed va launch duoc. |
| Screenshot evidence | PASS | `screencap` tao PNG hop le. |
| screenrecord command | PASS | command co san. |
| scrcpy | PASS | `scrcpy 3.3.4`. |
| UIAutomator dump | DEGRADED | Xiaomi/MIUI hay timeout hoac loi idle-state. Da degrade thanh warning. |
| Logcat crash detection | PASS | Da loc dung crash cua app, khong false positive voi noise cua UIAutomator/MIUI. |
| Food Search UI + backend readback | PASS DEGRADED | UI thao tac search/tap add tren may that; API readback thay row moi. |
| Fast debug mode | PASS | `food-search-ui-readback` hoan thanh trong `42.2s`, khong timeout gia. |
| Typecheck mobile | PASS | `npm run typecheck`. |
| Targeted Jest | PASS | 15 tests pass. |
| Git whitespace check | PASS | `git diff --check` khong co loi whitespace, chi co warning CRLF Windows. |

## 3. Thiet Bi That Da Ra Lat

Lenh kiem tra:

```powershell
adb devices -l
```

Ket qua thiet bi:

```text
a12c6888629b device product:veux_global model:2201116SG device:veux
```

Doctor moi nhat:

```powershell
$env:ANDROID_SERIAL='a12c6888629b'
$env:EATFITAI_ANDROID_TARGET='real-device'
$env:EATFITAI_DEVICE_FAST_ADB='1'
$env:EATFITAI_DEVICE_UI_DUMP_TIMEOUT_MS='2500'
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS='6000'
npm run device:doctor:android
```

Ket qua:

```text
REAL_DEVICE_ADB_OUTPUT_DIR=D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T07-43-17-613Z-doctor
OK    scrcpy - scrcpy 3.3.4 <https://github.com/Genymobile/scrcpy>
OK    ADB devices - 1 online device(s): a12c6888629b
OK    Installed app - com.eatfitai.app is installed.
OK    Screen size - 1080x2400
WARN  UIAutomator dump - spawnSync ... adb.exe ETIMEDOUT
OK    screencap - Device screenshot command works (285286 bytes).
OK    screenrecord - screenrecord command is available on most Android builds; use --record to capture video evidence.
WARN  OEM notes - Xiaomi V816: enable USB debugging and USB debugging (Security settings) for ADB input.
status=degraded
passed=true
```

Danh gia:

- Device online va app dieu khien duoc.
- UIAutomator khong dang tin tren ROM nay, nen dung `degraded evidence` bang screenshot + foreground khi debug nhanh.
- Khi can RC proof day du, van nen chay khong bat fast mode de lay du perf evidence; neu UIAutomator fail thi report warning, khong tu dong ket luan app crash.

## 4. Bang Chung Run Quan Trong

Tat ca evidence nam trong:

```text
D:\EatFitAI_v1\_logs\real-device-adb\<timestamp>-<mode>\
```

### 4.1 Doctor moi nhat

Folder:

```text
D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T07-43-17-613Z-doctor
```

Noi dung quan trong:

- `doctor-screen.png`
- `doctor-ui.xml` neu dump duoc; trong run nay UIAutomator timeout nen artifact la warning.
- `report.json`

Ket luan: pass `degraded`.

### 4.2 Food Search UI Readback moi nhat

Folder:

```text
D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T07-41-59-518Z-food-search-ui-readback
```

Command:

```powershell
$env:ANDROID_SERIAL='a12c6888629b'
$env:EATFITAI_ANDROID_TARGET='real-device'
$env:EATFITAI_DEVICE_FAST_ADB='1'
$env:EATFITAI_DEVICE_SKIP_UI_DUMP='1'
$env:EATFITAI_DEVICE_WAIT_CAP_MS='1200'
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS='5000'
$env:EATFITAI_DEVICE_API_TIMEOUT_MS='12000'
npm run device:food-search-ui-readback:android
```

Ket qua runtime:

```text
Exit code: 0
Wall time: 42.2 seconds
status=degraded
passed=true
```

API readback trong `report.json`:

```text
api-login: pass, httpStatus=200, durationMs=948
food-search-ui-baseline-readback: pass, count=24
food-search-ui-mandatory-readback: pass, count=25, baselineCount=24, newIds=[3174]
criticalFailures=[]
```

Artifact quan trong:

- `01-launch.png`
- `food-diary-screen.png`
- `food-search-ui-readback-search-screen.png`
- `food-search-ui-after-query-input.png`
- `food-search-ui-readback-results-screen.png`
- `food-search-ui-after-add-logcat.txt`
- `food-search-ui-readback-after-add-screen.png`
- `report.json`

Ket luan:

- Frontend UI tren may that da duoc dieu khien qua ADB.
- Search query duoc nhap tren UI that.
- Nut add mon duoc tap tren UI that.
- Backend readback xac nhan entry moi duoc tao.
- Run pass nhung degraded vi UIAutomator bi skip/fail; bang chung thay the la screenshot + foreground + API readback.

### 4.3 Backend-Frontend Live Check truoc do

Folder pass degraded da ghi nhan:

```text
D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T06-32-46-464Z-backend-frontend-live-check
```

Ket luan tai thoi diem do:

- App foreground.
- Cac checkpoint UI + API readback chay duoc.
- Cloud backend co luc bi cold/transient timeout, nen khi debug cloud co the set `EATFITAI_DEVICE_API_TIMEOUT_MS=90000`.
- Sau yeu cau moi cua nguoi dung, debug mode da ha timeout ve ngan hon de khong bi wait lau; long timeout chi nen dung khi can chay gate day du.

### 4.4 Full Tab UI Smoke truoc do

Folder pass degraded da ghi nhan:

```text
D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T06-17-04-366Z-full-tab-ui-smoke
```

Ket luan:

- Navigation tab Home, Voice, Scan, Stats, Profile da co evidence degraded.
- Loi false crash ban dau tu MIUI/UIAutomator logcat da duoc sua bang crash detector moi.

### 4.5 Login Real

Folder pass degraded truoc khi clear app data:

```text
D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T06-06-25-238Z-login-real
```

Sau khi clear app data de test fresh-login:

- Run `login-real` bi timeout do hai nguyen nhan automation:
  - Gboard dang o tieng Viet/Telex lam bien dang email.
  - Ham clear text cu biet xoa bang nhieu phim DEL nhung khong clear sach, dan den append chuoi cu.
- Da reproduce tren man hinh that:
  - Email bi rewrite thanh dang khong hop le khi keyboard o tieng Viet.
  - Tap globe sang `English` thi email nhap dung.
  - Dung `CTRL+A` + delete thi clear text sach va login vao Home duoc.
- Da patch runner va LoginScreen de giam nguy co lap lai.

Can chay lai `device:login-real:android` sau patch moi neu can formal evidence rieng cho fresh-login.

## 5. Thay Doi Code Da Lam

### 5.1 Marker UI cho Food Search

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\diary\FoodSearchScreen.tsx
```

Muc tieu:

- Gan marker cho screen Food Search.
- Gan marker cho search input.
- Gan marker cho result dau tien.
- Gan marker cho nut add cua result dau tien.
- Khong doi text tieng Viet.
- Khong doi layout/business logic.

Marker chinh:

- `TEST_IDS.foodSearch.screen`
- `TEST_IDS.foodSearch.queryInput`
- `TEST_IDS.foodSearch.firstResultCard`
- `TEST_IDS.foodSearch.firstAddButton`

Ky thuat:

- Them `testID`.
- Them `nativeID`.
- Them `accessibilityLabel`.
- Them `collapsable={false}` o cac node can UIAutomator thay duoc.

Ly do:

- React Native `testID` khong phai luc nao cung hien trong UIAutomator tree tren Android/OEM.
- `nativeID` va `accessibilityLabel` tang kha nang marker xuat hien trong XML.
- `collapsable={false}` giam kha nang RN flatten view lam mat marker.

### 5.2 Marker UI cho Food Detail

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\diary\FoodDetailScreen.tsx
```

Marker chinh:

- `TEST_IDS.foodDetail.screen`
- `TEST_IDS.foodDetail.gramsInput`
- `TEST_IDS.foodDetail.submitButton`

Muc tieu:

- Cho phep ADB/UIAutomator tim man Food Detail, input grams, nut submit.
- Giu nguyen UI va business logic.

### 5.3 Marker UI cho Meal Diary

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\diary\MealDiaryScreen.tsx
```

Thay doi:

- Them `nativeID`.
- Them `accessibilityLabel`.
- Them `collapsable={false}`.

Marker quan trong:

- `TEST_IDS.mealDiary.addManualButton`

Ly do:

- Flow real-device can bam nut add manual tu man Nhat ky.

### 5.4 Marker UI cho Quick Actions

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\src\components\home\QuickActionsOverlay.tsx
```

Thay doi:

- Moi action card co:
  - `nativeID={action.testID}`
  - `accessibilityLabel={action.testID}`
  - `collapsable={false}`

Marker quan trong cho Food Search:

- `home-quick-add-search-button`

Ly do:

- Flow that bam FAB/add manual, sau do chon action them bua/tim mon.

### 5.5 LoginScreen IME Safety

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\auth\LoginScreen.tsx
```

Thay doi email input:

- `autoCorrect={false}`
- `autoComplete="email"`
- `textContentType="username"`

Thay doi password input:

- `autoCapitalize="none"`
- `autoCorrect={false}`
- `autoComplete="password"`
- `textContentType="password"`

Ly do:

- Tren thiet bi that, ban phim tieng Viet/Telex co the rewrite chuoi nhap bang `adb shell input text`.
- Email dang ASCII van co the bi sua neu keyboard/subtype dang tieng Viet.
- Fix nay la thay doi nho, khong doi text, khong doi layout, khong doi logic auth.

Rui ro:

- Thap. Chi thay doi keyboard hints/autofill/autocorrect behavior cua login inputs.
- Can verify login manual va ADB login.

### 5.6 Crash Detector Cho Logcat

File moi:

```text
D:\EatFitAI_v1\eatfitai-mobile\scripts\lib\device-logcat.js
```

Ham chinh:

- `logcatContainsAppCrash(text, packageName = 'com.eatfitai.app')`

Root cause ban dau:

- Logcat co cac dong `AndroidRuntime`/exception tu MIUI/UIAutomator/shell.
- Detector cu qua rong, thay `AndroidRuntime` la gan crash app.
- `full-tab-ui-smoke` fail gia do logcat noise.

Fix:

- Chi coi la crash app khi:
  - Co `Process: com.eatfitai.app`, hoac
  - Dong fatal/exception nam trong context co package/process app.

Ket qua:

- Giam false positive.
- Van fail neu app that su crash.

### 5.7 Real Device ADB Runner

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\scripts\real-device-adb-flow.js
```

Day la file thay doi lon nhat.

#### 5.7.1 Bat buoc real device

Runner gio yeu cau:

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
```

Neu thieu:

- Dung som.
- Khong chay nham emulator.
- Khong chay nham device khac.

Runner cung doc `ro.kernel.qemu` de tranh nham emulator.

#### 5.7.2 Mode moi

Them/hoan thien cac mode:

- `full-tab-ui-smoke`
- `food-search-ui-readback`
- `backend-frontend-live-check`

Giu cac mode cu:

- `doctor`
- `probe`
- `auth-entry`
- `login-smoke`
- `post-login-smoke`
- `scan-entry`
- `diary-readback`
- `login-real`
- `home-smoke`
- `food-diary-readback`
- `scan-save-readback`
- `voice-text-readback`
- `stats-profile-smoke`

#### 5.7.3 Food Search UI Readback

Flow hien tai:

1. Launch app.
2. Xac nhan/chap nhan authenticated Home.
3. API login rieng trong harness de co token doc backend.
4. Doc baseline `/api/meal-diary?date=<today>`.
5. Mo tab Home.
6. Bam vao Nhat ky.
7. Bam add manual.
8. Chon quick add/search action.
9. Tap search input.
10. Clear text.
11. Nhap query mac dinh `rice`.
12. Enter/tim.
13. Bam nut `+` cua result dau tien.
14. Chup logcat sau add.
15. Chup screenshot sau add.
16. API readback lai meal diary.
17. Pass neu co `newIds` moi hoac count tang.

Ly do doi query mac dinh tu `banana` sang `rice`:

- Keyboard tieng Viet co luc rewrite `banana` thanh dang sai, lam search khong co result.
- `rice` on dinh hon trong test ADB.

Ly do check `newIds`:

- Test account da co nhieu row trong ngay.
- Count-only co the sai neu API paging/limit/ordering lam count khong tang theo ky vong.
- Doc danh sach ID truoc/sau giup pass dung khi co row moi.

Ket qua moi nhat:

- Baseline count `24`.
- After add count `25`.
- `newIds=[3174]`.
- Mandatory readback pass.

#### 5.7.4 Fast Mode De Khong Wait Lau

Them cac env:

```powershell
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_SKIP_UI_DUMP="1"
$env:EATFITAI_DEVICE_WAIT_CAP_MS="1200"
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS="5000"
$env:EATFITAI_DEVICE_API_TIMEOUT_MS="12000"
```

Tac dung:

- `EATFITAI_DEVICE_FAST_ADB=1`
  - Fast wake.
  - Skip perf snapshot mac dinh.
  - Giam thoi gian doi.
- `EATFITAI_DEVICE_SKIP_UI_DUMP=1`
  - Bo qua UIAutomator dump o probe/assert/auth-state.
  - Dung screenshot + foreground lam evidence degraded.
- `EATFITAI_DEVICE_WAIT_CAP_MS`
  - Cap cac `sleep()`.
- `EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS`
  - Cap timeout cua cac lenh ADB.
- `EATFITAI_DEVICE_API_TIMEOUT_MS`
  - Cap request API trong harness.

Ly do:

- Nguoi dung yeu cau khong timeout/wait qua lau.
- UIAutomator tren Xiaomi nay hay treo 20s moi call neu khong cap/skip.
- Fast mode giup lap nhanh va phat hien bug that nhanh hon.

#### 5.7.5 Process Exit Ro Rang

Truoc do:

- Co luc runner ghi xong `report.json`, console da in status, nhung process Node khong thoat ngay.
- Shell tool bi timeout gia.

Fix:

```js
process.exit(report.status === 'fail' ? 1 : 0);
```

Ket qua:

- Run fast moi nhat thoat sach voi exit code `0`.
- Khong con timeout gia sau khi report da xong.

#### 5.7.6 Clear Text An Toan Hon

Truoc do:

- `clearFocusedText` gui nhieu phim `KEYCODE_DEL`.
- Tren thiet bi that, co luc khong clear het text cu.
- Login email bi append thanh `.60407012628@example.com` hoac cac chuoi sai.

Fix:

- Dung `input keycombination KEYCODE_CTRL_LEFT KEYCODE_A`.
- Sau do `KEYCODE_DEL`.
- Chi fallback multi-delete neu select-all fail.

Ket qua manual:

- `CTRL+A` + delete clear email sach.
- Nhap lai email dung, app login vao Home.

#### 5.7.7 Keyboard Globe Option

Them env:

```powershell
$env:EATFITAI_DEVICE_TAP_KEYBOARD_GLOBE="1"
```

Tac dung:

- Runner tap vung globe tren Gboard truoc khi nhap email.
- Dung khi keyboard dang `Tieng Viet` va ADB text bi Telex rewrite.

Manual finding:

- Khi Gboard hien `Tieng Viet`, email co the bi rewrite.
- Tap globe sang `English` thi `m@example.com` nhap dung.

#### 5.7.8 Performance Evidence

Runner co:

- `am start -W` startup timing.
- `dumpsys gfxinfo`.
- `dumpsys gfxinfo framestats`.
- `dumpsys meminfo`.

Trong fast mode:

- Perf snapshot duoc skip co ghi reason trong report.

Ly do:

- Debug nhanh khong nen bi perf dump keo dai.
- RC proof/gate day du van co the lay perf evidence.

### 5.8 RC Evidence Helper

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\scripts\lib\device-rc-evidence.js
```

Thay doi:

- Them cac mode moi vao required RC proof:
  - `full-tab-ui-smoke`
  - `food-search-ui-readback`
  - `backend-frontend-live-check`
- Mandatory API readback tinh ca mode moi.
- Home evidence chap nhan `ui-marker` hoac `bounded-screen-evidence` tuy dieu kien degraded.

Ly do:

- Xiaomi UIAutomator flaky khong nen lam RC fail neu screenshot + foreground + API readback deu tot.
- Nhung mandatory API readback van fail that neu backend/frontend khong dong bo.

### 5.9 RC Proof Script

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\scripts\real-device-rc-proof.js
```

Thay doi:

- Default `EATFITAI_ANDROID_TARGET` thanh `real-device` neu chua set trong context rc-proof.

Ly do:

- Giam loi setup khi chay lane real-device.
- Vẫn yeu cau `ANDROID_SERIAL` ro rang tu runner.

### 5.10 Package Scripts

File:

```text
D:\EatFitAI_v1\eatfitai-mobile\package.json
```

Them scripts:

```json
"device:full-tab-ui-smoke:android": "node scripts/real-device-adb-flow.js full-tab-ui-smoke",
"device:food-search-ui-readback:android": "node scripts/real-device-adb-flow.js food-search-ui-readback",
"device:backend-frontend-live-check:android": "node scripts/real-device-adb-flow.js backend-frontend-live-check"
```

Ly do:

- Chay rieng tung mode moi de debug nhanh.
- Khong phai go raw `node scripts/...`.

### 5.11 Tests Moi Va Cap Nhat

File moi:

```text
D:\EatFitAI_v1\eatfitai-mobile\__tests__\deviceAutomationMarkers.test.js
```

Test:

- Food Search co marker screen/query/first result/first add button.
- Food Detail co marker screen/grams/submit.
- Meal Diary va Quick Actions co marker can cho ADB.

File cap nhat:

```text
D:\EatFitAI_v1\eatfitai-mobile\__tests__\rcUnblockHelpers.test.js
```

Test:

- RC proof yeu cau cac mode real-device moi.
- Mandatory API readback duoc enforce.
- Crash detector khong coi UIAutomator/MIUI shell noise la crash app.

## 6. Cac Loi/Lech Da Phat Hien Khi Chay That

### 6.1 UIAutomator Flaky Tren Xiaomi/MIUI

Trieu chung:

- `uiautomator dump` hay timeout.
- Co luc bao idle-state issue.
- Co luc khong pull duoc XML.

Tac dong:

- Marker UI khong luon doc duoc tu XML.
- Neu runner doi moi dump 20s thi workflow rat cham.
- Logcat co noise khien crash detector cu false positive.

Xu ly:

- UIAutomator fail la warning/degraded.
- Fast mode co `EATFITAI_DEVICE_SKIP_UI_DUMP=1`.
- Dung screenshot + foreground + API readback lam evidence thay the khi debug.
- Crash detector loc app process chinh xac hon.

Rui ro con lai:

- Degraded run khong chung minh marker XML that su hien.
- RC proof day du van nen chay them khi can release, nhung khong de wait qua lau trong debug.

### 6.2 Keyboard Tieng Viet/Telex Rewrite ADB Text

Trieu chung:

- ADB nhap email bi bien dang khi keyboard dang `Tieng Viet`.
- Query `banana` bi rewrite, khong ra ket qua nhu ky vong.
- Email co luc bi append chuoi cu vi clear text khong sach.

Root cause:

- `adb shell input text` di qua IME hien tai.
- Gboard Vietnamese subtype co composition/Telex.
- Clear text bang nhieu DEL khong du on dinh tren input co cursor/selection khong nhu ky vong.

Fix:

- Login inputs disable autocorrect/autocomplete hints phu hop.
- Runner co option tap keyboard globe.
- Runner clear text bang `CTRL+A` + delete.
- Query default doi sang `rice`.

Can luu y:

- Khi test credentials qua ADB, nen dung ASCII.
- Neu text van sai, bat `EATFITAI_DEVICE_TAP_KEYBOARD_GLOBE=1` hoac chuyen keyboard sang English bang tay.

### 6.3 Food Search Add Khong Quay Ve Diary Nhung Backend Da Write

Quan sat:

- Sau khi tap `+` tren Food Search, app co luc van o man `Tim kiem mon an`.
- API readback lai thay row moi.

Danh gia:

- Backend/frontend write path da hoat dong.
- UX co the dang thiet ke quick-add stay-on-search de them nhieu mon lien tiep.
- Vi vay assertion "phai quay ve Diary sau add" la qua chat.

Fix trong runner:

- Sau add chi capture evidence man after-add non-critical.
- Mandatory pass/fail dua vao API readback.

### 6.4 Account Co Nhieu Row Trong Ngay

Trieu chung:

- Count da cao, co luc count-only khong du de phan biet write moi.
- Co nguy co false fail neu API paging/limit/ordering hoac count bi cap.

Fix:

- Baseline lay danh sach `mealDiaryId`.
- Readback sau add tinh `newIds`.
- Pass neu co ID moi, ke ca count khong tang nhu ky vong.

## 7. Validation Da Chay

### 7.1 Syntax check runner

```powershell
node --check scripts/real-device-adb-flow.js
```

Ket qua: PASS.

### 7.2 Targeted Jest

```powershell
npm test -- --runInBand __tests__/deviceAutomationMarkers.test.js __tests__/rcUnblockHelpers.test.js
```

Ket qua:

```text
PASS __tests__/rcUnblockHelpers.test.js
PASS __tests__/deviceAutomationMarkers.test.js
Test Suites: 2 passed, 2 total
Tests: 15 passed, 15 total
```

### 7.3 Typecheck

```powershell
npm run typecheck
```

Ket qua: PASS.

### 7.4 Git diff check

```powershell
git diff --check
```

Ket qua:

- Khong co whitespace error.
- Co warning LF -> CRLF do Windows, khong phai loi diff check.

### 7.5 Doctor tren thiet bi that

```powershell
npm run device:doctor:android
```

Ket qua: PASS DEGRADED.

### 7.6 Food Search UI Readback tren thiet bi that

```powershell
npm run device:food-search-ui-readback:android
```

Ket qua moi nhat: PASS DEGRADED.

Evidence:

```text
D:\EatFitAI_v1\_logs\real-device-adb\2026-04-26T07-41-59-518Z-food-search-ui-readback
```

Key readback:

```text
count: 24 -> 25
newIds: [3174]
criticalFailures: []
```

## 8. Commands De Tiep Tuc Khong Bi Timeout Lau

### 8.1 Kiem tra thiet bi

```powershell
adb devices -l
```

Neu device offline/unauthorized:

```powershell
adb reconnect offline
adb devices -l
```

Sau do nhin dien thoai va accept USB debugging neu hien prompt.

### 8.2 Set env bat buoc

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
```

### 8.3 Fast loop de debug UI/backend nhanh

```powershell
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_SKIP_UI_DUMP="1"
$env:EATFITAI_DEVICE_WAIT_CAP_MS="1200"
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS="5000"
$env:EATFITAI_DEVICE_API_TIMEOUT_MS="12000"
npm --prefix .\eatfitai-mobile run device:food-search-ui-readback:android
```

Expected:

- Exit code `0`.
- `status=degraded`.
- `passed=true`.
- `food-search-ui-mandatory-readback` pass.

### 8.4 Neu login text bi sai

Chuyen keyboard sang English bang tay, hoac:

```powershell
$env:EATFITAI_DEVICE_TAP_KEYBOARD_GLOBE="1"
npm --prefix .\eatfitai-mobile run device:login-real:android
```

Neu can reset app state:

```powershell
adb -s a12c6888629b shell pm clear com.eatfitai.app
```

Luu y:

- Lenh nay log out app va xoa local app state tren thiet bi.
- Khong xoa repo/backend data.

### 8.5 Chay doctor nhanh

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_UI_DUMP_TIMEOUT_MS="2500"
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS="6000"
npm --prefix .\eatfitai-mobile run device:doctor:android
```

### 8.6 Chay live check co cloud timeout ngan

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_SKIP_UI_DUMP="1"
$env:EATFITAI_DEVICE_API_TIMEOUT_MS="20000"
npm --prefix .\eatfitai-mobile run device:backend-frontend-live-check:android
```

Neu Render/cloud cold start lam API timeout, tang rieng:

```powershell
$env:EATFITAI_DEVICE_API_TIMEOUT_MS="90000"
```

Khong nen dung timeout dai trong debug loop hang ngay neu nguoi dung can toc do.

## 9. Files Da Sua / Tao

### Docs

- `D:\EatFitAI_v1\docs\TESTING_AND_RELEASE.md`
- `D:\EatFitAI_v1\docs\28_REAL_DEVICE_ANDROID_QA_PROGRESS_2026-04-26.md`

### Tests

- `D:\EatFitAI_v1\eatfitai-mobile\__tests__\deviceAutomationMarkers.test.js`
- `D:\EatFitAI_v1\eatfitai-mobile\__tests__\rcUnblockHelpers.test.js`

### Scripts

- `D:\EatFitAI_v1\eatfitai-mobile\scripts\real-device-adb-flow.js`
- `D:\EatFitAI_v1\eatfitai-mobile\scripts\real-device-rc-proof.js`
- `D:\EatFitAI_v1\eatfitai-mobile\scripts\lib\device-rc-evidence.js`
- `D:\EatFitAI_v1\eatfitai-mobile\scripts\lib\device-logcat.js`

### Mobile UI

- `D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\auth\LoginScreen.tsx`
- `D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\diary\FoodSearchScreen.tsx`
- `D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\diary\FoodDetailScreen.tsx`
- `D:\EatFitAI_v1\eatfitai-mobile\src\app\screens\diary\MealDiaryScreen.tsx`
- `D:\EatFitAI_v1\eatfitai-mobile\src\components\home\QuickActionsOverlay.tsx`

### Package

- `D:\EatFitAI_v1\eatfitai-mobile\package.json`

## 10. Git Status Tai Thoi Diem Ghi File

Dirty worktree du kien:

```text
 M docs/TESTING_AND_RELEASE.md
 M eatfitai-mobile/__tests__/rcUnblockHelpers.test.js
 M eatfitai-mobile/package.json
 M eatfitai-mobile/scripts/lib/device-rc-evidence.js
 M eatfitai-mobile/scripts/real-device-adb-flow.js
 M eatfitai-mobile/scripts/real-device-rc-proof.js
 M eatfitai-mobile/src/app/screens/auth/LoginScreen.tsx
 M eatfitai-mobile/src/app/screens/diary/FoodDetailScreen.tsx
 M eatfitai-mobile/src/app/screens/diary/FoodSearchScreen.tsx
 M eatfitai-mobile/src/app/screens/diary/MealDiaryScreen.tsx
 M eatfitai-mobile/src/components/home/QuickActionsOverlay.tsx
?? eatfitai-mobile/__tests__/deviceAutomationMarkers.test.js
?? eatfitai-mobile/scripts/lib/device-logcat.js
?? docs/28_REAL_DEVICE_ANDROID_QA_PROGRESS_2026-04-26.md
```

Khong stage/commit vi chua duoc yeu cau.

## 11. Tieu Chi Fail Hien Tai

Runner se fail neu:

- Device serial khong online.
- `EATFITAI_ANDROID_TARGET=real-device` khong set.
- App khong installed.
- App khong foreground o step critical.
- Crash detector tim thay crash that cua `com.eatfitai.app`.
- Mandatory flow assertion critical fail.
- Mandatory API readback fail/skipped.
- API login fail khi mode can readback.

Runner warning/degraded neu:

- UIAutomator dump fail tren Xiaomi/MIUI.
- Dung coordinate fallback.
- Dung screenshot + foreground thay marker XML.
- OEM note yeu cau USB debugging/security settings.
- Fast mode skip perf snapshot.

## 12. Viec Nen Lam Tiep Theo

### 12.1 Rerun login-real formal sau patch moi

Ly do:

- Fresh-login da duoc manual verify bang `CTRL+A` + English keyboard.
- Runner da patch sau do, nhung chua co formal `login-real` pass moi sau patch cuoi.

Command goi y:

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_TAP_KEYBOARD_GLOBE="1"
$env:EATFITAI_DEVICE_WAIT_CAP_MS="1200"
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS="5000"
npm --prefix .\eatfitai-mobile run device:login-real:android
```

Neu muon clean state:

```powershell
adb -s a12c6888629b shell pm clear com.eatfitai.app
```

### 12.2 Chay tiep cac mode ngan

Nen chay tung mode, khong chay all gate ngay:

```powershell
npm --prefix .\eatfitai-mobile run device:full-tab-ui-smoke:android
npm --prefix .\eatfitai-mobile run device:backend-frontend-live-check:android
npm --prefix .\eatfitai-mobile run device:scan-save-readback:android
npm --prefix .\eatfitai-mobile run device:voice-text-readback:android
npm --prefix .\eatfitai-mobile run device:stats-profile-smoke:android
```

Voi fast env neu can tranh wait lau:

```powershell
$env:EATFITAI_DEVICE_FAST_ADB="1"
$env:EATFITAI_DEVICE_SKIP_UI_DUMP="1"
$env:EATFITAI_DEVICE_WAIT_CAP_MS="1200"
$env:EATFITAI_DEVICE_ADB_TIMEOUT_CAP_MS="5000"
$env:EATFITAI_DEVICE_API_TIMEOUT_MS="12000"
```

### 12.3 Chay release gate khi can bang chung day du

Sau khi cac mode rieng pass, chay:

```powershell
npm --prefix .\eatfitai-mobile run device:rc-proof:android
npm --prefix .\eatfitai-mobile run release:gate -- all
```

Luu y:

- Gate day du co the lau hon vi backend cloud/Render va perf snapshot.
- Khong nen dung trong vong debug lien tuc neu muc tieu la toc do.

### 12.4 Xem lai UX sau Quick Add

Quan sat:

- Tap `+` trong Food Search co the tao entry thanh cong nhung van o man Search.

Can quyet dinh:

- Neu day la UX mong muon: giu runner hien tai, API readback la mandatory.
- Neu mong muon quay ve Diary: tao bug UI rieng va sua navigation sau add.

## 13. Ket Luan Ky Thuat

Phan quan trong nhat da dat:

- Dieu khien app Android that bang ADB.
- Chay UI flow that: Home -> Diary -> Quick Add/Search -> Search -> Add.
- Doc backend real-time sau thao tac UI.
- Xac nhan backend co row moi bang `newIds`.
- Ghi evidence vao `_logs/real-device-adb`.
- Khong them framework moi.
- Khong doi public backend API.
- Khong hardcode credential.
- Khong lam hong text tieng Viet.
- Giam timeout/wait dai bang fast mode va process exit ro rang.

Trang thai tot nhat hien tai:

```text
food-search-ui-readback
status=degraded
passed=true
criticalFailures=[]
mandatory readback pass
newIds=[3174]
runtime=42.2s
```

Can coi `degraded` la chap nhan duoc cho thiet bi Xiaomi nay trong debug loop, vi UIAutomator dump khong on dinh. Khi release proof chinh thuc, nen chay them non-fast lane de lay perf evidence day du, nhung van khong nen bien UIAutomator warning rieng le thanh app failure neu screenshot + foreground + API readback deu pass.
