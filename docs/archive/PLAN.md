# Đề Xuất Giải Pháp Cloud Production cho EatFitAI

Dựa trên stack hiện tại (Mobile React Native, .NET Core 9, Python AI Provider, SQL Server), tôi đề xuất giải pháp kiến trúc cloud nhắm tới **Production, tối ưu chi phí và dễ vận hành (Pragmatic approach)**.

## 1. Phân Tích Component & Giải Pháp Đề Xuất

### A. Mobile App (Expo / React Native)
- **Giải pháp**: Xây dựng qua **Expo Application Services (EAS Build)**.
- **Phân phối**: Upload trực tiếp lên Google Play Store và Apple App Store qua EAS Submit hoặc tải file `.apk` nội bộ.
- **Chi phí**: $0 (Free tier của Expo).

### B. Database
- **Lựa chọn 1 (Giữ nguyên SQL Server - Đề xuất)**: **Azure SQL Database** (Serverless hoặc Basic Tier).
  - Ưu điểm: Không cần sửa code .NET (vẫn xài `Microsoft.EntityFrameworkCore.SqlServer`). Dễ scale.
  - Nhược điểm: Chi phí Azure SQL cao hơn PostgreSQL một chút (~$5-$15/tháng cho tệp nhỏ).
- **Lựa chọn 2 (Đổi sang Supabase - Postgres)**: **Supabase Managed Postgres**.
  - Ưu điểm: Hệ sinh thái cực mạnh, Free tier rộng rãi, giá rẻ ($25/tháng cho bản Pro, database bự).
  - Nhược điểm: Phải đổi provider của EF Core sang `Npgsql.EntityFrameworkCore.PostgreSQL` và mất thời gian setup lại migration.

### C. Backend API (.NET 9)
- **Giải pháp**: Đóng gói thành Docker Container và host trên **Railway.app** hoặc **Render.com**.
- Ưu điểm: Tích hợp CI/CD tự động từ GitHub. Nếu có push vào nhánh `main`, hệ thống tự build và deploy. Hỗ trợ HTTPS tự động.
- Chi phí: ~$5 - $10 / tháng.

### D. AI Provider (Python - YOLO & Ollama)
Đây là service ăn phần cứng nhất. Việc tự host Ollama (LLM) trên GPU cho production **rất đắt đỏ và khó scale**.
- **Pragmatic Shift (Bắt buộc để production giá rẻ)**:
  1. **Thay thế Ollama bằng Cloud LLM APIs**: Dùng Google Gemini 1.5 Flash hoặc OpenAI GPT-4o-mini hoặc DeepSeek. Chi phí là dạng Pay-as-you-go, siêu rẻ, siêu nhanh và không cần quản trị Server. Sửa code Python AI Provider để gọi API thay vì gọi Ollama local.
  2. **YOLO Model (Computer Vision)**:
     - *Hướng 1*: Host Python AI Provider lên **Railway/Render** chung với Backend. YOLOv8s chạy bằng CPU. Khá ổn nếu traffic ban đầu thấp (1 inference mất ~0.5s - 1s).
     - *Hướng 2*: Deploy Python app lên **Modal.com** hoặc **RunPod Serverless**. YOLO sẽ được chạy trên GPU cấp tốc theo phương thức Serverless (Tức là chỉ tính tiền bằng mili-giây khi có request tới, cold-boot cực nhanh). Chi phí cực rẻ (~$5/tháng).

## 2. Các Bước Triển Khai (Execution Steps)

1. **Phase 1: Refactor AI Service (Pragmatic Shift)**
   - Gỡ Ollama local, thay bằng API key của Gemini/OpenAI trong `.env`.
   - Update `ai-provider` để expose standard REST API cho YOLO inference và LLM. Thiết lập Dockerfile cho `ai-provider`.
2. **Phase 2: Database Preparation**
   - Lập tài khoản Azure SQL (hoặc Supabase nếu muốn migrate).
   - Chạy lệnh `dotnet ef database update` trỏ connection string lên Cloud Database thực tế để khởi tạo schema.
3. **Phase 3: Dockerize & CI/CD Backend**
   - Thêm `Dockerfile` chuẩn cho ASP.NET Core 9 vào thư mục `eatfitai-backend`.
   - Setup tài khoản Railway/Render, kết nối tới Github repo.
   - Thêm Environment Variables (Secrets, Connection Strings) trên Cloud dashboard.
4. **Phase 4: Deploy AI Provider**
   - Đưa `ai-provider` lên Render (chạy CPU) hoặc Modal.com (chạy GPU Serverless).
   - Setup API Key security (Tránh bị public gọi chùa).
5. **Phase 5: Mobile App Pointing**
   - Sửa URL API trên `eatfitai-mobile` (từ `http://10.0.2.2` sang `https://eatfitai-backend-production...`).
   - Build aab/apk với EAS.

## 3. Thay Đổi Cấu Trúc Dữ Liệu (Data Structure Changes)
- EF Core có cấu trúc migration hiện tại. Nếu chuyển đổi sang Supabase (Postgres) sẽ phải mapping lại từ đầu một số Data Types (VD: `datetime2` sang `timestamp`). Nếu ở lại SQL Server (Azure) thì không thay đổi gì.

## 4. Rủi Ro & Khuyến Nghị (Risks & Recommendations)
- **Rủi ro Memory AI Provider**: YOLO load vào RAM/VRAM khá tốn. Hosting trên VPS rẻ tiền có thể gặp lỗi OOM (Out of Memory). -> *Nên chọn giải pháp Serverless như Modal.com cho YOLO.*
- **Security**: Khi đưa lên cloud, 2 services (Backend và AI Provider) bắt buộc phải giao tiếp thông qua API Keys nội bộ `API_KEY_SECRET` chứ không còn chung Localhost.

---
**Yêu cầu phản hồi:** 
Bạn hãy xác nhận:
1. Bạn muốn giữ lại SQL Server (lên Azure SQL) hay muốn chuyển sang Supabase (Postgres)? 
2. Đỉnh hướng chuyển Ollama thành Cloud LLM API (Gemini/OpenAI) và Serverless YOLO bạn có đồng ý không? (Bước này tiết kiệm hàng chục triệu/tháng tiền duy trì Server GPU).
