# Kế hoạch Tái cấu trúc Gộp sâu: Giao diện YOLO Unified Dashboard (DatasetPipeline.tsx)

Chào bạn! Nhìn vào ảnh chụp màn hình thực tế mới nhất của bạn, mình đã phát hiện ra nguyên nhân cốt lõi khiến giao diện bị cảm giác **tách biệt vụn vặt** và **kéo dài**:
1. Hiện tại trang đang được cấu thành từ quá nhiều card `glass-panel` rời rạc xếp chồng lên nhau theo chiều dọc (Card KPI Stats, Card Sơ đồ Luồng 4 Pha, Card Hoạt Họa SVG Động Lớn, Card Đánh giá hiệu năng, Card Simulator, Card Tài nguyên...). Điều này làm loãng tính liên kết và kéo dài trang web ra rất nhiều.
2. Để giải quyết triệt để, mình đề xuất một phương án **Tái cấu trúc Gộp sâu (Unified Deep Integration)** cực kỳ đẳng cấp, gom tất cả các card rời rạc này thành đúng **2 Card lớn thống nhất** nằm song song.

---

## 1. Phương án Tái cấu trúc Gộp sâu

Dưới Header chính và 4 KPI Stats mỏng, toàn bộ trang web sẽ được tổ chức lại thành bố cục **2 Cột lớn song song (Grid 1.2fr - 0.8fr)** chứa đúng 2 Card Unified khổng lồ phối hợp nhịp nhàng:

### 🎮 CỘT TRÁI (1.2fr) – Card `YOLO11m Unified Control Hub`
Toàn bộ quy trình huấn luyện, sơ đồ hoạt họa và dữ liệu đối sánh được gộp vào **1 Card lớn duy nhất** theo thứ tự từ trên xuống dưới:
* **Phần 1: Sơ đồ luồng 4 Pha (Interactive Pipeline Flow)**: Đóng vai trò là "Bản đồ điều hướng tổng quan" trực quan ngay trên đầu Card. Người dùng click chọn các bước từ 1 đến 10 tại đây.
* **Phần 2: Khung hoạt họa SVG động chi tiết (Interactive SVG Animator)**: Nằm ngay dưới Sơ đồ luồng. Khung này hoạt động như một "Màn hình hiển thị trung tâm", tự động thay đổi hoạt họa SVG tương ứng với bước (1-10) đang được chọn ở trên.
* **Phần 3: Hệ thống 4 Tabs Phân tích (Hiệu năng, Kiến trúc, Kiểm thử, Cấu hình)**: Nằm ở dưới cùng của Card này dưới dạng bảng thông số tra cứu sâu. Người dùng chuyển đổi mượt mà giữa các tab.

### 📚 CỘT PHẢI (0.8fr) – Card `Data Taxonomy & Proofs Hub`
Toàn bộ phần mô phỏng nhãn, tài nguyên và kiến trúc toàn cục được gộp vào **1 Card lớn duy nhất**:
* **Phần 1: Taxonomy Simulator**: Đặt ở trên cùng, cho phép bấm chọn nhanh nhãn thô và hiển thị kết quả ánh xạ.
* **Phần 2: Tập dữ liệu & Minh chứng học thuật**: Đặt ở giữa, chứa danh sách các link Kaggle, GitHub và tài liệu chính chủ.
* **Phần 3: Kiến Trúc Luồng Pipeline Toàn Cục (ASCII Flow Chart)**: Đặt ở dưới cùng dưới dạng hộp monospace gọn gàng.

---

## 2. Lợi ích vượt trội của Thiết kế Mới

1. **Xóa bỏ hoàn toàn sự tách biệt**: SVG hoạt họa và Báo cáo hiệu năng giờ đây nằm chung trong một "Trung tâm điều khiển" (Control Hub) thống nhất. Việc click chuyển bước 1-10 sẽ tác động trực tiếp và hiển thị ngay lập tức hoạt họa tương ứng ngay bên dưới trong cùng một khung kính mờ glassmorphism sang trọng.
2. **Thu ngắn chiều dài trang đến 60%**: Nhờ bố cục 2 cột song song và việc dùng Tabs cho phần thông số, toàn bộ nội dung hiển thị vừa vặn, cân đối trên màn hình PC, loại bỏ hoàn toàn việc cuộn trang dằng dặc.
3. **Hiệu quả thuyết trình trước hội đồng**: Tạo ấn tượng cực mạnh về một sản phẩm phần mềm hoàn thiện, có tư duy UX/UI cao cấp và giao diện dashboard mang phong cách công nghệ cao của các thư viện AI hiện đại.

---

## 3. Các file sửa đổi chi tiết

### [Component] eatfitai-prep-web

#### [MODIFY] [DatasetPipeline.tsx](file:///d:/EatFitAI_v1/eatfitai-prep-web/src/views/DatasetPipeline.tsx)
* Tái cấu trúc lại luồng render trong JSX:
  * Di chuyển Khối Sơ đồ Luồng 4 Pha và Khối Hoạt Họa SVG vào bên trong thẻ `div` Cột Trái (`glass-panel`).
  * Di chuyển Khối Simulator, Khối Tài Nguyên và Khối Kiến trúc toàn cục vào bên trong thẻ `div` Cột Phải (`glass-panel`).
  * Loại bỏ các thẻ `div` bọc `glass-panel` trung gian không cần thiết để các phần tử kế thừa chung nền kính mờ đồng nhất, mượt mà.
  * Tinh chỉnh lại CSS padding, gap và margins để tạo độ thoáng đãng cao cấp nhất.
  * Đảm bảo tính responsive hoàn hảo: Trên PC hiển thị 2 cột lớn song song, trên Mobile tự động xếp chồng theo chiều dọc cân đối.

---

## 4. Kịch bản Kiểm thử & Xác minh (Verification Plan)

### Kiểm thử Biên dịch (Automated Build Test)
* Chạy biên dịch dự án React để chắc chắn không còn lỗi cú pháp JSX hay TypeScript sau khi di chuyển các khối mã nguồn lớn:
  ```powershell
  npm run build
  ```

### Kiểm thử Thực tế (Manual UX Verification)
1. Khởi chạy dev server và truy cập cổng chạy (ví dụ `http://localhost:5174/` hoặc `http://localhost:5173/`).
2. Xác minh:
   * Sơ đồ SVG 4 pha và hoạt họa SVG lớn hiển thị liền mạch trong cùng một Card bên trái.
   * Các tab Đối sánh, Đối chiếu, Kiểm thử, Phần cứng hoạt động mượt mà ngay dưới hoạt họa.
   * Cột bên phải chứa Simulator, Tài nguyên và ASCII Flow hiển thị đồng bộ trong một Card duy nhất.
   * Không còn hiện tượng card tách biệt vụn vặt và chiều dài trang web được tối ưu hóa xuất sắc.
