# EatFitAI Mobile

Ứng dụng di động (Expo + React Native) cho EatFitAI với TypeScript strict mode, lint chuẩn và pre-commit hook sẵn sàng.

## Bắt đầu

- Cài đặt phụ thuộc: `npm install`
- Copy `.env.example` thành `.env` và cập nhật `EXPO_PUBLIC_API_BASE_URL`
- Khởi động dev server: `npm run dev` (xóa cache để tránh lỗi module)

## Scripts chính

- `npm run start` – Expo Metro bundler
- `npm run android` / `npm run ios` / `npm run web`
- `npm run lint` – Lint toàn bộ code TS/TSX
- `npm run typecheck` – Kiểm tra TypeScript strict
- `npm run format` – Format với Prettier

## Cấu trúc thư mục

- `src/app` – Màn hình + điều hướng (stack mẫu)
- `src/components` – UI components dùng lại
- `src/store` – Zustand store (dashboard mẫu)
- `src/services` – Axios client dùng `EXPO_PUBLIC_*`
- `src/theme` – Theme sáng/tối + provider
- `src/hooks` – Custom hooks (ví dụ toggle theme)
- `src/assets` – Icon, splash, favicon placeholder
- `src/types` – Định nghĩa type và module alias

## Chất lượng mã

- ESLint + Prettier, chạy tự động qua Husky/Lint-Staged
- TypeScript `strict` + `noUncheckedIndexedAccess`
- Plugin Reanimated và alias paths đã cấu hình trong Babel/TS

## Theme & Fonts

- Theme tự động theo hệ điều hành, có nút chuyển tay
- Font Inter tải bằng `@expo-google-fonts/inter`
- Splash/Icon mẫu (nên thay bằng brand chính thức)

## Kiểm thử nhanh

1. `npm install`
2. `npx expo start`
3. Kết nối Android emulator hoặc Expo Go (LAN/Tunnel) để đảm bảo render OK

## Ghi chú thêm

- Husky cần được cài tự động nhờ `prepare` script sau `npm install`
- Khi backend sẵn sàng, cập nhật `loadProfile` trong `useDashboardStore` để gọi API thật
