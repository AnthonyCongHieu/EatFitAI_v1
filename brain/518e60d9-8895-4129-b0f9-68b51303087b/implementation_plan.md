# Kế hoạch tích hợp Brevo (Email Service) vào Hạ tầng & Chi phí

Dự án hiện đang sử dụng dịch vụ **Brevo** để gửi email giao dịch (như email đăng ký tài khoản, phục hồi mật khẩu, gửi báo cáo). Tuy nhiên, trang quản lý **Hạ tầng & Chi phí** hiện tại chưa cập nhật thông tin và mô phỏng chi phí cho dịch vụ này. 

Bản kế hoạch này chi tiết hóa cách thức tích hợp Brevo vào giao diện trực quan hóa và bộ mô phỏng chi phí.

---

## Đề xuất Thay đổi

Chúng ta sẽ sửa đổi file [Infrastructure.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/Infrastructure.tsx) để thêm Brevo vào tất cả các cấu phần hiển thị chi phí:

### 1. Logic Tính Toán Chi Phí Động (Brevo Cost Formula)
Ước tính mỗi người dùng hoạt động hàng tháng (MAU) sẽ nhận trung bình khoảng **2 email giao dịch/tháng** (email xác thực, thông báo hệ thống, hoặc báo cáo định kỳ).
* **Free Tier**: $0/tháng, giới hạn **300 email/ngày** (gửi tối đa 9,000 email/tháng). Tương đương quy mô **dưới 4,500 người dùng**.
* **Starter (20k mail)**: $15/tháng. Tương đương quy mô **4,500 đến 10,000 người dùng**.
* **Starter (40k mail)**: $25/tháng. Tương đương quy mô **10,000 đến 20,000 người dùng**.
* **Starter (60k mail)**: $35/tháng. Tương đương quy mô **trên 20,000 người dùng**.

### 2. Cập nhật Biểu đồ Tròn (Donut Chart)
* Thêm phân đoạn (Segment) biểu diễn chi phí Brevo vào SVG Donut Chart.
* Chọn tông màu thương hiệu của Brevo: Màu xanh ngọc (Cyan / Teal) `#06b6d4` hoặc màu cam đậm `#f97316` để làm nổi bật.

### 3. Cập nhật Biểu đồ Cột (Bar Chart)
* Thêm một cột mới cho **Brevo** bên cạnh các cột Backend (BE), AI, Database (DB), Cloudflare R2, và Gemini.

### 4. Cập nhật Sơ đồ Dòng Chảy Hạ Tầng (SVG Cost Flow Diagram)
* Tăng chiều cao của khung SVG từ `150` lên `200` để có đủ không gian bố trí các node đối xứng và thông minh.
* Định vị **Brevo Node** nằm ngay ngang hàng với **Backend API Node** (ở vị trí trung tâm bên phải), thể hiện trực quan luồng Backend API gọi sang Email API của Brevo:
  * Tọa độ Backend API: `translate(440, 75)`
  * Tọa độ Brevo Node: `translate(650, 75)`
  * Tọa độ AI Provider: `translate(650, 15)`
  * Tọa độ Supabase DB: `translate(650, 135)`
  * Vẽ đường nối Dashflow thẳng từ Backend tới Brevo.

### 5. Cập nhật Bảng Đối Chiếu Các Gói Dịch Vụ
* Thêm 1 thẻ (Card) so sánh các gói dịch vụ của **Brevo Email API** (Free Tier vs Starter Plans) giúp hội đồng dễ theo dõi.

---

## Kế hoạch Xác minh

### Xác minh Kỹ thuật
- Chạy `npm run build` để đảm bảo code React/TypeScript biên dịch thành công, không gặp lỗi cú pháp hay thiếu import.

### Xác minh Trực quan
- Người dùng kiểm tra trang **Hạ tầng & Chi phí** xem:
  - Biểu đồ Donut và Bar Chart đã hiển thị đúng thêm cột Brevo.
  - Sơ đồ hình học dòng tiền đã hiển thị Brevo Node cân đối, không đè lấn lên các node khác.
  - Khi kéo thanh trượt Simulator, chi phí Brevo nhảy động chính xác theo quy mô user.
