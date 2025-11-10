# EatFitAI Backend & Mobile — Hướng dẫn chạy đơn giản

Tài liệu này đã được tinh gọn để đơn giản hóa quy trình dev & debug. Bỏ các biến thể cho 2 developer; chỉ giữ một cách chạy duy nhất, dễ nhớ.

## Tổng quan hệ thống

### Backend (.NET 9 Web API)
- **Binding**: LAN + localhost cho device testing
- **Secrets**: User Secrets (không commit vào repo)
- **CORS**: Đọc từ config (Development = open, Production = locked)
- **Health Check**: Endpoint `/health` để kiểm tra trạng thái
- **Database**: Mỗi dev dùng server riêng (MSI ↔ LAPTOP-U9R2KGG0)

### Mobile (Expo React Native)
- **Environment**: Một file `.env.development` (không commit)
- **Script**: `npm run dev`
- **Testing**: Android emulator hoặc thiết bị thật qua LAN

## Cấu hình Backend

## 1. Thiết lập Backend (1 lần cho mỗi máy)

### Chuẩn bị Connection String (mặc định 1-dev)

Mặc định trong `appsettings.Development.json` đã cấu hình:

```
"ConnectionStrings": {
  "DefaultConnection": "Server=LAPTOP-U9R2KGG0;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

Tùy chọn (nếu muốn override bằng User Secrets):

```powershell
cd eatfitai-backend
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=LAPTOP-U9R2KGG0;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"
dotnet user-secrets set "Jwt:Key" "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForDevelopmentUse"
dotnet user-secrets list
```

## 2. Chạy Backend Development

### Lệnh chạy khuyến nghị:
```powershell
cd eatfitai-backend
dotnet run
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

### Chuẩn bị Environment file duy nhất

Trong thư mục `eatfitai-mobile`, sao chép từ `.env.development.example` sang `.env.development`, sau đó chọn 1 trong 2 dòng dưới (tuỳ môi trường test):

```bash
# Nếu dùng Android Emulator (Android Studio):
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247

# Hoặc nếu dùng thiết bị thật qua LAN:
# EXPO_PUBLIC_API_BASE_URL=http://<HOST_IPV4>:5247
# Ví dụ: EXPO_PUBLIC_API_BASE_URL=http://172.16.2.104:5247
```

### Scripts trong package.json (đã đơn giản hóa):
```json
{
  "scripts": {
    "dev": "env-cmd -f .env.development expo start"
  }
}
```

### Chạy Mobile App (một lệnh duy nhất):
```bash
npm run dev
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

## 6. Workflow Hằng Ngày (đơn giản)

- Backend:
```powershell
cd eatfitai-backend
dotnet run --launch-profile http
```

- Mobile:
```bash
cd eatfitai-mobile
npm run dev
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
- **ENV**: Kiểm tra `.env.development` có `EXPO_PUBLIC_API_BASE_URL`
- **Firewall**: Cho phép inbound TCP 5247

### Network Issues:
- **LAN Access**: Backend phải bind `0.0.0.0`
- **CORS Errors**: Kiểm tra `AllowedOrigins` trong config
- **Connection Refused**: Đảm bảo backend đang chạy và accessible

