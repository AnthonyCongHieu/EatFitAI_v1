# Mục tiêu: Refactor Upload Flow & Khắc phục Data Proxy Anti-Pattern

Hệ thống hiện tại có lỗ hổng nghiêm trọng ở phần truyền tải dữ liệu ảnh (Vision) và âm thanh (Voice). Hiện nay, ứng dụng Mobile upload file nhị phân trực tiếp lên C# Backend. Backend lại đóng vai trò là "Proxy", tiếp tục upload (hoặc forward stream) file sang Python AI Provider.
- **Rủi ro:** Gây quá tải RAM, tắc nghẽn băng thông C#, và nguy cơ Out-of-Memory do mã hóa Base64 dư thừa.

## Yêu cầu xem xét (User Review Required)

> [!WARNING]
> Đây là thay đổi ở mức kiến trúc **Cross-Stack** (ảnh hưởng đến Mobile, C# Backend và Python AI Provider). Sẽ có breaking changes ở cả 3 hệ thống.

> [!IMPORTANT]
> Cấu hình Cloudflare R2 `mediaOptions.PublicBaseUrl`, `r2Options.AccountId`, `r2Options.Bucket`, v.v... cần phải được cấu hình thật trong môi trường Production/Local. Hiện tại đang giả định là đã có vì `R2MediaStorageService` đã được cài đặt.

## Thay đổi đề xuất (Proposed Changes)

---

### Backend C# (.NET Core)

1. **`IMediaStorageService.cs` & `R2MediaStorageService.cs`**
   - Thêm phương thức `GetPresignedUrlAsync(string objectPath, TimeSpan expiresIn, string contentType, string method)` để tạo Pre-signed URL cho lệnh PUT.
2. **Thêm `StorageController.cs`**
   - Endpoint `GET /api/storage/presigned-url`: Nhận `fileName` & `contentType` và trả về `uploadUrl` (Pre-signed URL) và `publicUrl` (đường dẫn đọc file public).
3. **`AIController.cs` (Endpoint `/vision/detect`)**
   - [MODIFY] Thay vì nhận `[FromForm] IFormFile file`, chuyển sang nhận `[FromBody] DetectVisionUrlRequest` chứa chuỗi `ImageUrl`.
   - Bỏ buffer ảnh trên RAM, gọi thẳng AI Provider với JSON payload `{"imageUrl": "..."}`.
4. **`VoiceController.cs` (Endpoint `/transcribe`)**
   - [MODIFY] Thay đổi `[FromForm] IFormFile audio` sang nhận `[FromBody] VoiceTranscribeUrlRequest` chứa chuỗi `AudioUrl`.
   - Forward thẳng JSON payload `{"audioUrl": "..."}` sang Python AI Provider.

---

### Python AI Provider

1. **`app.py`**
   - [MODIFY] Sửa route `@app.route('/detect', methods=['POST'])` để đọc JSON payload `{"imageUrl": "..."}` thay vì đọc file đính kèm. Thêm logic tải ảnh bằng thư viện `requests` từ `imageUrl` vào RAM (stream bytes) rồi đưa vào OpenCV/ONNX.
   - [MODIFY] Sửa route `@app.route('/voice/transcribe', methods=['POST'])` để đọc `{"audioUrl": "..."}`.
2. **`stt_service.py`**
   - [MODIFY] Cập nhật logic để tải file âm thanh từ `audioUrl`, lưu vào thư mục temp hoặc truyền trực tiếp vào Gemini API `upload_file`.

---

### Mobile (React Native)

1. **`aiService.ts` & `voiceService.ts`**
   - [MODIFY] Thêm một bước trung gian: Gọi `GET /api/storage/presigned-url` để lấy `uploadUrl`.
   - Dùng `fetch` (với method `PUT`) để upload trực tiếp binary payload của ảnh / âm thanh lên Cloudflare R2 thông qua `uploadUrl`.
   - Gọi API AI (`/vision/detect` hoặc `/voice/transcribe`) trên Backend và chỉ gửi chuỗi URL public đã tải lên thành công.
2. **`VoiceInput.tsx` & `CameraComponent` (Hoặc nơi capture)**
   - Đảm bảo việc cung cấp URI của file hoạt động trơn tru với pipeline mới này.

## Kế hoạch Xác minh (Verification Plan)

### Automated Tests
- Kiểm tra syntax ở cả 3 environment: `dotnet build`, TypeScript (`npx tsc --noEmit`), và Python `ast.parse()`.

### Manual Verification
- Cần cung cấp Cloudflare R2 mock hoặc thực tế để test luồng:
  1. Click ghi âm -> Gọi Presigned URL -> PUT Audio lên R2 -> Backend xử lý STT thành công.
  2. Click chụp ảnh -> Gọi Presigned URL -> PUT Image lên R2 -> Backend xử lý YOLO thành công.
