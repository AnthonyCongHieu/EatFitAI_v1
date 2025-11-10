# EatFitAI Backend & Mobile — Hướng dẫn chạy cho 2 Developers

Tài liệu này hướng dẫn chi tiết cách cấu hình và chạy hệ thống EatFitAI với 2 máy dev dùng CSDL riêng biệt, LAN binding cho device testing, và per-dev environment cho mobile app.

## Tổng quan hệ thống

### Backend (.NET 9 Web API)
- **Binding**: LAN + localhost cho device testing
- **Secrets**: User Secrets (không commit vào repo)
- **CORS**: Đọc từ config (Development = open, Production = locked)
- **Health Check**: Endpoint `/health` để kiểm tra trạng thái
- **Database**: Mỗi dev dùng server riêng (MSI ↔ LAPTOP-U9R2KGG0)

### Mobile (Expo React Native)
- **Environment**: Per-dev `.env` files (không commit)
- **Scripts**: `npm run dev:hieu` và `npm run dev:tuong`
- **Testing**: Android emulator + physical devices qua LAN

## Cấu hình Backend

## 1. Thiết lập Backend (1 lần cho mỗi máy)

### Chuẩn bị User Secrets

Thực hiện trong thư mục `eatfitai-backend`:

```powershell
# 1. Khởi tạo User Secrets (nếu chưa có)
dotnet user-secrets init

# 2. Đặt Connection String cho máy của bạn
# Máy MSI:
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=MSI;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"

# Máy LAPTOP-U9R2KGG0:
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=LAPTOP-U9R2KGG0;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"

# 3. Đặt JWT Key (tối thiểu 32 ký tự)
dotnet user-secrets set "Jwt:Key" "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForDevelopmentUse"

# 4. Kiểm tra secrets đã đặt
dotnet user-secrets list
```

**Lưu ý**: User Secrets lưu cục bộ tại `C:\Users\<USER>\AppData\Roaming\Microsoft\UserSecrets\<UserSecretsId>\secrets.json`

## 2. Chạy Backend Development

### Lệnh chạy khuyến nghị:
```powershell
cd eatfitai-backend
dotnet run --launch-profile http
```

### Kết quả sau khi chạy:
- ✅ Server bind đến: `http://0.0.0.0:5247` (LAN) + `http://localhost:5247` (localhost)
- ✅ Swagger UI: `http://localhost:5247/swagger`
- ✅ Health Check: `http://localhost:5247/health`
- ✅ Database: Sử dụng connection string từ User Secrets của máy hiện tại

### Alternative: Chạy với ENV tạm thời
```powershell
cd eatfitai-backend
$env:ASPNETCORE_URLS="http://0.0.0.0:5247;http://localhost:5247"
dotnet run
```

## 3. Cấu hình Mobile App

### Chuẩn bị Environment Files

Trong thư mục `eatfitai-mobile`, tạo các file `.env` riêng cho từng dev:

**`.env.development.hieu`** (Android Emulator):
```bash
#!/bin/bash
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247
```

**`.env.development.tuong`** (Physical Device):
```bash
#!/bin/bash
export EXPO_PUBLIC_API_BASE_URL=http://<HOST_IPV4>:5247
# Ví dụ: http://172.16.2.104:5247
```

### Scripts trong package.json:
```json
{
  "scripts": {
    "dev:hieu": "env-cmd -f .env.development.hieu expo start",
    "dev:tuong": "env-cmd -f .env.development.tuong expo start"
  }
}
```

### Chạy Mobile App:
```bash
# Developer Hieu (Emulator)
npm run dev:hieu

# Developer Tuong (Physical Device)
npm run dev:tuong
```

## 4. Testing & Verification

### Kiểm tra Backend:
```bash
# Health check
curl http://localhost:5247/health

# Swagger UI
curl http://localhost:5247/swagger/v1/swagger.json

# LAN access (từ mobile device)
curl http://<HOST_IPV4>:5247/health
```

### Kiểm tra Mobile Connectivity:
- **Emulator**: `http://10.0.2.2:5247/health`
- **Physical Device**: `http://<HOST_IPV4>:5247/health`

### Troubleshooting:
- **Firewall**: Cho phép inbound TCP 5247
- **LAN Access**: Đảm bảo cùng Wi-Fi network
- **Emulator**: Android Studio dùng `10.0.2.2`, Genymotion dùng `10.0.3.2`
- **CORS**: Development cho phép tất cả origins cần thiết

## 5. Production Deployment

### Environment Variables (không dùng User Secrets):
```bash
# Connection String
ConnectionStrings__DefaultConnection="Server=prod-server;Database=EatFitAI;..."

# JWT Key
Jwt__Key="your-production-jwt-key-here"

# CORS Origins (chỉ domain thật)
AllowedOrigins="https://app.eatfitai.com"
```

### Reverse Proxy Setup:
- Kestrel: `http://127.0.0.1:5000`
- Nginx/Caddy: TLS termination + forward headers
- Swagger: Tắt hoặc bảo vệ bằng auth

## 6. Workflow Hằng Ngày

### Backend Developer:
```powershell
cd eatfitai-backend
dotnet run --launch-profile http
```

### Mobile Developer:
```bash
# Hieu
npm run dev:hieu

# Tuong
npm run dev:tuong
```

## 7. Ghi chú Quan trọng

- **User Secrets**: Chỉ lưu local, không commit
- **Database**: Mỗi dev dùng server riêng (MSI ↔ LAPTOP-U9R2KGG0)
- **LAN Testing**: Backend bind `0.0.0.0` cho device access
- **CORS**: Development open, Production locked
- **Environment**: `.env` files ignored by git
- **Ports**: Không conflict vì mỗi máy dùng IP riêng

## 8. Troubleshooting

### Backend Issues:
- **DB Connection**: Kiểm tra `dotnet user-secrets list`
- **Port Conflict**: Mỗi máy IP riêng, không conflict
- **Swagger Not Loading**: Đảm bảo Development environment

### Mobile Issues:
- **Emulator**: Dùng `10.0.2.2` (Android Studio) hoặc `10.0.3.2` (Genymotion)
- **Physical Device**: Dùng `<HOST_IPV4>`, cùng Wi-Fi network
- **Firewall**: Cho phép inbound TCP 5247

### Network Issues:
- **LAN Access**: Backend phải bind `0.0.0.0`
- **CORS Errors**: Kiểm tra `AllowedOrigins` trong config
- **Connection Refused**: Đảm bảo backend đang chạy và accessible

