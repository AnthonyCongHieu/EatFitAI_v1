# Kế Hoạch Triển Khai: Tạo Bản Sao Web Ôn Tập Tốt Nghiệp Dành Cho SmartCare

Tài liệu này mô tả chi tiết kế hoạch sao chép, cấu hình và tùy biến toàn bộ ứng dụng web ôn tập tốt nghiệp (ReactJS + Vite) từ dự án **EatFitAI** sang **SmartCare**. Bản sao hoàn thiện sẽ được lưu trữ tại thư mục `C:\Users\PC\OneDrive\Desktop\smartcare-prep-web` ngoài Desktop của người dùng.

---

## 📌 Tổng Quan Dự Án SmartCare

**SmartCare** là một hệ thống quản lý sức khỏe cá nhân (Mobile App + Backend Server) có các tính năng cốt lõi:
1. **Quản lý thuốc & Nhắc nhở thông minh:** Lên lịch uống thuốc hàng ngày/cách ngày, tự động tạo nhắc nhở, gửi thông báo đa giai đoạn (15m, 10m, 5m trước và đúng giờ), cập nhật trạng thái "Đã uống", "Bỏ qua", hoặc tự động chuyển thành "Đã quên" sau 1 giờ.
2. **Nhật ký sức khỏe:** Ghi nhận bữa ăn (calo), vận động (calo tiêu thụ), và triệu chứng sức khỏe (cảnh báo nghiêm trọng mức độ >= 7).
3. **Quản lý lịch hẹn khám:** Lên lịch khám bác sĩ, nhắc nhở trước 24 giờ.
4. **Trợ lý AI tư vấn:** Gọi OpenAI API để tư vấn sức khỏe, phân tích đơn thuốc từ ảnh (Vision), nhận diện triệu chứng bệnh lý, và phân tích báo cáo sức khỏe.
5. **Chức năng Caregiver (Người chăm sóc):** Liên kết tài khoản qua mã 6 chữ số, giám sát chỉ số sức khỏe của bệnh nhân, nhận cảnh báo triệu chứng nặng, quản lý lịch hẹn (không có quyền sửa thông tin cá nhân hay xóa dữ liệu).
6. **Thư giãn & Wellness:** Bài tập thở, nghe nhạc thư giãn (Chill, Rain, Forest, Sea).
7. **Phát hiện té ngã & SOS:** Sử dụng cảm biến gia tốc Accelerometer trên điện thoại để phát hiện té ngã đột ngột và gửi cảnh báo SOS kèm vị trí GPS.
8. **Đồng bộ ngoại tuyến (Offline First):** Lưu trữ dữ liệu Zustand xuống AsyncStorage, quản lý hàng đợi đồng bộ ngầm khi kết nối internet được khôi phục.

**Tech Stack:**
- **Frontend (Mobile):** React Native (TypeScript), React Navigation, Notifee local notifications, Geolocation, react-native-sensors (Accelerometer), react-native-track-player, AsyncStorage, Axios Interceptors (JWT Refresh Token Queue).
- **Backend (Server):** Node.js, Express, MongoDB Atlas (Mongoose ODM), OpenAI API (chat/vision), bcryptjs, jsonwebtoken, Cloudinary (upload ảnh), multer, zod, pdfkit (xuất báo cáo PDF).
- **Hạ tầng:** VPS triển khai Node.js backend qua PM2, SSL tự động bằng Caddy Server, MongoDB Atlas Cloud Database, Cloudinary Storage.

---

## 🛠️ Các Bước Thực Hiện Chi Tiết

### Bước 1: Khởi Tạo Dự Án Ngoài Desktop (Đã hoàn thành sao chép)
- Đã thực hiện sao chép toàn bộ mã nguồn của web ôn tập từ `D:\EatFitAI_v1\eatfitai-prep-web` sang `C:\Users\PC\OneDrive\Desktop\smartcare-prep-web`.
- Thư mục đích đã sẵn sàng để chỉnh sửa.

