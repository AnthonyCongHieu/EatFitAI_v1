# EatFitAI

EatFitAI là một workspace phát triển trên Windows cho ứng dụng theo dõi dinh dưỡng với:

- `eatfitai-mobile`: Expo / React Native client
- `eatfitai-backend`: ASP.NET Core 9 Web API
- `ai-provider`: Python AI service cho vision + Gemini/Ollama AI flows

## Thiết lập local

Xem [SETUP_GUIDE.md](SETUP_GUIDE.md) là nguồn sự thật duy nhất cho thiết lập môi trường local.

Các phiên bản mặc định:

- Node `20.x`
- .NET SDK `9.0.306`
- Python `3.11`
- Java `17`
- SQL Server 2022 Developer (local instance)
- Android emulator first, thiết bị thật là fallback

## Khởi chạy nhanh

1. Khôi phục hoặc xác minh cơ sở dữ liệu SQL Server local
2. Cấu hình backend `user-secrets`
3. Khởi động `ai-provider` tại `http://127.0.0.1:5050`
4. Khởi động backend tại `http://localhost:5247`
5. Khởi động mobile với `start-mobile-local.ps1` hoặc `.env.development.local` khi muốn app gọi backend local

## Chế độ khởi chạy mobile

| Script | Mô tả | API target |
|---|---|---|
| `start-mobile.ps1` | Expo dev mặc định | `https://eatfitai-backend.onrender.com` |
| `start-mobile-local.ps1` | Emulator/local-backend | `http://10.0.2.2:5247` |
| `start-stack.ps1` | Full local stack | `http://10.0.2.2:5247` |

## Thiết bị Android thật

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Start-EatFitAI-PhysicalDeviceLane.ps1
```

Tắt voice STT warm-up nếu chỉ cần non-voice flows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Start-EatFitAI-PhysicalDeviceLane.ps1 -EnableStt:$false
```

## Tài liệu

- [SETUP_GUIDE.md](SETUP_GUIDE.md) — Hướng dẫn thiết lập đầy đủ
- [docs/README.md](docs/README.md) — Chỉ mục tài liệu kỹ thuật
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Kiến trúc hệ thống
- [docs/TESTING_AND_RELEASE.md](docs/TESTING_AND_RELEASE.md) — Kiểm thử và phát hành
- [ai-provider/README.md](ai-provider/README.md) — AI provider
- [tools/appium/README.md](tools/appium/README.md) — Appium smoke lane

## Xác minh local

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Invoke-DevPreflight.ps1
```

Khôi phục SQL snapshot portable:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dev\Restore-EatFitAI-PortableSnapshot.ps1
```

## Ghi chú

- `sqdate13thang3t.sql` chỉ là snapshot tham chiếu, không phải bootstrap flow chuẩn
- Backend machine-specific values phải nằm trong `user-secrets`, không phải file JSON tracked
- Appium + MCP được hỗ trợ qua emulator-first lane trong `tools/appium`
- Smoke production nên dùng `start-mobile-cloud-smoke.ps1`
