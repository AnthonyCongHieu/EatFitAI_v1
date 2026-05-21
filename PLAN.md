# KẾ HOẠCH TỐI ƯU HÓA BENTO GRID & SỬA LỖI MASCOT MOCHI BỊ MỜ (PC & MOBILE)

## 1. MỤC TIÊU CẢI THIỆN
- **Thu nhỏ nhẹ nhàng giao diện (PC & Mobile)**: Giảm chiều cao cuộn trang (scroll) trên cả hai nền tảng để giao diện trở nên gọn gàng, tinh tế và chuyên nghiệp hơn, đáp ứng yêu cầu "nhỏ lại chỉ 1 chút thôi".
- **Cải tổ triệt để Bento Grid trên Mobile**: Giảm **50%** chiều dài cuộn trang trên Smartphone nhỏ (<= 576px) bằng cách chuyển từ layout xếp dọc (**flex-column**) sang layout nằm ngang (**flex-row**).
- **Khắc phục triệt để lỗi Mascot MoChi bị mờ khi co giãn**: Đảm bảo các hình ảnh MoChi sắc nét 100% khi co giãn cửa sổ trình duyệt trên PC hoặc hiển thị trên các thiết bị di động.
- **Không thay đổi cấu trúc dữ liệu**: Mọi thay đổi hoàn toàn nằm ở tầng giao diện (CSS/HTML).

---

## 2. KẾ HOẠCH CHI TIẾT CHO PC & MOBILE

### A. Tối ưu cho PC (Màn hình lớn >= 1200px)
- **Giảm chiều cao cơ sở**: Hạ `grid-auto-rows` từ `minmax(275px, auto)` xuống `minmax(220px, auto)`.
- **Căn chỉnh lại padding & gap**: Giảm padding trong bento-card từ `28px` xuống `20px`, giảm gap từ `20px` xuống `16px`.
- **Thu gọn typography**:
  - Tiêu đề `h3` giảm xuống `1.12rem` (gọn gàng, tinh tế hơn).
  - Mô tả `p` giảm xuống `0.8rem` (line-height: 1.5).
- **Khắc phục lỗi MoChi bị mờ**:
  - Loại bỏ các thuộc tính `transform: scale()` dùng để co ảnh raster. Thay thế bằng định lượng kích thước thực tế (`width` và `height` bằng pixel rõ ràng).
  - Áp dụng thuộc tính render chất lượng cao để khử mờ:
    ```css
    .bento-mascot-img {
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
      object-fit: contain !important;
    }
    ```

### B. Tối ưu cho Tablet & Màn hình trung bình (577px - 1024px)
- **Layout 2 cột ghép cặp thông minh**:
  - Các card lớn (Card 1, 3, 4, 7) chiếm full 2 cột (`span 2`).
  - Các card nhỏ (Card 2, 5, 6, 8) xếp song song 2 bên (`span 1`).
  - Đảm bảo các con MoChi ở kích thước này co giãn sắc nét qua CSS, không bị mờ nhòe.
  - Sử dụng chiều cao bằng nhau tự động theo dòng (`height: 100%`).

### C. Tối ưu hóa tối đa cho Smartphone nhỏ (<= 576px)
Để loại bỏ việc scroll quá nhiều, chúng ta sẽ chuyển Bento Card sang **Flex-Row nằm ngang**:
- **Cấu hình Layout Ngang**:
  - Thiết lập `.bento-card` thành `display: flex; flex-direction: row !important; align-items: center !important; gap: 16px !important; padding: 16px !important;`.
- **Phân phối nội dung 60-40**:
  - **Bên trái (60% - 65% chiều rộng)**: Chứa text (`.bento-content-wrap`). Chữ trải ngang sẽ ít bị xuống dòng hơn rất nhiều, làm giảm chiều cao dọc của card xuống mức tối thiểu.
  - **Bên phải (35% - 40% chiều rộng)**: Khu vực hiển thị Widget thu gọn (Compact Widget Area).
- **Thu gọn triệt để các widgets bên phải**:
  - **Card 1 (Camera AI):** Mockup điện thoại đặt dọc bên phải, thu nhỏ thành `width: 75px; height: 95px`.
  - **Card 2 (Quota AI):** Xếp các progress bar mỏng dọc bên phải; ẩn `.quota-guarantees`.
  - **Card 3 (Voice AI):** Hiển thị 2 bong bóng chat AI thu gọn xếp chồng lên nhau bên phải, ẩn biểu đồ âm thanh cồng kềnh.
  - **Card 4 (Macros):** Vòng tròn macros scale xuống `scale(0.6)` bên phải, ẩn bảng legend mô tả (đưa thông số P-C-F trực tiếp vào vòng tròn hoặc hiển thị tối giản).
  - **Card 5 (Nước):** Đặt cốc nước và nút bấm nhỏ cạnh nhau nằm ngang bên phải.
  - **Card 6 (Streak):** Hiển thị đốm lửa lớn kèm số ngày streak, và 3 huy hiệu nhỏ xếp ngang bên phải.
  - **Card 7 (AI Recipes):** Mockup công thức thu gọn thành một hình chữ nhật nhỏ nằm ngang bên phải.
  - **Card 8 (Auth Sync):** Đặt nút đăng nhập Google mockup và Supabase sync badge xếp dọc gọn gàng bên phải.

---

## 3. RỦI RO & PHƯƠNG ÁN KHẮC PHỤC
- **Rủi ro tràn chiều ngang (Horizontal Overflow) ở màn hình 320px (iPhone SE)**: Khi ép text và widget nằm ngang, nếu text quá dài hoặc widget không co giãn tốt sẽ gây tràn viền.
- **Khắc phục**:
  - Áp dụng `min-width: 0` cho text wrap để flexbox tự động tính toán co giãn chữ.
  - Sử dụng `flex-shrink: 0` cho khu vực widget bên phải để giữ nguyên kích thước widget không bị bóp méo.
  - Sử dụng `-webkit-line-clamp: 2` cho thẻ mô tả `p` trên mobile để đảm bảo nội dung đồng đều, không bị lệch hàng.

---

## 4. CÁC BƯỚC THỰC HIỆN TIẾP THEO
1. Gửi bản kế hoạch này đến USER để phê duyệt.
2. Sau khi được phê duyệt, tiến hành chỉnh sửa file `styles.css` và `mobile-override.css` theo đúng mô tả.
3. Cập nhật cache version trong `index.html`.
4. Yêu cầu USER kiểm tra trực tiếp trên thiết bị hoặc DevTools responsive.
