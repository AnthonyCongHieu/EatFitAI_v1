# EatFitAI Backend — Hướng dẫn chạy trên 2 máy (User Secrets)

Tài liệu này hướng dẫn cực chi tiết cách cấu hình và chạy backend với 2 máy dev dùng CSDL khác nhau (MSI và LAPTOP-U9R2KGG0) bằng .NET User Secrets. Mỗi máy thiết lập 1 lần; sau đó lệnh chạy giống nhau, không sửa file trong repo.

## Tổng quan
- Không commit bí mật (connection string, JWT key) vào repo.
- Dùng User Secrets (lưu cục bộ ở máy dev), tự nạp khi chạy môi trường Development.
- Project đã có `UserSecretsId`: `eatfitai-backend/EatFitAI.API.csproj:6`.
- Không chỉnh sửa file trong `bin/` khi chạy; luôn chạy trong thư mục dự án `eatfitai-backend`.

## Thiết lập 1 lần cho mỗi máy

Áp dụng cho Windows PowerShell. Thực hiện trong thư mục dự án backend.

1) Mở terminal và chuyển thư mục
- `cd eatfitai-backend`

2) (Đã cấu hình sẵn) Kiểm tra User Secrets
- `dotnet user-secrets list`
- Nếu lệnh báo “No secrets configured”, tiếp tục đặt secret ở bước 3.

3) Đặt Connection String và JWT Key

Máy MSI:
- `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=MSI;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"`
- `dotnet user-secrets set "Jwt:Key" "your-local-secret-key-at-least-32-characters"`

Máy LAPTOP-U9R2KGG0:
- `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=LAPTOP-U9R2KGG0;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"`
- `dotnet user-secrets set "Jwt:Key" "your-local-secret-key-at-least-32-characters"`

4) (Tùy chọn) Xem lại các secrets đã đặt
- `dotnet user-secrets list`

Lưu ý: User Secrets được lưu cục bộ (không commit) tại:
- Windows: `C:\Users\<USER>\AppData\Roaming\Microsoft\UserSecrets\<UserSecretsId>\secrets.json`

## Chạy ứng dụng ở môi trường Development (khuyến nghị khi dev)

Option A — Dùng profile có sẵn (tự nạp User Secrets, mở Swagger):
- `cd eatfitai-backend`
- `dotnet run --launch-profile http`

Option B — Đặt ENV tạm cho phiên PowerShell hiện tại:
- `cd eatfitai-backend`
- `$env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run`

Sau khi chạy ở Development:
- Swagger UI: `http://localhost:5247/` (profile http), hoặc theo `launchSettings.json`.
- DB dùng theo `ConnectionStrings:DefaultConnection` từ User Secrets của máy đang chạy.

## Chạy Production (khi cần kiểm thử prod-like)
- `cd eatfitai-backend`
- `$env:ASPNETCORE_ENVIRONMENT='Production'; dotnet run`
- Ở Production: KHÔNG nạp User Secrets. Cần set biến môi trường hệ thống cho bí mật, ví dụ:
  - `ConnectionStrings__DefaultConnection = <chuỗi_kết_nối_prod>`
  - `Jwt__Key = <prod_jwt_key_mạnh>`
- Swagger UI mặc định không bật; có HTTPS redirection khi không Development.

## Lệnh dùng hằng ngày cho MỖI MÁY (sau khi đã đặt secrets 1 lần)

- `cd eatfitai-backend`
- `dotnet run --launch-profile http`

Hoặc (nếu bạn đã đặt ENV mặc định Development ở cấp user):
- Mỗi lần chỉ cần `cd eatfitai-backend; dotnet run`
- Đặt ENV Development 1 lần (user-level):
  - PowerShell: `[System.Environment]::SetEnvironmentVariable('ASPNETCORE_ENVIRONMENT','Development','User')`
  - Mở terminal mới để biến có hiệu lực.

## Ghi chú & Troubleshooting
- Không sửa file trong `eatfitai-backend/bin/*`; đó là output build.
- Nếu không thấy Swagger UI, kiểm tra đang ở Development chưa (`$env:ASPNETCORE_ENVIRONMENT`).
- Lỗi kết nối DB: xác minh connection string đúng máy của bạn qua `dotnet user-secrets list`.
- Đổi máy làm việc không cần đổi lệnh chạy; mỗi máy đã có secrets riêng.

