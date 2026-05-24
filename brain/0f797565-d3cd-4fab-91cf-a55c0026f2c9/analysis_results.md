# Báo cáo Phân tích Giao diện Header (Ăn Lành Sống Khỏe)

Tài liệu này báo cáo kết quả kiểm tra giao diện thanh điều hướng Header (đặc biệt là các nút hành động `.theme-toggle-btn` và `.btn-nav`) trên các độ phân giải màn hình khác nhau từ Mobile đến Desktop.

## 1. Hình ảnh chụp màn hình thực tế

Dưới đây là hình ảnh thực tế của Header ở các viewport khác nhau (đã được chụp lại bởi Browser Subagent):

````carousel
![Mobile 375px](file:///C:/Users/PC/.gemini/antigravity/brain/0f797565-d3cd-4fab-91cf-a55c0026f2c9/screenshot_375px.png)
<!-- slide -->
![Tablet 768px](file:///C:/Users/PC/.gemini/antigravity/brain/0f797565-d3cd-4fab-91cf-a55c0026f2c9/screenshot_768px.png)
<!-- slide -->
![Tablet 1024px - Mobile Layout](file:///C:/Users/PC/.gemini/antigravity/brain/0f797565-d3cd-4fab-91cf-a55c0026f2c9/screenshot_1024px_mobile.png)
<!-- slide -->
![Tablet 1024px - Desktop Layout](file:///C:/Users/PC/.gemini/antigravity/brain/0f797565-d3cd-4fab-91cf-a55c0026f2c9/screenshot_1024px.png)
<!-- slide -->
![Desktop 1200px](file:///C:/Users/PC/.gemini/antigravity/brain/0f797565-d3cd-4fab-91cf-a55c0026f2c9/screenshot_1200px.png)
<!-- slide -->
![Desktop 1440px](file:///C:/Users/PC/.gemini/antigravity/brain/0f797565-d3cd-4fab-91cf-a55c0026f2c9/screenshot_1440px.png)
````

## 2. Nguyên nhân lỗi thiết kế (Layout Squishing & Overlapping)

Qua kiểm tra, lỗi thiết kế (như hình ảnh của User gửi) xảy ra ở các viewport trung gian từ **1025px đến 1100px** (hoặc khi người dùng thu nhỏ màn hình trình duyệt ở chế độ Desktop):

1. **Lỗi Co Cụm Méo Mó (Squishing):**
   - Nút chuyển đổi Theme (`.theme-toggle-btn`) có kích thước mặc định là `36px` x `36px` (hình tròn).
   - Nút Tải APK (`.btn-nav`) có text "Tải APK" và padding tương đối lớn.
   - Khi không gian màn hình bị thu hẹp, cả hai phần tử này nằm trong flex container `.nav-actions` nhưng **không được thiết lập thuộc tính `flex-shrink: 0`**.
   - Trình duyệt sẽ ép cả hai nút co nhỏ lại. Nút tròn Theme bị ép thành hình bầu dục (chiều rộng chỉ còn **`29.74px`**), làm méo mó các icon SVG bên trong.
   - Nút Tải APK bị co lại làm cho chữ "Tải APK" bị ngắt thành 2 dòng (hoặc bị đè lên).

2. **Lỗi Tràn & Chồng Chéo (Overlapping):**
   - Do menu desktop (`.nav-links`) chứa quá nhiều mục (6 mục điều hướng dài) nên khi màn hình nhỏ hơn 1100px, menu này chiếm phần lớn không gian.
   - Vì `.nav-links` không có cơ chế tự thu gọn ở độ phân giải 1025px - 1100px, nó đẩy container `.nav-actions` sát về rìa phải, khiến phần tử cuối cùng của menu (link "Hỏi đáp") bị đè lên nút Theme Toggle và nút Tải APK.

## 3. Giải pháp khắc phục đề xuất

- **Ngăn chặn co cụm nút:** Thêm `flex-shrink: 0` cho `.theme-toggle-btn` để luôn giữ hình tròn chuẩn 36x36px.
- **Ngăn chặn ngắt dòng & co cụm nút Tải APK:** Thêm `flex-shrink: 0` và `white-space: nowrap` cho `.btn-nav`.
- **Tăng khoảng cách an toàn:** Điều chỉnh lại khoảng cách (`gap`) của `.nav-actions` và `.header-inner` ở các khoảng màn hình trung gian để tránh đè chữ.
- **Chuyển đổi breakpoint sớm hơn:** Cân nhắc chuyển sang giao diện Mobile (Hamburger menu) sớm hơn (từ 1024px lên 1140px) để tránh khoảng không gian chật chội trên laptop nhỏ.
