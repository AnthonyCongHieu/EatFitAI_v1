# KẾ HOẠCH CẢI TIẾN TRỰC QUAN HÓA & TRẢI NGHIỆM HỌC TẬP (EATFITAI PREP)

Chào bạn! Dưới đây là kế hoạch chi tiết cải tiến giao diện ôn tập lý thuyết tốt nghiệp của EatFitAI, nhằm giúp một người có năng lực trung bình cũng có thể tiếp cận nhanh chóng, hiểu rõ bản chất luồng dữ liệu, đạt chuẩn Rubric và tự tin phản biện trước hội đồng.

---

## 1. PHÂN TÍCH VẤN ĐỀ & NGUYÊN NHÂN (EVIDENCE-BASED)
* **Quá tải thông tin (Information Overload):** Màn hình hiển thị quá nhiều chữ kỹ thuật ở cùng một cấp độ. Người mới bắt đầu không phân biệt được đâu là kiến thức cốt lõi bắt buộc, đâu là nâng cao.
* **Sơ đồ SVG quá nhỏ và tĩnh:** Các sơ đồ luồng dữ liệu (Dataflow SVG) có kích thước 600x150px, chữ nhỏ (8-10px) đè nhau và không có tooltip giải thích khi di chuột, gây khó hình dung.
* **Cấu hình font chữ thô cứng:** Cấu hình `fontFamily: "system-ui, sans-serif"` inline đè lên font Inter hiện đại ở `index.css`, làm giảm độ cao cấp của thiết kế.
* **Trùng lặp tính năng:** Tab "Trắc nghiệm" trong màn hình học bị lặp lại với chức năng Quiz chính ở thanh điều hướng bên trái.
* **Không lưu tiến độ học tập:** Khi tải lại trang, mọi điểm tự đánh giá Rubric và trạng thái học đều bị reset.
* **Thiếu câu hỏi phản biện thực tế:** Hiện tại chỉ có 12 câu hỏi phản biện, thiếu các câu hỏi thực tế trong tài liệu quy định (phải đạt tối thiểu 15 câu).

---

## 2. GIẢI PHÁP TRIỂN KHAI CHI TIẾT (5 PHA)

### 🧹 Pha 1: Tinh Gọn Nội Dung & Tối Ưu Phân Cấp (Nhìn Là Hiểu)
* **Thêm TL;DR Summary Box:** Mỗi phần học sẽ có 1-2 câu tóm tắt cực kỳ ngắn gọn, dễ hiểu ở đầu bằng ngôn ngữ bình dân (có gradient nổi bật và icon 💡).
* **Phân cấp Cốt lõi / Nâng cao:** 
  * Badge `🟢 CỐT LÕI` cho kiến thức nền tảng.
  * Badge `🟣 NÂNG CAO` cho kiến thức điểm 9-10.
  * Mặc định ẩn mã lệnh phức tạp (`techBox`) và kiến thức nâng cao vào hộp Accordion, chỉ hiện khi click mở rộng.
* **Xóa tab Quiz trùng lặp:** Loại bỏ code và tab Quiz thừa trong Learn.tsx để tập trung tối đa cho việc học lý thuyết.
* **Khôi phục font chữ cao cấp:** Xóa bỏ `fontFamily` đè đếm, đưa font **Inter** sang trọng trở lại toàn màn hình.

### 📊 Pha 2: Biến Sơ Đồ Tĩnh Thành Trực Quan Động (Nhìn Biểu Đồ Thấy Luồng)
* **Phóng to SVG:** Nâng kích thước viewBox từ `600x150` lên `800x220` (tăng độ rõ nét và giãn khoảng cách nodes).
* **Thêm Interactive Tooltip:** Hover vào bất kỳ node nào trong sơ đồ sẽ hiện tooltip box (absolute div) giải thích tác dụng bằng tiếng Việt ngắn gọn.
* **Chế độ Ôn Tập Từng Bước (Step-by-step Mode):**
  * Thêm nút "▶️ Xem Từng Bước" bên dưới biểu đồ.
  * Khi kích hoạt, người dùng bấm `Tiếp theo` để highlight từng node theo trình tự thực tế của luồng dữ liệu, đi kèm hộp thuyết minh giải thích từng bước.
* **Thêm Chú giải (Legend Box):** Phân biệt rõ các loại node (🟢 Xử lý | 🔵 Lưu trữ | 🟡 Trí tuệ AI | ➡️ Luồng đi).

### 🗺️ Pha 3: Lộ Trình Học Tập Guided Learning Path (Biết Mình Ở Đâu)
* **Thanh Stepper Tiến Độ:** Thanh tiến trình 6 bước tương ứng 6 Stage trên đầu trang. Hiển thị trực quan trạng thái: `Chưa học` (Xám) | `Đang học` (Xanh dương pulse) | `Đã nắm vững` (Xanh lá check).
* **Lưu trạng thái học tập:** Tích hợp `localStorage` tự động lưu giữ tiến độ, điểm số Rubric để không bị mất khi F5 tải lại trang.
* **Nút "Đã nắm vững Stage":** Cuối mỗi Stage có nút bấm hoàn thành. Khi bấm, điểm Rubric tương ứng tự động tăng lên 4-5 sao và cập nhật biểu đồ Radar.
* **Welcome Onboarding Card:** Hiện thông tin chào mừng, hướng dẫn lộ trình học cho người mới mở trang lần đầu.

### 📝 Pha 4: Mở Rộng 15 Câu Phản Biện & Kỹ Năng Trả Lời (Bao Đậu Rubric)
* **Tăng số lượng câu hỏi:** Bổ sung thêm 3 câu hỏi phản biện thực tiễn (nâng tổng số lên 15 câu):
  1. *Lỗi blocker V1 release bị BLOCKED dù nhiều gate pass — Giải thích tại sao?* (Thêm vào Stage 3)
  2. *Gemini API hết quota/hết tiền — Cơ chế Fallback sang mô hình hoặc nhà cung cấp khác ra sao?* (Thêm vào Stage 4)
  3. *Quy trình Rollback hạ tầng từ Lightsail sang Render trong trường hợp khẩn cấp có điều kiện gì?* (Thêm vào Stage 6)
* **Thêm "💬 Mẹo Diễn Đạt Trước Hội Đồng":** Cung cấp lời thoại khuyên dùng (icon 🎤) giúp sinh viên trả lời trôi chảy, tự tin, khéo léo lấy lòng giảng viên.

### 🔧 Pha 5: Kiểm Thử & Kiểm Tra Build
* **Kiểm tra biên dịch:** Đảm bảo TypeScript compile tốt không lỗi type:
  `npx tsc --noEmit --skipLibCheck`
* **Xác minh hiển thị:** Đảm bảo biểu đồ mượt mà, lưu trữ localStorage chạy chuẩn xác.

---

## 3. RỦI RO & PHƯƠNG ÁN PHÒNG NGỪA
* **Rủi ro:** Sửa đổi SVG lớn có thể làm vỡ cấu trúc hiển thị hoặc lệch vị trí tọa độ lines.
* **Phòng ngừa:** Thiết kế tọa độ SVG thủ công, sử dụng tỉ lệ phần trăm và absolute position cho tooltip để đảm bảo responsive chuẩn xác.

---

## 4. XÁC MINH & NGHIỆM THU
* Bấm F5 kiểm tra dữ liệu cũ vẫn giữ nguyên.
* Bấm nút "Xem từng bước" chạy tuần tự mượt mà.
* Bật/tắt accordion kiến thức nâng cao nhanh chóng.

Chúng tôi sẽ tiến hành triển khai ngay lập tức!
