# EatFitAI Monorepo

EatFitAI bao gồm **backend .NET** và **mobile app Expo** phục vụ quản lý dinh dưỡng, nhật ký ăn uống và gợi ý AI.

## Cấu trúc thư mục
- `eatfitai-backend/` – ASP.NET Core (Clean Architecture, SQL Server, Serilog, Swagger).
- `eatfitai-mobile/` – Expo + React Native (TypeScript strict, Zustand, Victory).
- `docs/` – tài liệu yêu cầu, guideline, ERD & user flow.
- `RULES.md` – quy tắc làm việc & commit.

## Chuẩn bị môi trường
- **Yêu cầu chung:** Node ≥ 18, npm, .NET SDK 9.0 (kèm runtime 8.0 nếu cần), Docker (tùy chọn).
- **Backend:** SQL Server (local hoặc Docker); file cấu hình `.env` dựa trên `eatfitai-backend/.env.example`.
- **Mobile:** Expo CLI (`npm install -g expo-cli`), Android/iOS emulator hoặc Expo Go; `.env` dựa trên `eatfitai-mobile/.env.example`.

## Chạy Backend
```bash
cd eatfitai-backend
cp .env.example .env   # cập nhật chuỗi kết nối & khóa JWT
dotnet restore
dotnet build
dotnet run --project src/EatFitAI.Api/EatFitAI.Api.csproj
```
- API chạy tại `https://localhost:5001` (Swagger `/swagger`), health `/health`.

## Chạy Mobile
```bash
cd eatfitai-mobile
npm install
cp .env.example .env   # cập nhật API URL, tên app
npm run dev            # hoặc npm start
```
Dùng `npm test` để chạy Jest (testing-library/react-native) cho store & hooks.

## Tài liệu bổ sung
- `docs/Requirements.md` – đặc tả chức năng.
- `docs/Guidelines_Dev.md` – quy trình Agile và vai trò.
- `docs/Weekly_Report_Template.md` – template báo cáo tuần.
- `docs/Rubric_PTUD.md` – rubric CLO7-8.
- `docs/ERD.mmd` & `docs/UserFlow.mmd` – sơ đồ Mermaid (dùng `mmdc` để render PNG).

## Ghi chú phát triển
- Tuân thủ `RULES.md`: branch riêng, review trước khi merge, commit đúng chuẩn.
- Luôn giữ lint + typecheck xanh, viết test/unit cho tính năng quan trọng.
- Khi cập nhật API client, chạy `npm run typegen` để đồng bộ type OpenAPI.

Chúc bạn xây dựng EatFitAI thành công! 🚀