# EatFitAI (Mobile + Backend)
Mobile: Expo (React Native) | Backend: .NET (sẽ setup lại)

Trang thái: Đã xóa mã nguồn Backend để chuẩn bị setup lại. Ứng dụng mobile vẫn chạy bình thường và có thể trỏ tới API bên ngoài qua biến môi trường.

## Features
- User authentication (JWT, Google OAuth)
- Profile management
- Food search and custom dishes
- Diary entries for meals
- Body metrics tracking
- Nutrition targets
- Summary reports (daily/weekly)

## API tích hợp từ Mobile
- Cấu hình base URL qua biến `EXPO_PUBLIC_API_BASE_URL` (xem `eatfitai-mobile/src/config/env.ts`).
- Ví dụ khi dùng API local: đặt `EXPO_PUBLIC_API_BASE_URL=http://localhost:5100` trong `.env` của mobile.

## Setup

### Mobile
1) Sao chép `.env.example` -> `.env` và thiết lập `EXPO_PUBLIC_API_BASE_URL` nếu có API có sẵn
2) `npm install`
3) `npx expo start`

### Backend (setup lại)
1) Cài .NET SDK 9 (Windows/macOS/Linux)
2) Tạo skeleton Web API (ví dụ cấu trúc lại thư mục `eatfitai-backend/`):
   - `mkdir eatfitai-backend && cd eatfitai-backend`
   - `dotnet new webapi -n EatFitAI.Api`
   - `dotnet run --project EatFitAI.Api`
3) Swagger/OpenAPI mặc định có tại: `http://localhost:5100/swagger/v1/swagger.json` (tuỳ cấu hình cổng)
4) Cập nhật Mobile `.env` trỏ tới URL backend mới (`EXPO_PUBLIC_API_BASE_URL`)

### Generate Type (từ OpenAPI)
- Từ URL: `OPENAPI_URL="http://localhost:5100/swagger/v1/swagger.json" npm run -w eatfitai-mobile typegen`
- Từ file: `OPENAPI_PATH="C:\\path\\to\\openapi.json" npm run -w eatfitai-mobile typegen`
- Hoặc truyền trực tiếp tham số: `npm run -w eatfitai-mobile typegen -- https://server.example.com/openapi.json`

### Demo account
login: demo@eatfit.ai / demo123

## Testing
- Build verification: Mobile app compile cleanly
