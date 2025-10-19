# EatFitAI Mobile

Ứng dụng di động (Expo + React Native) cho EatFitAI với TypeScript strict, lint chuẩn và Husky/Lint-Staged.

## Chuẩn bị
1. `npm install`
2. Sao chép `.env.example` → `.env` và cập nhật `EXPO_PUBLIC_*`
3. Khởi động dev server: `npm run dev` (xóa cache để tránh lỗi Metro)

## Scripts chính
- `npm run start` – Expo Metro bundler
- `npm run android` / `npm run ios` / `npm run web`
- `npm run lint` – kiểm tra ESLint
- `npm run typecheck` – TypeScript strict
- `npm run test` – Jest + testing-library/react-native
- `npm run format` – Prettier
- `npm run typegen` – đồng bộ type từ OpenAPI

## Cấu trúc thư mục
- `src/app` – màn hình, navigation (stack/tabs)
- `src/components` – UI component dùng lại
- `src/store` – Zustand store (auth, diary, stats…)
- `src/services` – Axios client + service gọi API
- `src/hooks` – custom hooks (ví dụ skeleton, toggle theme)
- `src/theme` – theme sáng/tối
- `src/types` – type dùng chung
- `scripts/` – generator type từ OpenAPI

## Testing
- Framework: `jest-expo` + `@testing-library/react-native`
- Test mẫu: `__tests__/useStatsStore.test.ts`, `__tests__/useListSkeleton.test.ts`
- Chạy toàn bộ: `npm test`

## Lưu ý phát triển
- Husky chạy `lint-staged` trước commit.
- Theme tự động theo hệ điều hành, có nút chuyển tay.
- Khi backend cập nhật schema, chạy `npm run typegen` để tái tạo `src/types/api.d.ts`.
- Victory chart dùng cho màn Thống kê (kết hợp `react-native-svg`).

## Build nhanh
```bash
npm install
npm run lint && npm run typecheck
npm test
npm run android   # hoặc npm run ios
```

Ảnh màn hình demo: thêm vào thư mục `docs/screenshots/` và cập nhật README khi có.