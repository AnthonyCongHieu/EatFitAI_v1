# EatFitAI: Báo cáo Trạng thái Dự án & Danh sách Task Chi tiết cho Notion AI

Tài liệu này tổng hợp toàn bộ tiến độ thực tế của dự án **EatFitAI** tính đến ngày **21/12/2025**. Dữ liệu này được thiết kế để AI của Notion có thể "tiêu hóa" và tạo ra bộ Task Board chuẩn xác nhất, phù hợp với tiến độ hiện tại.

---

## 🛠 Tech Stack Overview (Bối cảnh kỹ thuật)
- **Frontend native-like**: React Native (Expo SDK 51), TypeScript, Zustand (State), VictoryChart (Analytics), Glassmorphism UI.
- **Backend**: .NET 9 (C#), Entity Framework Core (SQL Server), Repository Pattern + Service Layer, JWT + Refresh Token.
- **AI Provider**: Flask (Python), YOLOv8 (Food Detection), PhoWhisper (Voice-to-Text Tiếng Việt), Ollama Llama 3.2 (LLM for Nutrition advice/Voice parsing).

---

## 📊 Tổng quan tiến độ (Current Dashboard)
- **Thiết kế & Documentation**: 95% (Đã hoàn thiện SRS, ERD, Use Case trong docs).
- **Core Infrastructure**: 100% (Backend/AI connection, SQL Setup, CORS).
- **Tính năng Xác thực**: 100% (Register, Login, JWT, Refresh Token, Verify Email).
- **Logic Dinh dưỡng & AI**: 90% (BMR, TDEE, Macros, Fallback logic).
- **Mô-đun Nhật ký bữa ăn**: 100% (CRUD, Daily Summary).
- **Xử lý Hình ảnh (Vision)**: 95% (YOLOv8 stable).
- **Xử lý Giọng nói (Voice)**: 85% (PhoWhisper tích hợp, cần refine Voice UI).
- **Thống kê & Dashboard**: 90% (Biểu đồ tuần/tháng hoạt động tốt).
- **Testing**: 20% (Chỉ mới có Unit Test cơ bản, cần bổ sung E2E).

---

## 📝 Danh sách Task chi tiết (Mapping với Notion Links)

Dưới đây là danh sách các đầu việc đã thực hiện và cần làm, được ánh xạ theo các hạng mục của bạn:

### 1. Xây dựng SRS & Thiết kế (Xong 95%)
*   **[Thiết kế Mô hình Use Case & Đặc tả]**: **HOÀN THÀNH**.
    - Đã có sơ đồ Mermaid chi tiết cho 4 nhóm: Xác thực, Nhật ký, AI, Thống kê.
*   **[Lập Project Plan]**: **HOÀN THÀNH**.
    - Đã có roadmap 4 giai đoạn trong `docs/KE_HOACH_PHAT_TRIEN.md`.
*   **[Thiết kế ERD Logic/Vật lý]**: **HOÀN THÀNH**.
    - Đã thiết kế 26 bảng SQL Server. Có sơ đồ Mermaid ERD trong báo cáo tổng hợp.
*   **[Thiết kế Mockups/Wireframes UI/UX]**: **HOÀN THÀNH**.
    - Layout Glassmorphism nhất quán trên Mobile. Theme Dark/Light hỗ trợ tốt.
*   **[Xây dựng Initial DB Schema]**: **HOÀN THÀNH**.
    - Toàn bộ Migration EF Core đã được thực hiện. Seed dữ liệu món ăn Việt (>500 món).

### 2. Infrastructure & Core API (Xong 100%)
*   **[S1 — Setup nền tảng dev]**: **HOÀN THÀNH**.
    - Cấu hình User Secrets, Bind LAN (cho mobile kết nối), CORS open for dev, Health checks.
*   **[P0.1 — Kết nối & Contract]**: **HOÀN THÀNH**.
    - Contract API rõ ràng qua Swagger. Mobile kết nối ổn định qua IP nội bộ.
*   **[Infra Checkpoint: SQL Server & Connection]**: **HOÀN THÀNH**.
    - SQL Server Self-host kết nối ổn định. Fix lỗi Encoding UTF-8 cho toàn bộ DB.

### 3. Authentication & User Profile (Xong 100%)
*   **[Triển khai API Đăng ký/Đăng nhập]**: **HOÀN THÀNH**.
    - Tích hợp Identity + JWT. Hỗ trợ Verify Email bằng OTP.
*   **[P0.2 — Refresh Token]**: **HOÀN THÀNH**.
    - Đã implement logic lưu trữ token trong DB, tự động rotate và revoke.
*   **[Xây dựng React Auth UI]**: **HOÀN THÀNH**.
    - UI đẹp, có validation tại chỗ, xử lý lỗi mượt mà.

### 4. Logic Dinh dưỡng & AI Module 1 (Xong 95%)
*   **[Nghiên cứu và triển khai Logic tính BMR/TDEE]**: **HOÀN THÀNH**.
    - Sử dụng công thức Mifflin-St Jeor chuẩn y khoa.
*   **[P0.3 — AI Dinh dưỡng]**: **HOÀN THÀNH**.
    - Tích hợp Ollama (Llama 3.2) để tư vấn cá nhân hóa. Có fallback sang công thức toán học nếu AI chết.
*   **[Logic tự động điều chỉnh Calo/Macro hằng ngày]**: **HOÀN THÀNH**.
    - AI tự phân tích mục tiêu (Giảm cân, Tăng cân, Duy trì) để set Macros.

### 5. Diary Management (Xong 100%)
*   **[Xây dựng API CRUD cho DiaryEntry]**: **HOÀN THÀNH**.
    - CRUD đầy đủ cho bữa ăn. Logic tổng hợp Calo thực tế vs Mục tiêu.
*   **[Xây dựng React UI cho Ghi nhật ký]**: **HOÀN THÀNH**.
    - UI dạng Timeline, phân loại Sáng/Trưa/Chiều/Phụ. Progress bar Calo trực quan.
*   **[Xây dựng Module tạo món ăn cá nhân (User Food CRUD)]**: **HOÀN THÀNH**.
    - Người dùng có thể tự thêm món ăn riêng nếu DB chưa có.

### 6. AI Vision & Recipe (Xong 90%)
*   **[P0.4 — Flask YOLOv8n /detect]**: **HOÀN THÀNH**.
    - Nhận diện đa mục tiêu. Model `best.pt` load OK trên GPU/CPU.
*   **[P0.5 — Bridge .NET↔Flask + Mapping nhãn]**: **HOÀN THÀNH**.
    - Đã có model `AiLabelMap` để khớp nhãn AI với ID món ăn trong DB.
*   **[P0.6 — Matching recipe]**: **HOÀN THÀNH**.
    - Logic truy vấn công thức dựa trên nguyên liệu/món ăn đã nhận diện.
*   **[Thiết kế Giao diện Input (Camera/Manual)]**: **HOÀN THÀNH**.
    - Cho phép chụp ảnh trực tiếp hoặc chọn từ máy để AI phân tích.

### 7. Analytics & Dashboard (Xong 90%)
*   **[P1.1 — Analytics dùng views vw_* + FE charts]**: **HOÀN THÀNH**.
    - Đã viết SQL Views cho báo cáo Ngày/Tuần/Tháng. FE dùng VictoryChart hiển thị mượt.
*   **[Xây dựng API Tổng hợp dữ liệu]**: **HOÀN THÀNH**.
    - Endpoint `/api/summary/week` và `/month` đã sẵn sàng.
*   **[Tích hợp thư viện Charting và Dashboard]**: **HOÀN THÀNH**.
    - Dashboard hiển thị tỷ lệ Macos, xu hướng cân nặng và Streak.

### 8. Quality Assurance & Final Prep (Đang triển khai - 30%)
*   **[P1.2 — Postman + E2E 2 flow]**: **CHƯA BẮT ĐẦU**.
    - Cần export collection Postman và test manual 2 luồng chính.
*   **[Thực hiện Unit Testing (Backend)]**: **ĐANG LÀM (20%)**.
    - Mới có stub test, cần viết thêm test cho `AuthService` và `NutritionService`.
*   **[Tối ưu hóa hiệu suất]**: **ĐANG LÀM**.
    - Đã tối ưu list (FlashList), cần tối ưu image loading.
*   **[P1.3 — README + API List + Slide + Video]**: **ĐANG LÀM**.
    - Đã có README, cần quay Video Demo và làm Slide.

---

## 🚀 Đề xuất các Task tiếp theo (Dành cho Notion AI)

1.  **[Task] Hoàn thiện Test Coverage**: Viết ít nhất 10 Unit Tests cho logic tính toán Calo/Macro trong Backend.
2.  **[Task] Nâng cấp AI Voice UI**: Cải thiện feedback khi người dùng đang nói (vòng tròn động) và xử lý lỗi khi Voice API timeout.
3.  **[Task] Chuẩn bị Demo Video**: Kịch bản walkthrough từ Đăng ký -> Quét ảnh -> Xem thống kê -> Chat AI (Dưới 5 phút).
4.  **[Task] Tinh chỉnh Model YOLO**: (Optional) Thu thập thêm ảnh thực tế để train lại model `best.pt` tăng độ chính xác lên 85%.
5.  **[Task] Security Hardening**: Thêm Rate Limiting cho Login API và validate dữ liệu từ AI Provider chặt chẽ hơn.

---
**Ghi chú cho Notion AI**: Khi generate task, hãy ưu tiên các task liên quan đến "Verification" và "Documentation" vì phần coding tính năng đã xong đến 90%.
