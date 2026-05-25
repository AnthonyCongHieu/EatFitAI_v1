# Checklist Tối ưu hóa UI Phân hệ AI Dataset & YOLO11 (EatFitAI Prep)

- [x] **Task 1**: Refactor cấu trúc dữ liệu 10 bước của YOLO11m sang dạng 4 Pha (Phases) chính, rút gọn văn bản mô tả còn 1-2 dòng cô đọng, loại bỏ hoàn toàn thuộc tính `artifacts` (tệp tin đầu ra).
- [x] **Task 2**: Thiết kế sơ đồ biểu đồ luồng trực quan (Visual Chart Flow) bằng HTML/CSS lập thể và các hạt Node nhấp nháy phát sáng tương tác.
- [x] **Task 3**: Tối ưu hóa khối thông tin chi tiết bước được chọn ở phía dưới, chỉ hiển thị Cách xử lý và Lý do kỹ thuật giản lược nhất.
- [x] **Task 4**: Lập trình 4 biểu đồ hoạt họa SVG/CSS động (Dynamic Interactive SVG Micro-Flowcharts) tương ứng cho 4 Pha và gỡ bỏ hoàn toàn hình ảnh tĩnh.
- [x] **Task 5**: Tái cấu trúc Layout trong `DatasetPipeline.tsx`: Đưa 4 biểu đồ hoạt họa SVG động lên thành một Panel lớn trung tâm cao 280px full-width, di dời các khối text chi tiết và Taxonomy Simulator xuống lưới phía dưới.
- [x] **Task 6**: Kiểm thử biên dịch TypeScript (`npx tsc -b`) thành công 100% không cảnh báo.
- [x] **Task 7**: Thiết lập cấu trúc dữ liệu cho bảng so sánh hiệu năng (`COMPARISON_METRICS`) và các tài liệu tham khảo chính chủ (`OFFICIAL_REFERENCES`) trong file `DatasetPipeline.tsx`.
- [x] **Task 8**: Thiết kế và triển khai Bảng So sánh thông số mô hình cũ vs mới (YOLOv8s vs YOLO11m) với giao diện CSS kính mờ, có màu sắc làm nổi bật rõ rệt sự vượt trội của mô hình mới.
- [x] **Task 9**: Thiết kế và triển khai Thẻ Liên kết học thuật & minh chứng chính chủ YOLO với thiết kế tương tác hover chuyển động sang sang trọng.
- [x] **Task 10**: Chạy kiểm tra TypeScript (`npx tsc -b`) trong thư mục dự án `eatfitai-prep-web` để đảm bảo code an toàn và sạch lỗi.

# Checklist Nâng cấp Sơ đồ Kiến trúc Hệ thống (KnowledgeMap.tsx)

- [x] **Task 11**: Lập trình hàm sinh link GitHub `getGithubUrl` và cập nhật `href` các liên kết tệp tin trong Popup Modal.
- [x] **Task 12**: Tái thiết kế hình học sơ đồ (Tăng kích thước node `w: 195, h: 58`, tăng font chữ, dãn rộng toạ độ tĩnh `x` của 6 stage và spacingX khi xem luồng).
- [x] **Task 13**: Biên soạn lại nội dung Dòng chảy và Chi tiết kỹ thuật của 24 nodes bằng văn phong non-tech dễ hiểu, sinh động.
- [x] **Task 14**: Trích dẫn nguyên văn tiêu chí Rubric từ `RubricView.tsx` vào `rubricMapping` của từng node.
- [x] **Task 15**: Chạy `npm run build` để kiểm tra biên dịch tổng thể và đóng gói dự án.

# Checklist Tích hợp Brevo vào Hạ tầng & Chi phí (Infrastructure.tsx)

- [x] **Task 16**: Cập nhật logic tính toán chi phí động (Brevo Cost Formula) theo user scale trong `Infrastructure.tsx`.
- [x] **Task 17**: Cập nhật biểu đồ Donut Chart (thêm phân đoạn Brevo màu cyan `#06b6d4`).
- [x] **Task 18**: Cập nhật biểu đồ Bar Chart (thêm cột Brevo).
- [x] **Task 19**: Cập nhật Sơ đồ Dòng Chảy Hạ Tầng (SVG Flow Diagram) cao 200px, thêm node Brevo (`translate(650, 75)`) và đường kết nối động.
- [x] **Task 20**: Cập nhật Gói Dịch Vụ Đối Chiếu (thêm thẻ so sánh các gói Brevo).
- [x] **Task 21**: Chạy kiểm thử build dự án (`npm run build`) để đảm bảo không lỗi TypeScript/Vite.
