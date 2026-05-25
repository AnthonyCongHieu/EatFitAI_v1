# KẾ HOẠCH PHÁT TRIỂN: TÍCH HỢP BREVO VÀO HẠ TẦNG & CHI PHÍ & XỬ LÝ LỖI FONT

Tài liệu này ghi nhận kế hoạch chi tiết để sửa lỗi font hiển thị và tích hợp dịch vụ Email Brevo vào module Hạ tầng & Chi phí.

---

## 1. Xử lý lỗi Font (Mojibake) trên trang Hạ tầng & Chi phí
* **Hiện tượng**: Một số chữ tiếng Việt trên trang "Hạ tầng & Chi phí" hiển thị ký tự lạ như `Háº¡ Táo§ng Ká»¹ Thuáºt...`
* **Nguyên nhân**: File `Infrastructure.tsx` bị ghi đè bằng lệnh PowerShell `Set-Content` ở phiên trước dẫn đến sai encoding UTF-8 (chuyển thành UTF-8 with BOM hoặc đọc sai font ANSI trước khi ghi).
* **Giải pháp**:
  - Khôi phục file sạch từ bản backup.
  - Xóa cache Vite dev server (`node_modules/.vite`).
  - Khởi động lại dev server để cập nhật font chữ chuẩn UTF-8.
  - *Trạng thái*: **ĐÃ HOÀN THÀNH**.

---

## 2. Tích hợp dịch vụ Brevo (Email Service)
* **Mục tiêu**: Bổ sung chi phí, cấu hình và vị trí của Brevo (dịch vụ gửi email đăng ký, quên mật khẩu) vào trang Hạ tầng & Chi phí.
* **Chi tiết thay đổi trong [Infrastructure.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Infrastructure.tsx)**:
  * **Công thức chi phí**:
    - Free Tier: $0/tháng (dưới 4,500 users - giới hạn 300 email/ngày).
    - Starter: $15/tháng (4,500 - 10,000 users - tối đa 20k email/tháng).
    - Starter+: $25/tháng (10,000 - 20,000 users - tối đa 40k email/tháng).
    - Starter++: $35/tháng (trên 20,000 users - tối đa 60k email/tháng).
  * **Biểu đồ tròn (Donut Chart)**: Thêm phân đoạn màu xanh ngọc `#06b6d4` biểu diễn tỷ lệ chi phí Brevo.
  * **Biểu đồ cột (Bar Chart)**: Thêm một cột mới cho Brevo.
  * **Sơ đồ dòng chảy hạ tầng (SVG Flow)**:
    - Tăng chiều cao SVG từ `150` lên `200`.
    - Thêm **Brevo Node** ở tọa độ `translate(650, 75)`.
    - Kết nối đường truyền dữ liệu (dash flow) trực tiếp từ **Backend API Node** sang **Brevo Node**.
  * **Bảng so sánh gói**: Thêm thẻ so sánh các gói dịch vụ Brevo (Free, Starter 20k, 40k, 60k).

---

## 3. Các bước thực hiện
1. **Bước 1**: Nhận sự chấp thuận từ người dùng về kế hoạch.
2. **Bước 2**: Thực hiện chỉnh sửa file `Infrastructure.tsx` theo kế hoạch trên.
3. **Bước 3**: Chạy `npm run build` để kiểm tra lỗi cú pháp TypeScript.
4. **Bước 4**: Báo cáo kết quả và hướng dẫn người dùng kiểm tra trên giao diện web.
