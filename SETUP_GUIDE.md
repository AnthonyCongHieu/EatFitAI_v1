# Hướng dẫn thiết lập EatFitAI trên Windows

Cập nhật: `2026-04-24`

Đây là hướng dẫn onboarding chính thức cho phát triển local.

## 0. Bootstrap một lệnh

Nếu máy đã cài sẵn các runtime cần thiết, bootstrap môi trường portable:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Setup-WindowsPortableDevEnvironment.ps1
```

Script này cài `scrcpy`, sửa chữa Android SDK command-line toolchain, tạo AVD chuẩn, và chạy preflight.

Để chuyển storage nặng (Android/Ollama) từ `C:` sang `D:`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Relocate-WindowsDevStorage.ps1
```

## 1. Phiên bản cần thiết

- Node `20.x`
- .NET SDK `9.0.306`
- Python `3.11`
- Java `17`
- SQL Server 2022 Developer
- Android Studio với:
  - `cmdline-tools`
  - `platform-tools`
  - `emulator`
  - Android 14 / API 34 / Google APIs Play Store / x86_64 system image

File pin phiên bản trong repo:

- `.nvmrc`
- `.python-version`
- `global.json`

## 2. Backend secrets

Backend secrets phải được lưu per machine bằng `dotnet user-secrets`.

Kiểm tra:

```powershell
dotnet user-secrets list --project .\eatfitai-backend\EatFitAI.API.csproj
```

Các key bắt buộc:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`
- `Encryption:Key`
- `AIProvider:InternalToken`
- `Brevo:ApiKey`
- `Brevo:SenderEmail`
- `Brevo:SenderName`

Xem chi tiết tại [docs/SECRETS_SETUP.md](docs/SECRETS_SETUP.md).

### Cổng local chuẩn

| Dịch vụ | Cổng |
|---|---:|
| Backend | `5247` |
| AI provider | `5050` |
| Metro (mobile) | `8081` |

## 3. SQL Server local

Cơ sở dữ liệu local chuẩn là `EatFitAI` trên SQL Server instance local.

Lưu ý quan trọng:

- `sqdate13thang3t.sql` là raw snapshot chứa đường dẫn MDF/LDF cụ thể theo máy
- Dùng script portable restore thay vì import file raw trực tiếp

Khôi phục portable:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Restore-EatFitAI-PortableSnapshot.ps1
```

Xác minh database:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Test-EatFitAIDatabase.ps1
```

## 4. AI provider

Tạo file env local từ example:

```powershell
Copy-Item .\ai-provider\.env.example .\ai-provider\.env
```

Giá trị mặc định local:

- `OLLAMA_URL=http://localhost:11434`
- `OLLAMA_MODEL=qwen2.5:3b`
- `ENABLE_STT=false`

`best.pt` phải nằm trong `ai-provider\` và không commit vào git.

Khởi chạy:

```powershell
cd .\ai-provider
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Health check:

```powershell
curl http://127.0.0.1:5050/healthz
```

## 5. Backend

Khởi chạy:

```powershell
cd .\eatfitai-backend
dotnet restore
dotnet run
```

URL local: `http://localhost:5247`

## 6. Mobile

Tạo file env mobile local nếu cần:

```powershell
Copy-Item .\eatfitai-mobile\.env.development.example .\eatfitai-mobile\.env.development
```

Cấu hình emulator mặc định:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247
```

Khởi chạy:

```powershell
cd .\eatfitai-mobile
npm install
npm run dev
```

## 7. Android tooling

AVD khuyến nghị:

- Device: `Pixel 7`
- API: `34`
- Image: `Google APIs Play Store x86_64`

Provision hoặc sửa chữa Android SDK:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Install-AndroidSdkComponents.ps1 -PersistUserEnvironment
```

Emulator vẫn hữu ích cho dev nhanh. Release-style UI evidence hiện ưu tiên thiết bị thật qua ADB + scrcpy.

## 8. Thiết bị thật với ADB + scrcpy

Cài scrcpy nếu bootstrap chưa cài:

```powershell
winget install --id Genymobile.scrcpy -e
```

Kiểm tra thiết bị:

```powershell
npm --prefix .\eatfitai-mobile run device:doctor:android
```

Mở màn hình live:

```powershell
npm --prefix .\eatfitai-mobile run device:scrcpy:android
```

Chạy probe evidence:

```powershell
npm --prefix .\eatfitai-mobile run device:probe:android
```

Xem [docs/TESTING_AND_RELEASE.md](docs/TESTING_AND_RELEASE.md) để biết runbook đầy đủ.

## 9. Preflight một lệnh

Chạy preflight trước khi code trên máy mới:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1
```

Môi trường được coi là sẵn sàng khi preflight báo:

- Toolchain có mặt
- `ollama` có mặt
- User-secrets có mặt
- SQL Server reachable
- Database `EatFitAI` có mặt
- AI provider health reachable
- Backend buildable
- Android tooling available
- Android AVD available
- scrcpy available hoặc có warning cài đặt rõ ràng
