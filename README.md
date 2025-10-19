# EatFitAI Mobile (Expo React Native)

Repo này hiện chỉ giữ phần giao diện (FE) dùng Expo + React Native. Toàn bộ backend và tài liệu docs đã được gỡ bỏ.

## Cấu trúc
- eatfitai-mobile/ – Ứng dụng Expo (TypeScript).

## Yêu cầu môi trường
- Node.js >= 18, npm hoặc pnpm/yarn
- Expo CLI và Android/iOS emulator hoặc Expo Go

## Cấu hình ENV
Sao chép file mẫu và cấu hình API nếu cần:

`
cd eatfitai-mobile
cp .env.example .env
# Sửa EXPO_PUBLIC_API_BASE_URL nếu cần
`

## Chạy ứng dụng
`
cd eatfitai-mobile
npm install
npm run dev   # hoặc: npx expo start --android
`

## Ghi chú
- Nếu cần backend sau này, tạo service mới hoặc trỏ tới API hiện có.