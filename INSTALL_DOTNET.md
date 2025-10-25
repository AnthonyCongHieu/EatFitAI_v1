# Hướng dẫn cài đặt .NET SDK 9.0

Dự án EatFitAI Backend yêu cầu .NET SDK 9.0 để chạy. Dưới đây là các cách cài đặt:

## Phương pháp 1: Tải trực tiếp từ Microsoft (Khuyến nghị)

1. Truy cập: https://dotnet.microsoft.com/download/dotnet/9.0
2. Tải xuống **".NET SDK 9.0.x"** cho Windows x64
3. Chạy file installer (.exe) đã tải về
4. Làm theo hướng dẫn cài đặt
5. Khởi động lại terminal/PowerShell sau khi cài đặt

## Phương pháp 2: Sử dụng WinGet (Windows Package Manager)

Mở PowerShell với quyền Administrator và chạy:

```powershell
winget install Microsoft.DotNet.SDK.9
```

Khi được hỏi về điều khoản, nhập `Y` và nhấn Enter.

## Phương pháp 3: Sử dụng Chocolatey

Nếu bạn có Chocolatey, chạy:

```powershell
choco install dotnet-sdk -y
```

## Kiểm tra cài đặt

Sau khi cài đặt xong, mở terminal mới và chạy:

```powershell
dotnet --version
```

Bạn sẽ thấy phiên bản .NET SDK (ví dụ: 9.0.x)

## Chạy dự án sau khi cài đặt

```powershell
cd eatfitai-backend/src/EatFitAI.Api
dotnet restore
dotnet build
dotnet run
```

## Lưu ý quan trọng

- Phải khởi động lại terminal/PowerShell sau khi cài đặt .NET SDK
- Nếu vẫn gặp lỗi, hãy khởi động lại máy tính
- Đảm bảo biến môi trường PATH đã được cập nhật (thường tự động)

## Link tải trực tiếp

**Windows x64 Installer:**
https://download.visualstudio.microsoft.com/download/pr/f6c2cc34-e5fd-4d48-9c58-30e6c5d2d1c8/c6b5f5b6c8f3e4e4e4e4e4e4e4e4e4e4/dotnet-sdk-9.0.101-win-x64.exe

(Link có thể thay đổi, vui lòng kiểm tra trang chính thức nếu không hoạt động)