### Bước 2: Thay Thế Cơ Sở Dữ Liệu Ôn Tập (src/data/)
Chúng ta sẽ viết lại hoàn toàn các file dữ liệu trong thư mục `C:\Users\PC\OneDrive\Desktop\smartcare-prep-web\src\data\` để phản ánh 100% kiến thức của SmartCare:

1. **[MODIFY] [chapters.ts](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/data/chapters.ts):**
   - Thay đổi 4 chương học tập lý thuyết.
   - Tập trung vào: Lý thuyết offline sync, Notifee notification engine, thuật toán phát hiện té ngã, MongoDB schemas, JWT authentication, và OpenAI Integration.

2. **[MODIFY] [flashcards.ts](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/data/flashcards.ts):**
   - Viết lại 30 flashcards ôn tập nhanh.
   - Chủ đề: offline queue, Notifee scheduling, accelerometer threshold, Express routing, Mongoose ODM, JWT security, Caddy proxy, Cloudinary image upload, Zod schemas, và caregiver validation rules.

3. **[MODIFY] [gitCommits.ts](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/data/gitCommits.ts):**
   - Cập nhật 20+ git commits thực tế của dự án SmartCare.
   - Đổi tác giả thành `phuc2610` và các commits tính năng liên quan đến caregiver, SOS, notifee, offline sync, Mongoose migrations...

4. **[MODIFY] [mockQA.ts](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/data/mockQA.ts):**
   - Xây dựng 25 câu hỏi phản biện lý thuyết chất lượng cao của Hội đồng dành cho SmartCare.
   - Cung cấp các câu trả lời mẫu xuất sắc, làm nổi bật tính thực tiễn và thiết kế tối ưu của SmartCare.

5. **[MODIFY] [quizzes.ts](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/data/quizzes.ts):**
   - Tạo 25 câu hỏi trắc nghiệm ôn tập về kỹ thuật và nghiệp vụ của SmartCare.
   - Thêm phần giải thích chi tiết cho từng đáp án.

6. **[MODIFY] [sourceCodes.ts](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/data/sourceCodes.ts):**
   - Cập nhật các đoạn code mẫu thực tế của SmartCare để học viên có thể xem trực tiếp trên UI:
     - `PLAN.md` của SmartCare.
     - `SETUP_GUIDE.md` cài đặt backend Node.js & mobile React Native.
     - `fall_detection_research.md` nghiên cứu thuật toán té ngã.
     - `ecosystem.config.js` cấu hình deploy PM2.
     - `app.js` khởi động Express + kết nối MongoDB.
     - `ai.service.js` gọi OpenAI API (chat/vision).
     - `Medication.js` & `Reminder.js` Mongoose Schemas.
     - `App.tsx` React Native di động.
     - `package.json` và `.env` cấu hình.
     - Báo cáo tóm tắt Chương 1, 2, 3, 4.

### Bước 3: Chỉnh Sửa Các View Giao Diện (src/views/)
Chúng ta sẽ cập nhật các view để chuyển đổi toàn diện trải nghiệm người dùng sang SmartCare:

1. **[MODIFY] [Learn.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/views/Learn.tsx):**
   - Cập nhật Sơ đồ Dòng chảy dữ liệu động SVG (Knowledge Map) cho SmartCare:
     - Stage 1: Dòng chảy Nghiệp vụ (Thông tin bệnh nhân -> Uống thuốc & Nhắc nhở -> Ghi nhận nhật ký -> Phát hiện té ngã -> Báo cáo sức khỏe).
     - Stage 2: Kiến trúc Mobile (UI React Native -> Zustand Store -> AsyncStorage lưu offline -> Axios Interceptor JWT Queue -> Express Backend API).
     - Stage 3: Xử lý Backend (HTTP Request -> Caddy HTTPS SSL -> Express Routing/Zod Validation -> JWT Auth Middleware -> Mongoose ODM -> MongoDB Atlas).
     - Stage 4: Luồng xử lý ảnh AI & Cloud Storage (Chọn ảnh đơn thuốc -> Upload Cloudinary -> Gọi OpenAI API Vision trích xuất -> Trả về DTOs -> Tạo Medication/Reminders database).
     - Stage 5: Giao tiếp mạng & Cô lập bảo mật (Request di động -> Caddy HTTPS -> Express Backend -> AWS/VPC Private network -> MongoDB Atlas Cloud).
     - Stage 6: Bảo mật tệp tin & Quy trình kiểm thử (Credentials .env -> chmod 0600 Linux -> Kiểm thử E2E qua ADB over Wi-Fi -> Xử lý blocker ngắt kết nối ADB E2E -> Chứng nhận Rubric điểm TỐT).
   - Cập nhật toàn bộ tooltip giải thích cho các node SVG.
   - Cập nhật 15 câu hỏi phản biện "độc chiêu" của Hội đồng và speaking tips theo dự án SmartCare.
   - Cập nhật các bảng đối sánh so sánh công nghệ (so sánh Notifee vs React Native Push, MongoDB vs PostgreSQL, Express vs ASP.NET, Caddy vs Nginx).

2. **[MODIFY] [AIChatbox.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/views/AIChatbox.tsx):**
   - Cập nhật welcome message của trợ lý AI: "Xin chào em! Tôi là **Trợ lý Hỏi đáp Đồ án SmartCare**. 🤖 Tôi đã được nạp toàn bộ kiến thức kỹ thuật chi tiết của đồ án tốt nghiệp SmartCare, bao gồm..."
   - Điều chỉnh prompt hệ thống (system prompt) gửi lên Gemini API (nếu người dùng cấu hình key) để hướng dẫn AI trả lời tập trung vào kiến thức của đồ án SmartCare thay vì EatFitAI.

3. **[MODIFY] [ChatDefense.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/views/ChatDefense.tsx):**
   - Thay đổi các localStorage keys từ `eatfitai_...` thành `smartcare_...`.
   - Sửa các đoạn text hiển thị, lời chào và hướng dẫn của Hội đồng phản biện.

4. **[MODIFY] [Dashboard.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/views/Dashboard.tsx):**
   - Đổi tiêu đề và các mô tả nhiệm vụ ôn tập bám sát vào tech stack SmartCare (MongoDB, Caddy, Notifee, Accelerometer).
   - Thay đổi các localStorage keys để tránh xung đột dữ liệu cũ.

5. **[MODIFY] [Quiz.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/views/Quiz.tsx) & [RubricView.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/views/RubricView.tsx):**
   - Cập nhật các đoạn text giải thích kết quả và các localStorage keys tương ứng.

### Bước 4: Chỉnh Sửa Các File Cấu Hình Dự Án
1. **[MODIFY] [App.tsx](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/src/App.tsx):**
   - Đổi tiêu đề Sidebar và Header từ `EatFitAI Prep` sang `SmartCare Prep`.
   - Đảm bảo các đường dẫn import view hoạt động mượt mà.

2. **[MODIFY] [index.html](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/index.html):**
   - Sửa thẻ `<title>` thành `SmartCare - Trợ Lý Ôn Tập Tốt Nghiệp`.

3. **[MODIFY] [package.json](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/package.json):**
   - Sửa tên dự án thành `"smartcare-prep-web"`.

4. **[NEW] [PLAN.md](file:///C:/Users/PC/OneDrive/Desktop/smartcare-prep-web/PLAN.md):**
   - Tạo file `PLAN.md` mới tại thư mục gốc dự án SmartCare trên Desktop để lưu vết kế hoạch phát triển theo đúng quy chuẩn `RULE[user_global]`.

---

## 🔍 Kế Hoạch Xác Minh (Verification Plan)

### Kiểm Thử Tự Động:
1. **Kiểm tra lỗi TypeScript:**
   Chạy lệnh tsc để quét lỗi biên dịch kiểu:
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```
2. **Kiểm tra build đóng gói Vite:**
   Chạy build dự án xem có phát sinh lỗi bundler nào không:
   ```bash
   npm run build
   ```

