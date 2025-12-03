# TỔNG HỢP DỰ ÁN EATFITAI (CHI TIẾT)

Tài liệu này tổng hợp toàn bộ thông tin về dự án EatFitAI, bao gồm kiến trúc, công nghệ, quy tắc phát triển và hướng dẫn vận hành.

## 1. Tổng Quan Dự Án
**EatFitAI** là một ứng dụng theo dõi dinh dưỡng thông minh, tích hợp AI để nhận diện món ăn qua hình ảnh. Hệ thống bao gồm 3 thành phần chính:
- **Backend API**: Quản lý dữ liệu, logic nghiệp vụ, xác thực người dùng.
- **Mobile App**: Ứng dụng người dùng (iOS/Android) để nhập liệu và xem báo cáo.
- **AI Provider**: Service riêng biệt chạy mô hình AI (YOLOv8) để nhận diện món ăn.

## 2. Cấu Trúc Thư Mục
Dự án được tổ chức theo cấu trúc monorepo:

```
f:\EatFitAI_v1\
├── eatfitai-backend\       # Source code Backend (.NET 9 Web API)
├── eatfitai-mobile\        # Source code Mobile App (React Native Expo)
├── ai-provider\            # Source code AI Service (Python Flask)
├── EatFitAI.sql            # File định nghĩa cấu trúc Database (Source of Truth)
├── PROJECT_API_RULES.md    # Quy tắc đặt tên và giao tiếp API
└── ... (các file tài liệu khác)
```

---

## 3. Chi Tiết Từng Thành Phần

### A. Backend (`eatfitai-backend`)
Hệ thống lõi xử lý logic nghiệp vụ và kết nối cơ sở dữ liệu.

- **Công nghệ**:
  - **Framework**: .NET 9 Web API
  - **Database**: SQL Server (Entity Framework Core)
  - **Authentication**: JWT (JSON Web Token)
  - **Documentation**: Swagger UI
  - **Architecture**: Layered Architecture (Contracts, Controllers, Services, Repositories)

- **Các tính năng chính**:
  - Quản lý người dùng (Đăng ký, Đăng nhập, Quên mật khẩu).
  - Nhật ký ăn uống (Meal Diary).
  - Quản lý thực phẩm (Food Items).
  - Tích hợp AI Service để nhận diện món ăn.
  - Gửi email (SMTP).

- **Cấu trúc code**:
  - `Contracts/`: Định nghĩa Request/Response DTOs (khớp 1:1 với SQL).
  - `Controllers/`: Xử lý HTTP requests.
  - `Services/`: Logic nghiệp vụ.
  - `Repositories/`: Truy xuất dữ liệu DB.
  - `DbScaffold/`: Code sinh tự động từ Database (Database First).

### B. Mobile App (`eatfitai-mobile`)
Ứng dụng di động dành cho người dùng cuối.

- **Công nghệ**:
  - **Framework**: React Native (Expo SDK 51)
  - **Language**: TypeScript
  - **State Management**: Zustand
  - **Navigation**: React Navigation
  - **Validation**: Zod
  - **UI**: Stylesheet, React Native SVG, Victory Native (biểu đồ).

- **Các tính năng chính**:
  - Chụp ảnh món ăn (Camera/Library).
  - Hiển thị thông tin dinh dưỡng.
  - Theo dõi calo tiêu thụ.
  - Đăng nhập/Đăng ký.

### C. AI Provider (`ai-provider`)
Microservice chuyên biệt để chạy mô hình Deep Learning.

- **Công nghệ**:
  - **Language**: Python 3.x
  - **Framework**: Flask
  - **AI Model**: Ultralytics YOLOv8 (`yolov8n.pt`)

- **Chức năng**:
  - API `/detect`: Nhận file ảnh, trả về danh sách món ăn nhận diện được và độ tin cậy (confidence).
  - Chạy độc lập tại port `5050`.

---

## 4. Quy Tắc Phát Triển (Quan Trọng)

Dự án tuân thủ nghiêm ngặt quy tắc **Database First** và **Naming Convention**.

### Nguyên tắc cốt lõi:
1.  **SQL Schema là chân lý (Source of Truth)**: Mọi thay đổi dữ liệu phải bắt đầu từ file `EatFitAI.sql`.
2.  **Backend (C#)**:
    -   Dùng **PascalCase** và **Tiếng Việt** cho tên biến/property (khớp với SQL).
    -   Ví dụ: `MaNguoiDung`, `HoTen`, `ChieuCaoCm`.
3.  **Frontend (TypeScript)**:
    -   Dùng **camelCase** và **Tiếng Anh** cho code nội bộ.
    -   Ví dụ: `userId`, `fullName`, `heightCm`.
    -   **Mapping**: Service layer chịu trách nhiệm chuyển đổi giữa PascalCase (API) và camelCase (App).

### Bảng Mapping Ví dụ:
| SQL / Backend (C#) | Frontend (TS) | Ý nghĩa |
| :--- | :--- | :--- |
| `MaNguoiDung` | `userId` | ID người dùng |
| `HoTen` | `fullName` | Họ và tên |
| `MaAccessToken` | `accessToken` | Token đăng nhập |

---

## 5. Hướng Dẫn Cài Đặt & Chạy (Dev Mode)

### Bước 1: Chuẩn bị Database
- Chạy script `EatFitAI.sql` và `data_EatFit.sql` vào SQL Server.
- Cấu hình Connection String trong `eatfitai-backend` (dùng User Secrets hoặc `appsettings.Development.json`).

### Bước 2: Chạy Backend
```powershell
cd eatfitai-backend
dotnet run
```
- Server sẽ chạy tại: `http://localhost:5247`
- Swagger UI: `http://localhost:5247/swagger`

### Bước 3: Chạy AI Provider
```powershell
cd ai-provider
# (Kích hoạt venv nếu cần)
python app.py
```
- Server sẽ chạy tại: `http://localhost:5050`

### Bước 4: Chạy Mobile App
```powershell
cd eatfitai-mobile
npm run dev
```
- Quét mã QR bằng ứng dụng Expo Go trên điện thoại (cùng mạng LAN) hoặc chạy trên Android Emulator.
- **Lưu ý**: Cần cấu hình IP máy tính trong `.env.development` của mobile app (biến `EXPO_PUBLIC_API_BASE_URL`) để điện thoại kết nối được backend.

---

## 6. Các Lệnh Thường Dùng

- **Backend**: `dotnet run`, `dotnet user-secrets list`
- **Mobile**: `npm run dev`, `npm run android`, `npm run ios`
- **AI**: `python app.py`

---
*Tài liệu được tổng hợp tự động bởi Assistant ngày 27/11/2025.*
