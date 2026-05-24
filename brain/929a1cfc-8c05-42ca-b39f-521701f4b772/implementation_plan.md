# Kiến trúc & Kế hoạch Triển khai Trang Quản trị Admin - EatFitAI

Tài liệu này xác định rõ các thành phần cấu trúc, công nghệ tối ưu nhất, và giải pháp quản lý mã nguồn để xây dựng trang Admin cho hệ sinh thái EatFitAI. Tiêu chí: **Nhẹ - Phổ biến - Giao diện Đẹp - Realtime - Dễ Deploy (Vercel)**.

---

## 1. Quyết định Quản lý Mã nguồn (Project Structure)

> [!IMPORTANT]
> **Khuyến nghị BẮT BUỘC:** Tạo **Project Mới (Repo riêng)** hoàn toàn, **KHÔNG CHUNG** thư mục với `EatFitAI_v1` hiện tại.

**Lý do (Thực tế & Kỹ thuật):**
1. **Khác biệt hệ sinh thái:** Repo hiện tại đang chứa 2 backend (C# .NET và Python Flask). Trang Admin là Frontend Node.js (React/Next.js). Việc nhét tất cả vào 1 repo khiến repo phình to, rối loạn Dependencies.
2. **Triển khai (Vercel):** Vercel thiết kế tối ưu nhất cho việc liên kết 1 Git Repo = 1 Website. Nếu bạn dùng repo tổng hợp, bạn sẽ phải setup Monorepo (rất cực và phức tạp cấu hình CI/CD).
3. **Bảo mật & Phân quyền:** Mã nguồn Admin chứa các keys quản trị cấp cao. Tách biệt giúp giảm rủi ro rò rỉ nếu share repo ứng dụng chính.
- *Thư mục gợi ý:* `D:\EatFitAI_Admin`

---

## 2. Công nghệ Tối ưu đề xuất

Dựa trên yêu cầu (Nhẹ, Vercel, Realtime, Giao diện đẹp cấp cao), đây là stack chuẩn công nghiệp hiện hành:

*   **Core Framework:** **Next.js (App Router)**
    *   Vercel tạo ra Next.js, nên việc deploy chỉ bằng 1 cú click. Tốc độ Edge Network siêu nhanh.
    *   Hỗ trợ mạnh cả SSR (Server-Side) và CSR (Client-Side).
*   **Giao diện (UI) & CSS:** **Tailwind CSS + Shadcn UI**
    *   *Tại sao không dùng AntDesign/MUI?* Nặng nề và giao diện dễ lỗi thời. Shadcn UI cung cấp các component cực mượt, nhìn rất "premium" (giống giao diện dashboard của chính Vercel/Stripe), code sạch và tuỳ biến linh hoạt 100%.
*   **Logic (State & Fetching):** **TanStack Query (React Query) v5**
    *   Quản lý caching, loading, error state tuyệt vời.
*   **Realtime & Database/Auth:** **Supabase Client SDK**
    *   Hỗ trợ Websocket (Realtime). Nếu có User mới đăng ký hoặc AI log mới bắn vào DB, Dashboard Admin sẽ **nhảy số live** mà không cần F5 (refresh) trang.
    *   Admin Auth tích hợp sẵn (Role-Based Access).
*   **Biểu đồ (Charts):** **Recharts** (hoặc thành phần Charts mới nhất của Shadcn UI).

---

## 3. Các Thành phần (Components) & Quản lý Module

Hệ thống Admin quản trị sẽ bao gồm 4 Module lõi sau:

### 3.1. Dashboard (Trang chủ phân tích)
*   **Realtime Metrics:** Nhảy số trực tiếp tổng số User, Số lượng request nhận diện món ăn trong ngày.
*   **Chart Analytics:** Biểu đồ Line/Bar theo dõi xu hướng (Traffic load gọi vào Flask AI provider, Tỷ lệ AI đoán đúng/sai dựa vào user feedback).

### 3.2. Quản lý Người dùng (User Management)
*   Bảng danh sách toàn bộ Accounts (Search/Filter/Pagination nhanh).
*   Phân loại User: Free vs Premium.
*   Action: Khóa tài khoản (Ban), reset password, xem lịch sử ăn uống của user cụ thể (phục vụ hỗ trợ kỹ thuật hoặc tính năng Diet Coach).

### 3.3. Quản lý Model AI & Log (AI Monitoring)
*   Liệt kê lịch sử phiên Inference của User (Ảnh upload lên -> YOLO/Gemini nhận diện ra món gì -> Confidence Score).
*   **Phục vụ retrain Model:** Nút tải file CSV dữ liệu hoặc tải ảnh có nhận diện sai để làm Dataset cải thiện AI version sau.
*   Trạng thái (Health Check): Xem trạng thái của server Python/ .NET đang chạy hay chết.

### 3.4. Quản lý Thực phẩm (Food/Macro Database)
*   Bảng Master Data thức ăn chuẩn của hệ thống (Tên món, Calories, Protein, Carbs, Fat).
*   Các form CRUD (Create/Read/Update/Delete) để chỉnh sửa data base dinh dưỡng.

---

## 4. Quy trình Triển khai (Deployment Strategy)

- **Bước 1: Code Local & Test.** Khởi tạo Next.js, xây dựng module UI. Kết nối API tới Supabase Dev Project.
- **Bước 2: Quản lý Phiên bản (Git).** Push mã nguồn lên Github (Ví dụ: repo `eatfitai-admin`).
- **Bước 3: Vercel CD.** Truy cập Vercel.com, Import Git Repo.
  - Set Environment Variables (Gồm Supabase URL, Anon Key, Service Role Key).
  - Click Deploy. Quá trình mất chưa tới 90 giây.
- **Bước 4: Thiết lập Domain.** Trỏ Subdomain cho admin chuyên nghiệp. VD: `admin.eatfitai.com` hoặc dùng link miễn phí của Vercel sinh ra.

## User Review Required

Bạn hãy xem xét tài liệu trên. Trả lời xác nhận để chúng ta bắt đầu:
1. Bạn đồng ý tách **Tạo một thư mục riêng** (ví dụ `D:\EatFitAI_Admin`) cho dự án này chứ? 
2. Tech Stack đề xuất (Next.js + Shadcn UI + Supabase Realtime) đã đúng với định hướng mong đợi của bạn?
