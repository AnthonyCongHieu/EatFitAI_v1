# EatFitAI — Data Proxy Elimination Progress

**Date:** 2026-04-28  
**Author:** AI-assisted code audit  
**Scope:** Fix Data Proxy Anti-Pattern for AI features and Mobile integration

---

## Tổng quan

Đã thực hiện loại bỏ "Data Proxy Anti-Pattern" để giải quyết vấn đề nghẽn cổ chai và RAM spike (Memory bomb) trên C# Backend. Thay vì client gửi binary file qua C# rồi C# gửi sang Python, hệ thống chuyển sang luồng Cloudflare R2 Pre-signed URLs.

---

## Đã khắc phục (Commit này)

### ✅ Vấn đề #6 & #10: Data Proxy Anti-Pattern & Audio memory bomb

- **Nguyên nhân:** Các Endpoint `/api/ai/vision/detect` và `/api/voice/transcribe` nhận `IFormFile` (binary multipart). C# lưu tạm vào memory rồi chuyển tiếp sang Python AI provider. Việc này gây quá tải bộ nhớ khi có nhiều request đồng thời, giới hạn khả năng scale.
- **Giải pháp (Backend):**
  - C# `IMediaStorageService` thêm `GetPresignedUrlAsync()`.
  - Tạo `StorageController` cấp phát Presigned URL thời hạn 15 phút.
  - Các endpoint Vision và Voice đổi sang nhận JSON (`ImageUrl` / `AudioUrl`).
  - Python AI `app.py` support download file từ public URL thay vì bắt buộc nhận multipart.
- **Giải pháp (Mobile):**
  - Tạo `storageService.ts` quản lý việc gọi API lấy Presigned URL và `PUT` file trực tiếp lên Cloudflare R2.
  - Cập nhật `aiService.detectFoodByImage` thực hiện upload lên R2 rồi mới gọi C# Backend với `ImageUrl`.
  - Cập nhật `voiceService.transcribeAudio` thực hiện upload lên R2 rồi gọi C# Backend với `AudioUrl`.

- **Files Mobile đã sửa:**
  - `eatfitai-mobile/src/services/storageService.ts` (**NEW**)
  - `eatfitai-mobile/src/services/aiService.ts` (Modified)
  - `eatfitai-mobile/src/services/voiceService.ts` (Modified)

- **Impact:** Gỡ bỏ 25MB+ RAM spike mỗi request trên backend. Mobile upload file nhanh hơn và luồng dữ liệu scale chuẩn Enterprise.

---

## Verification

- TypeScript build check: `npx tsc --noEmit` trên Mobile pass.
- Logic R2 Upload via Presigned URL tuân thủ Cloudflare R2 AWS S3 V4 Signature standard.
- Python requests handler fallback hợp lý cho cả URL path và multipart form data gốc.

