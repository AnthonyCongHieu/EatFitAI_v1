# KẾ HOẠCH SỬA LỖI CO CỤM NÚT HEADER & TỐI ƯU HÓA MOBILE (TABLET/LAPTOP TRUNG GIAN)

Chào bạn! Qua phân tích ảnh chụp thực tế và báo cáo phân tích CSS của Browser Subagent, chúng tôi đã xác định được nguyên nhân chính xác gây lỗi đè/méo nút trên Header và lập kế hoạch khắc phục dưới đây.

## 1. PHÂN TÍCH NGUYÊN NHÂN (EVIDENCE-BASED)
* **Lỗi méo nút theme-toggle:**
  - Nút chuyển đổi Theme (`.theme-toggle-btn`) là hình tròn `36px` x `36px` nhưng không có thuộc tính `flex-shrink: 0`.
  - Khi chiều rộng màn hình hẹp lại (khoảng từ 1025px đến 1100px ở chế độ Desktop), flexbox sẽ ép nút này co cụm lại, khiến chiều rộng thực tế bị ép xuống còn **`29.74px`**, biến nút tròn thành hình bầu dục và làm méo các icon SVG bên trong.
* **Lỗi ngắt dòng và phình to của nút Tải APK:**
  - Nút `.btn-nav` (Tải APK) không có `flex-shrink: 0` và `white-space: nowrap`, khiến chữ "Tải APK" bị ngắt thành 2 dòng ("Tải" và "APK"), làm chiều cao nút phình to từ 36px lên **`61px`** và đẩy lệch layout.
* **Lỗi tràn đè của menu:**
  - Thanh menu desktop `.nav-links` chứa 6 mục điều hướng dài. Khi màn hình nhỏ hơn 1150px, nó chiếm quá nhiều không gian ngang, đẩy sát và đè lên cụm nút bên phải.

## 2. GIẢI PHÁP ĐỀ XUẤT (PROPOSED CHANGES)

### 🛠️ Bước 1: Khắc phục lỗi co cụm của Theme Toggle & Nút Tải APK
* Thêm `flex-shrink: 0;` cho `.theme-toggle-btn` trong [styles.css](file:///d:/EatFitAI_v1/download-site/styles.css) để giữ nguyên hình tròn 36x36px.
* Thêm `flex-shrink: 0;` và `white-space: nowrap;` cho `.nav-actions .btn-nav` để chữ "Tải APK" luôn nằm trên 1 hàng ngang, không bị bóp méo hay rớt dòng.

### 🛠️ Bước 2: Tối ưu hóa thanh điều hướng cho màn hình laptop nhỏ (1025px - 1180px)
* Thêm một media query bổ sung trong [styles.css](file:///d:/EatFitAI_v1/download-site/styles.css) để tự động thu nhỏ nhẹ khoảng cách (`gap`) và padding của các mục menu desktop khi màn hình hẹp ngang. Giải pháp này giúp thanh menu co giãn thông minh, giải phóng không gian cho cụm nút mà không cần phải thay đổi các breakpoint 1024px hiện tại (tránh làm hỏng layout Bento Grid bên dưới).

---

## 3. RỦI RO & PHƯƠNG ÁN NÉ TRÁNH
* **Rủi ro:** Việc chỉnh sửa breakpoint lớn có thể làm vỡ layout của các khối Bento Grid bên dưới.
* **Phương án né tránh:** Không thay đổi breakpoint `@media (max-width: 1024px)`. Chỉ dùng media query đặc trị cho khoảng `1025px - 1180px` để giảm padding của menu và nút trên Header. Điều này cô lập hoàn toàn thay đổi trong phạm vi Header, bảo đảm an toàn 100% cho các phần bento card bên dưới.

---

## 4. QUY TRÌNH XÁC MINH & NGHIỆM THU
1. **Áp dụng thay đổi CSS:** Sửa đổi [styles.css](file:///d:/EatFitAI_v1/download-site/styles.css).
2. **Kiểm tra tự động với Browser Subagent:** Chụp ảnh màn hình ở độ phân giải 1050px (để test laptop nhỏ), 1200px (PC), 768px và 375px (Mobile).
3. **Đối chiếu kết quả:** Đảm bảo nút theme tròn trịa, chữ Tải APK thẳng hàng, và không còn hiện tượng đè chữ hay chồng chéo.

Bạn vui lòng xem và duyệt kế hoạch này để chúng tôi thực hiện chỉnh sửa ngay lập tức!
