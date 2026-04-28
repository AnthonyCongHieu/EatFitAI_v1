# EatFitAI System Audit & Evaluation Report

**Date:** 2026-04-27
**Target:** EatFitAI Beta System (Backend C# + AI Provider Python + Mobile React Native)
**Focus:** Objective, non-hallucinated evaluation of flows, AI integration, flaws, and commercial readiness.

---

## 1. Đánh giá luồng dữ liệu hiện tại (User Flows)

Hệ thống hiện tại xử lý 3 luồng chức năng chính: **Quét mã vạch (Barcode)**, **Nhận diện món ăn (Vision AI)**, và **Nhập liệu bằng giọng nói (Voice AI)**.

### 1.1. Luồng Barcode (Tính năng hiện ĐANG HỎNG)
*   **Flow:** Mobile quét mã vạch -> gửi `GET /api/food/barcode/{barcode}` -> Backend C# gọi `FoodService.LookupByBarcodeAsync` -> Truy vấn Database nội bộ (`_context.FoodItems`).
*   **Vấn đề (Lỗi Ngu ngốc):**
    Nếu món ăn KHÔNG có trong DB nội bộ, code chuyển hướng sang gọi `LookupBarcodeFromProviderAsync`. Hàm này lấy `TemplateUrl` từ `_configuration["FoodBarcodeProvider:TemplateUrl"]`.
    *Tuy nhiên*, qua rà soát toàn bộ source code (`appsettings.Production.json` và `appsettings.Development.json`), **biến cấu hình này hoàn toàn không tồn tại**.
    => **Kết quả:** Code luôn trả về `null` trong im lặng (silently fail). Chức năng mã vạch chỉ hoạt động với các món ăn do hệ thống tự seed, không có khả năng lookup bên ngoài như kỳ vọng.
*   **Đề xuất:** Cấu hình API cung cấp dữ liệu mã vạch thật (ví dụ: OpenFoodFacts) vào `appsettings.json` hoặc ẩn nút Barcode nếu chưa sẵn sàng.

### 1.2. Luồng Vision AI (YOLO Scan) & Voice (STT)
*   **Flow:** Mobile chụp ảnh/Ghi âm -> Gửi file nhị phân (Binary) tới Backend C# qua HTTP POST -> Backend C# gửi tiếp file nhị phân đó tới AI Provider (Python) -> AI Provider xử lý (Chạy YOLO ONNX hoặc gọi Gemini Audio) -> Trả về Backend -> Trả về Mobile.
*   **Vấn đề (Data Proxy Anti-Pattern):**
    Đây là nút thắt cổ chai lớn nhất. Backend C# và Python Flask đang đóng vai trò là "người vận chuyển file". Với giới hạn RAM 512MB trên Render, nếu 10 user cùng gửi ảnh 5MB, hệ thống sẽ nhân đôi lượng RAM tiêu thụ (1 bản lưu trong RAM C#, 1 bản truyền sang RAM Python).
    => **Kết quả:** Nguy cơ tràn RAM (OOM - Out of Memory), Crash server, thời gian phản hồi chậm do network overhead.

---

## 2. Phân tích 5 Khía cạnh (Theo yêu cầu)

### 2.1. Học thuật & Nghiên cứu (Academic)
*   **Ưu điểm:** Bám sát xu hướng AI hiện đại (State-of-the-art). Việc chuyển đổi từ PyTorch (`.pt`) sang ONNX (`.onnx`) là chuẩn mực của ngành trong việc tối ưu hóa inference time trên CPU. Việc sử dụng Multimodal LLM (Gemini 2.5 Flash Audio API) thay cho mô hình Whisper độc lập thể hiện sự nhạy bén với kiến trúc AI nhẹ (Lightweight).
*   **Hạn chế:** Thuật toán phân tích giọng nói hiện tại có thể vẫn dùng LLM để bóc tách thực thể (Entity Extraction). Trong học thuật, có thể sử dụng các mô hình SLU (Spoken Language Understanding) chuyên dụng hoặc ép LLM trả về Structured JSON Output để đảm bảo độ chính xác 100% thay vì parse string.

### 2.2. Hiệu năng (Performance)
*   **Ưu điểm:** YOLO ONNX đã giảm inference time từ ~15s xuống 0.2-0.4s. Giải quyết triệt để lỗi 502 Timeout.
*   **Hạn chế:**
    *   **Cold Start:** Server Render Free sẽ ngủ sau 15 phút không hoạt động. Khi bị đánh thức, mất 30s-60s để init lại container. Trải nghiệm người dùng sẽ cực kỳ tệ ở lần quét đầu tiên.
    *   **Egress / Băng thông:** Việc truyền file lớn qua lại giữa Mobile -> Backend -> AI Provider gây tốn băng thông và làm chậm tốc độ (Latency).

### 2.3. Bảo mật (Security)
*   **Ưu điểm:** Backend C# và AI Provider giao tiếp thông qua `X-Internal-Token` (Internal Authentication). Điều này ngăn chặn hacker gọi trực tiếp vào cổng AI Provider.
*   **Hạn chế:** Kiến trúc xoay vòng API Key (Key Pool) của Gemini hiện tại được thiết kế để "lách" giới hạn Free Tier. Nếu có lộ lọt log chứa key, hoặc Google đổi chính sách Fingerprint, hệ thống sẽ sụp đổ hàng loạt.

### 2.4. Thương mại hóa (Commercial)
*   **Ưu điểm:** Chi phí vận hành hiện tại (Beta) cực kỳ rẻ (gần như 0 đồng) do tận dụng Free Tier Render, Supabase, Cloudflare R2, Google AI.
*   **Hạn chế chí mạng:** Không thể scale lên 10,000+ users với kiến trúc này.
    *   **SPOF (Single Point of Failure):** Dựa vào API Free của Google là rủi ro kinh doanh không thể chấp nhận được.
    *   Giới hạn 512MB RAM của Render sẽ sập ngay khi có Concurrency (Nhiều người dùng cùng lúc).

### 2.5. Thẩm mỹ & Trải nghiệm (Aesthetic / UX)
*   **Hạn chế:** Cold Start khiến app có vẻ "đơ" trong lần đầu sử dụng. Việc quét mã vạch không trả ra kết quả do thiếu API Provider khiến UX bị hụt hẫng.

---

## 3. Kiến trúc Đề xuất (Commercial Roadmap)

Để hệ thống sẵn sàng cho Production thương mại, BẮT BUỘC thực hiện các thay đổi sau:

1.  **Cấu hình lại Barcode Provider:**
    *   Bổ sung `FoodBarcodeProvider:TemplateUrl` (VD: API OpenFoodFacts) vào `appsettings.Production.json`.
2.  **Chuyển đổi sang kiến trúc Presigned URL (Loại bỏ Data Proxy):**
    *   Mobile gửi Request xin Upload -> Backend cấp 1 URL (Cloudflare R2 Presigned).
    *   Mobile upload **trực tiếp** ảnh/âm thanh lên Cloudflare R2.
    *   Mobile gửi ID/URL của file vừa upload cho Backend -> Backend gửi URL cho AI Provider.
    *   AI Provider tải file trực tiếp từ R2 hoặc đẩy thẳng URL đó vào Gemini (Gemini hỗ trợ đọc URI trực tiếp). Cấu trúc này giảm tải 100% RAM cho việc nhận file ở cả C# và Python.
3.  **Thay thế Key Pool bằng Key Trả Phí (Pay-as-you-go):**
    *   Sử dụng một API key cấp độ Doanh nghiệp có nạp tiền để đảm bảo SLA (Service Level Agreement).
4.  **Chống Cold Start:**
    *   Nâng cấp gói Render trả phí (7$/tháng) cho Backend và AI Provider, hoặc chuyển sang chạy Serverless (AWS Lambda/Cloud Run).
5.  **Nghiên cứu On-device AI (Lộ trình dài hạn):**
    *   Đẩy YOLO ONNX (.ort) trực tiếp vào code React Native thông qua `react-native-onnx` hoặc TensorFlow Lite. Khi đó, nhận diện vùng ảnh sẽ được xử lý ở máy điện thoại, backend chỉ tốn chi phí gọi LLM phân tích calories. Tiết kiệm tối đa chi phí server.
