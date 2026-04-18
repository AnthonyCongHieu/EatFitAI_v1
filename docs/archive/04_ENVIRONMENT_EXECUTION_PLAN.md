# 04. Environment Execution Plan

## Mục tiêu

Tài liệu này chốt trạng thái triển khai môi trường EatFitAI tại thời điểm hiện tại để phục vụ:

- coding ổn định trên Windows
- chạy app trên Android emulator
- test/debug giao diện bằng Appium
- demo core flow trên điện thoại hoặc emulator

Đây là bản `execution snapshot`, không phải PRD hay task board đầy đủ.

## Trạng thái hiện tại

### Đã hoàn thành

- Chuẩn hóa lane `Windows portable`, `emulator-first`
- Chuyển các thành phần nặng sang `D:`:
  - Android SDK
  - Android AVD
  - Ollama models
- Dùng `user-secrets` cho backend machine-specific config
- Chốt local ports:
  - backend `5247`
  - AI provider `5050`
  - Metro `8081`
  - Appium `4723`
- Hoàn tất Android emulator lane:
  - `adb`
  - `emulator`
  - `sdkmanager`
  - AVD `EatFitAI_API_34`
- Hoàn tất Appium lane:
  - Appium server
  - UiAutomator2
  - Appium inspection trên emulator
- Hoàn tất AI local lane:
  - Ollama chạy local
  - AI provider health `200`
  - model vision local sẵn sàng
- Hoàn tất backend lane:
  - build pass
  - health `200`
  - protected API auth đã hoạt động
- Hoàn tất frontend smoke lane:
  - login thành công bằng account hợp lệ
  - vào được `Home`
  - vào được `Stats`
  - vào được `Profile`
  - vào được `AI Scan`
  - cấp quyền camera trên emulator thành công

### Đã sửa trong quá trình triển khai

- Sửa phát JWT để token sinh ra khớp `issuer/audience` mà backend đang validate
- Bổ sung script đồng bộ schema `FoodItem` cho local DB để tránh lỗi `500` ở:
  - `/api/summary/day`
  - `/api/meal-diary`

## Trạng thái kiểm chứng

### Runtime

- `GET /health` của backend: `200`
- `GET /healthz` của AI provider: `200`
- Appium tạo session và đọc được UI tree của app
- Frontend chạy trên emulator và render được các màn chính

### Auth và API

- `POST /api/auth/login`: hoạt động
- Protected API đã xác nhận `200` với account test:
  - `/api/profile`
  - `/api/summary/day`
  - `/api/summary/week`
  - `/api/meal-diary`

### UI smoke

- Welcome -> Login
- Login -> Home
- Home -> Stats
- Home/Profile tabs hoạt động
- AI Scan mở được và xin quyền camera đúng

## Account test cục bộ

Đã tạo một account test local để smoke test và debug runtime.

Nguyên tắc sử dụng:

- chỉ dùng cho local/dev
- không coi là seed production
- có thể reset hoặc thay thế sau

## Các bước còn lại nên làm tiếp

### Ưu tiên cao

- Chuyển từ `Expo Go` sang `Android development build`
- Viết smoke suite Appium tối thiểu cho:
  - login
  - home
  - stats
  - profile
  - AI scan mở màn hình
- Chuẩn hóa script bootstrap DB để mọi máy dev khác có thể dựng local DB giống nhau
- Chốt `Node 20.x` đúng baseline thay vì tiếp tục dùng `Node 22`

### Ưu tiên trung bình

- Bổ sung test cho flow `Meal Diary -> thêm món -> summary cập nhật`
- Bổ sung flow `AI Scan -> chọn ảnh từ thư viện`
- Loại bỏ các toast/log phát sinh từ state cũ của Expo dev runtime

## Các lưu ý kỹ thuật

- `sqdate13thang3t.sql` vẫn chỉ là snapshot tham chiếu, chưa phải bootstrap flow chuẩn
- DB local hiện cần đồng bộ thêm schema bằng script SQL nếu máy khác chưa có các cột credibility của `FoodItem`
- Nếu protected API lại bị `401`, kiểm tra đầu tiên là JWT `issuer/audience`
- Nếu app mở nhưng data không lên, kiểm tra:
  - backend health
  - AI health
  - token hiện tại của app
  - schema DB local

## Lệnh kiểm tra nhanh

### Preflight

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1
```

### Backend

```powershell
dotnet run --project .\eatfitai-backend\EatFitAI.API.csproj --launch-profile http
```

### AI provider

```powershell
cd .\ai-provider
.\venv\Scripts\python.exe app.py
```

### Mobile

```powershell
cd .\eatfitai-mobile
npm run dev -- --android
```

### Schema drift FoodItem

```powershell
sqlcmd -S localhost -d EatFitAI -i .\eatfitai-backend\Migrations\ensure_fooditem_credibility_columns.sql
```

## Kết luận

Môi trường hiện tại đã vượt qua giai đoạn setup nền và đang ở mức:

- đủ để tiếp tục coding
- đủ để debug backend/frontend/AI trên máy này
- đủ để AI/Codex tương tác UI qua emulator + Appium

Phần còn lại không còn là “dựng môi trường từ đầu”, mà là hardening cho smoke automation và lane development build.
