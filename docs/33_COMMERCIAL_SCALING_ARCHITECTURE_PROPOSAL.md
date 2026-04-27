# Commercial Scaling Architecture Proposal - EatFitAI

*Tài liệu này ghi nhận các đề xuất tái cấu trúc hệ thống (Refactoring) thiết yếu để đưa EatFitAI từ bản Beta (hoạt động tốt với vài trăm user) lên phiên bản Thương mại (Commercial) có khả năng chịu tải 10,000+ users mà không bị sập server hay tăng chi phí đột biến.*

---

## 1. Tái cấu trúc Luồng Upload (Data Flow)

### 🔴 Vấn đề hiện tại (Nút thắt cổ chai RAM & Băng thông)
- **Luồng cũ:** `Mobile -> gửi file -> C# Backend -> forward file -> Python AI -> trả kết quả -> C# lưu -> R2`
- **Rủi ro:** 
  - Gây lãng phí RAM trên cả 2 server (Render Free 512MB sẽ crash OOM nếu có 10 người cùng upload).
  - Tốn gấp đôi băng thông nội bộ, tăng độ trễ (latency).

### 🟢 Đề xuất thay đổi: Presigned URL Pattern
- **Luồng mới:**
  1. Mobile gọi C# Backend: xin 1 đường link upload tạm thời (Presigned URL).
  2. C# Backend tạo URL từ Cloudflare R2 (tốn 5ms, 0MB RAM) và trả về cho Mobile.
  3. Mobile tự dùng URL đó để đẩy thẳng file ảnh/audio nặng 4MB lên Cloudflare R2.
  4. Upload xong, Mobile gọi Python AI (hoặc qua C# proxy text): "Ảnh đã có trên R2 với ID là xyz, hãy nhận diện".
  5. Python AI tải ảnh trực tiếp từ R2 (tốc độ mạng nội bộ cloud cực nhanh) và xử lý.
- **Lợi ích:** Giải phóng 100% gánh nặng I/O và RAM cho Server C#. Server từ trạng thái dễ sập trở thành "bất tử" trước việc upload file của user.

---

## 2. Tái cấu trúc Xử lý Giọng nói (Voice NLU)

### 🔴 Vấn đề hiện tại (STT + Regex Code cứng)
- **Cách cũ:** Dùng Gemini Audio để lấy văn bản (Text), sau đó C# dùng Regex (If/Else) để bắt từ khóa.
- **Rủi ro:** Kém thông minh, cứng nhắc. Người dùng nói câu tự nhiên nhưng sai ngữ pháp Regex là hệ thống không hiểu.

### 🟢 Đề xuất thay đổi: LLM Structured Output (NLU)
- **Cách mới:**
  - Gửi thẳng file Audio cho Gemini 2.5 Flash thông qua `generate_with_audio`.
  - Thay đổi Prompt: *"Nghe audio, xác định ý định người dùng. Chỉ trả về JSON format: `{"intent": "ADD_FOOD" | "LOG_WEIGHT", "entities": {"food": string, "quantity": number, "unit": string}}`."*
  - C# Backend nhận thẳng object JSON, không cần parse chuỗi.
- **Lợi ích:** Xóa bỏ toàn bộ code Regex phức tạp. Hiểu được ngôn ngữ tự nhiên 100% (ví dụ: "cho anh đĩa cơm sườn" = "thêm 1 cơm sườn").

---

## 3. Chuyển đổi Vision AI (On-device vs Cloud)

### 🔴 Vấn đề hiện tại (Server-side Object Detection)
- **Cách cũ:** Đẩy ảnh lên server để chạy model YOLO ONNX 15MB.
- **Rủi ro:** Ở mốc 10.000 users, nếu có 20 người dùng cùng chụp món ăn lúc 12h trưa, server 512MB RAM sẽ bị crash. Nếu nâng cấp Server thì tốn rất nhiều tiền (cần Server GPU hoặc CPU xịn). Độ trễ nhận diện phụ thuộc vào mạng 4G của user.

### 🟢 Đề xuất thay đổi (Roadmap tương lai): On-device ML (Edge AI)
- **Cách mới:** Nhúng thẳng model `best.onnx` (15MB) vào app React Native thông qua `onnxruntime-react-native`. Điện thoại của người dùng sẽ tự chạy nhận diện.
- **Lợi ích:** 
  - Zero latency: Nhận diện bounding box realtime trực tiếp trên màn hình camera.
  - Server load = 0%: Server không phải xử lý ảnh, tiết kiệm 100% chi phí tính toán AI Vision.
  - Bảo mật riêng tư (Privacy) tốt hơn vì ảnh chưa cần gửi lên mạng.

---

## 4. Bảo đảm Kênh API (SPOF Mitigation)

### 🔴 Vấn đề hiện tại (Free Tier Bypassing)
- **Cách cũ:** Dùng `GeminiPoolManager` xoay 6 vòng các API Key từ 6 dự án Google Cloud miễn phí khác nhau.
- **Rủi ro thương mại:** Vi phạm điều khoản dịch vụ (ToS) của Google. Rủi ro bị Google quét IP/Fingerprint và khóa cả 6 keys cùng lúc, dẫn đến "chết lâm sàng" toàn bộ tính năng cốt lõi. Không tốt khi Pitching gọi vốn.

### 🟢 Đề xuất thay đổi: Key Thương Mại (Pay-as-you-go)
- **Cách mới:** Cấu hình 1 Key chính thức đã liên kết thẻ tín dụng (Pay-as-you-go). Đặt giới hạn ngân sách (Budget Limit) hàng tháng để tránh bill shock.
- **Lợi ích:** Đảm bảo hệ thống hoạt động hợp pháp, ổn định 99.99% uptime. Dễ dàng show ra với nhà đầu tư về tính bền vững của hạ tầng.
