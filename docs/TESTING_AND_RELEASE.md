# Testing And Release

Cập nhật: `2026-04-24`

Tài liệu này là runbook hiện hành cho kiểm thử và phát hành EatFitAI. Android UI automation hiện dùng **ADB + UIAutomator best-effort + scrcpy**, không dùng framework helper APK.

## Gates Chính

| Gate | Mục tiêu | Lệnh |
|---|---|---|
| Code | Backend, mobile, AI unit/static checks | `npm --prefix .\eatfitai-mobile run release:gate -- code` |
| Android build | Build/install preview APK và probe máy thật | `npm --prefix .\eatfitai-mobile run release:gate -- android` |
| Device evidence | Đọc evidence ADB mới nhất | `npm --prefix .\eatfitai-mobile run release:gate -- device` |
| Cloud | Render verify, preflight, regression, metrics, rehearsal | `npm --prefix .\eatfitai-mobile run release:gate -- cloud` |

Full gate:

```powershell
npm --prefix .\eatfitai-mobile run release:gate -- all
```

## Android Real-Device Lane

### Cài công cụ

ADB đến từ Android SDK `platform-tools`. Cài `scrcpy` để quan sát và điều khiển live:

```powershell
winget install --id Genymobile.scrcpy -e
```

Khi có nhiều thiết bị Android, luôn pin serial:

```powershell
$env:ANDROID_SERIAL="a12c6888629b"
$env:EATFITAI_ANDROID_TARGET="real-device"
```

Với Xiaomi/MIUI, bật trên điện thoại:

- Developer options
- USB debugging
- USB debugging (Security settings)
- Install via USB nếu cần cài APK

### Doctor

```powershell
npm --prefix .\eatfitai-mobile run device:doctor:android
```

Doctor kiểm tra:

- `adb` và thiết bị online
- app `com.eatfitai.app` đã cài
- `scrcpy`
- `screencap`
- `screenrecord`
- UIAutomator dump best-effort
- cảnh báo MIUI/device policy

UIAutomator dump có thể báo `could not get idle state` trên một số ROM. Đây là warning, không tự động kết luận app fail.

### Quan sát live bằng scrcpy

```powershell
npm --prefix .\eatfitai-mobile run device:scrcpy:android
```

Lệnh này wake/unlock, launch app mặc định, rồi mở cửa sổ scrcpy theo serial đang chọn.

### Probe không phá dữ liệu

```powershell
npm --prefix .\eatfitai-mobile run device:probe:android
```

Probe thực hiện:

- clear logcat
- wake/unlock
- force-stop app
- launch app bằng `monkey`
- chụp `01-launch.png`
- thử dump `ui.xml`
- lưu `crash-logcat.txt`
- lưu `tail-logcat.txt`
- ghi `report.json`

### Auth-entry flow nhỏ

```powershell
npm --prefix .\eatfitai-mobile run device:auth-entry:android
```

Flow này chỉ kiểm tra khả năng tap/type vào màn login:

- launch app
- tap ô email
- nhập `EATFITAI_DEVICE_PROBE_EMAIL` hoặc mặc định `probe@demo.com`
- tap ô password
- nhập `EATFITAI_DEVICE_PROBE_PASSWORD` hoặc mặc định `Probe12345`
- hide keyboard
- tap `Đăng nhập`
- chụp screenshot sau từng bước

ADB text đi qua bàn phím Android thật. Nếu bàn phím đang ở tiếng Việt/Telex, một số chuỗi có thể bị rewrite. Vì vậy flow luôn lưu screenshot để xác minh text thực tế.

## Evidence

Evidence mới nằm ở:

```text
_logs/real-device-adb/<timestamp>-<mode>/
```

Các file quan trọng:

- `report.json`
- `01-launch.png`
- `02-email.png`
- `03-password.png`
- `04-after-login-tap.png`
- `crash-logcat.txt`
- `tail-logcat.txt`
- `ui.xml` hoặc warning trong `report.json`
- `screenrecord.mp4` nếu chạy helper với `--record`

`_logs/` là generated evidence và không commit.

## Production Smoke API

Cloud/API smoke không phụ thuộc Android UI framework.

```powershell
npm --prefix .\eatfitai-mobile run smoke:render:verify
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:auth:api
npm --prefix .\eatfitai-mobile run smoke:user:api
npm --prefix .\eatfitai-mobile run smoke:ai:api
```

Fixture ảnh dùng cho AI smoke nằm ở:

```text
tools/fixtures/scan-demo
```

Nếu cần override manifest:

```json
{
  "fixtureRootHint": "tools/fixtures/scan-demo"
}
```

## Debug Khi Fail

1. Mở scrcpy để nhìn màn hình thật.
2. Chạy `device:probe:android` để lấy baseline screenshot/logcat.
3. Nếu UI tree fail, đọc screenshot trước; không coi UIAutomator warning là app crash.
4. Nếu text nhập sai, đổi keyboard sang English hoặc dùng probe credentials ASCII ít ký tự dễ bị Telex rewrite.
5. Nếu app không launch, kiểm tra `adb shell cmd package resolve-activity --brief com.eatfitai.app`.
6. Nếu logcat crash trống nhưng UI sai, lưu screenshot và note trạng thái trong release evidence.