### Kiểm Thử Thủ Công:
1. **Kiểm tra khởi chạy local:**
   Khởi chạy dự án bằng lệnh:
   ```bash
   npm run dev
   ```
   Truy cập `http://localhost:5173/` để kiểm tra giao diện.
2. **Xác minh nội dung hiển thị:**
   - Kiểm tra xem tiêu đề trang và sidebar đã chuyển thành **SmartCare** hay chưa.
   - Tab **Học tập lý thuyết**: Xác minh sơ đồ luồng SVG hiển thị các node của SmartCare và tooltip hiển thị tiếng Việt chính xác.
   - Tab **Trắc nghiệm**: Chơi thử 1 lượt xem các câu hỏi có bám sát SmartCare (MongoDB, Notifee, SOS...) và hiển thị giải thích đúng không.
   - Tab **Trợ lý Hỏi đáp AI**: Chat thử một câu hỏi để kiểm tra câu chào bot và tính năng dọn dẹp chat.
   - Tab **Hội đồng phản biện**: Chơi thử 1 lượt giả lập phản biện xem có hiện câu hỏi chất vấn của SmartCare hay không.
   - Kiểm tra xem tiến độ học tập có được lưu chính xác vào localStorage mới (`smartcare_...`) và không bị xung đột với app EatFitAI cũ.

---

## ⚠️ Rủi Ro Và Phương Án Xử Lý

1. **Lỗi cú pháp TypeScript trong file data cực lớn:**
   - *Rủi ro:* Việc viết lại các file data lớn như `mockQA.ts` và `quizzes.ts` dễ dẫn đến thiếu dấu phẩy, ngoặc, hoặc sai kiểu dữ liệu Interface.
   - *Khắc phục:* Luôn chạy `npx tsc --noEmit` sau mỗi file sửa đổi để phát hiện lỗi ngay lập tức.
2. **Tràn bộ nhớ hoặc lỗi layout SVG trong Learn.tsx:**
   - *Rủi ro:* Cấu trúc SVG được vẽ cứng bằng toạ độ, nếu thay đổi tên các node mà text quá dài sẽ gây tràn khung hoặc đè chữ.
   - *Khắc phục:* Căn chỉnh toạ độ chữ (`x`, `y`) và thẻ `<rect>` trong SVG một cách tỉ mỉ. Rút gọn các nhãn text tối đa để hiển thị đẹp mắt.
3. **Mất tiến độ cũ của người dùng:**
   - *Rủi ro:* Khi đổi localStorage key, người dùng mở app lên sẽ thấy tiến độ về 0%.
   - *Khắc phục:* Giải thích rõ cho người dùng đây là bản sao độc lập dành riêng cho SmartCare, tiến độ cũ của EatFitAI vẫn được lưu trữ nguyên vẹn ở trang web cũ.

---

> [!IMPORTANT]
> Tôi đã chuẩn bị đầy đủ các nguồn tư liệu kỹ thuật chi tiết của SmartCare. Xin vui lòng phê duyệt kế hoạch triển khai này để tôi tiến hành sửa đổi mã nguồn dự án trên Desktop của bạn!
