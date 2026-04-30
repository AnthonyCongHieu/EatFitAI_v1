# Xác thực và hạ tầng

Cập nhật: `2026-04-30`

## Tổng quan

Tài liệu này ghi nhận hiện trạng xác thực (auth) và hạ tầng triển khai (infra) của EatFitAI, bao gồm:

- Google Sign-In
- Quên mật khẩu / đặt lại mật khẩu qua email thật
- Rủi ro hạ tầng chia sẻ giữa mobile, backend, Render, Supabase
- Kế hoạch sửa chữa thực tế

## Trạng thái hiện tại

### Google Sign-In

**Đã hoạt động** trên thiết bị thật (xác nhận ngày 2026-04-15):

- Luồng: login screen → account picker → consent → backend exchange → vào `home-screen`
- Mobile đã có `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- Backend local đã nhận và validate được Google sign-in request
- Đã verify end-to-end trên thiết bị Android thật

**Cần làm thêm cho production:**

- Cập nhật Render backend env: `Google__WebClientId`, `Google__AndroidClientId`, `Google__IosClientId`
- iOS chưa đủ thông tin client/file native

**Canonical backend endpoints:**

- `POST /api/auth/google/signin` là endpoint đăng nhập Google duy nhất cho mobile.
- `POST /api/auth/google/link` là endpoint liên kết Google cho tài khoản đã đăng nhập.
- `GET /api/auth/google` là endpoint legacy đã được xóa trong Phase B; production smoke mặc định xem `404` hoặc `405` là kết quả đúng.

### Quên mật khẩu / Đặt lại mật khẩu

**Đã hoạt động** trên production (xác nhận ngày 2026-04-15):

- Backend gửi mail qua Brevo HTTP API, không phải SMTP
- Đã verify: gửi forgot-password → nhận mail thật trong Gmail → verify reset code → đặt lại thành công → đăng nhập lại được

**Lưu ý quan trọng:**

- `render.yaml` hiện vẫn khai báo `Smtp__*` (stale) — cần đổi sang `Brevo__*`
- Nếu recreate/redeploy từ blueprint mà không sửa sẽ âm thầm hỏng email

### Email Verification

- Mã xác minh email lưu trên bảng `User` qua `VerificationCode` và `VerificationCodeExpiry`
- Email đăng ký đã được gửi thành công tới mailbox thật

---

## Vấn đề hạ tầng đã xác nhận

### 1. `render.yaml` không khớp thực tế

`render.yaml` khai báo `Smtp__*` nhưng production thật đang dùng Brevo. Cần sửa để blueprint deploys không revert email về SMTP chết.

### 2. Kết nối database không đúng chuẩn

- `appsettings.Development.json` dùng Supabase pooler cổng `6543` với `Pooling=false`
- Hướng dẫn cloud nói backend .NET nên dùng Supavisor session mode cổng `5432`
- `Program.cs` phân loại `5432` = `supavisor-session`, `6543` = `supavisor-transaction`

**Khuyến nghị:** Chuẩn hóa connection string backend dùng `5432`, bỏ `Pooling=false`.

### 3. Tải nền (background load) đã tồn tại

- `AiHealthService` poll `/healthz` mỗi 30 giây
- `AdminRuntimeSnapshotCache` refresh mỗi 5 giây
- Ngay cả khi chưa có user traffic, backend đã tạo hoạt động nền liên tục

### 4. ~~Reset password chưa an toàn đa instance~~ → ĐÃ SỬA

> **[2026-04-24 Audit verified]** Password reset codes hiện đã được lưu trong **database** (bảng `PasswordResetCodes` qua `AdminDbContext`), KHÔNG PHẢI `IMemoryCache`. `AuthService.cs` dùng `_adminContext.PasswordResetCodes` cho cả generate và verify. An toàn khi restart/scale.

~~Password reset codes được lưu trong `IMemoryCache`, không phải database.~~

---

## Kế hoạch sửa chữa

### Giai đoạn 0: Dọn rủi ro ẩn

1. ✅ Đã rotate credential Supabase bị lộ trong `appsettings.Development.json`
2. ✅ Đã sửa `render.yaml` — đã dùng Brevo, không còn SMTP config sai
3. ✅ Đã thay thế secret trong file tracked bằng placeholder (xem `20_SECURITY_REMEDIATION_REPORT`)

### Giai đoạn 1: Hoàn tất auth đúng

1. Cập nhật Render backend env cho Google (`Google__*`)
2. Sửa forgot-password UX: verify step phải gọi backend kiểm tra mã trước khi sang màn đặt mật khẩu mới
3. Thêm rate limit cho forgot-password và resend verification

### ~~Giai đoạn 2: Auth chịu được restart/scale~~ → DONE

1. ✅ ~~Chuyển password reset codes từ `IMemoryCache` sang database~~ → Đã dùng DB (`PasswordResetCodes`)
2. ✅ Giữ email verification trong database (đã đúng)

### Giai đoạn 3: Chuẩn hóa kết nối database

1. ✅ Đã dùng Supavisor session mode (`5432`) cho backend production
2. ✅ Đã bỏ `Pooling=false` — `Program.cs` đã có `EnableRetryOnFailure`
3. Giữ health checks nhẹ, không amplify incident load

### Giai đoạn 4: Giảm tải nền không cần thiết

1. Tăng interval admin runtime snapshot từ 5 giây lên cao hơn, hoặc chuyển sang on-demand
2. Tách AI provider health polling khỏi admin runtime polling
3. Cân nhắc chuyển công việc bất đồng bộ sang worker riêng

### Giai đoạn 5: Tách môi trường

1. Tách Supabase thành dev/staging/production rõ ràng
2. Giữ Render backend và AI provider env groups riêng theo môi trường

---

## Hướng dẫn lấy Google credentials

### Thông tin cơ sở

- Android package: `com.eatfitai.app`
- iOS bundle identifier: `com.eatfitai.app`
- File native config: `eatfitai-mobile/android/app/google-services.json`

### Các credential cần tạo

| Loại | Nơi lấy | Nơi điền |
|---|---|---|
| Web Client ID | Google Cloud Console → OAuth client ID → Web application | Mobile: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, Backend: `Google__WebClientId` |
| Android Client ID | Google Cloud Console → OAuth client ID → Android (package `com.eatfitai.app` + SHA-1) | Backend: `Google__AndroidClientId` |
| iOS Client ID | Google Cloud Console → OAuth client ID → iOS (bundle `com.eatfitai.app`) | Mobile: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, Backend: `Google__IosClientId` |
| `google-services.json` | Firebase Console → Project settings → Android app | `eatfitai-mobile/android/app/google-services.json` |
| `GoogleService-Info.plist` | Firebase Console → Project settings → iOS app | `eatfitai-mobile/ios/GoogleService-Info.plist` (khi có iOS build) |

### Lưu ý

- Nếu dùng cả debug build và release build, phải đăng ký cả 2 bộ fingerprint (SHA-1/SHA-256)
- Production không được để placeholder cho `Google__*`
- Backend sẽ tự cảnh báo `Google sign-in disabled` nếu thiếu bất kỳ giá trị nào

---

## Tham khảo chính thức

- [Firebase Android setup](https://firebase.google.com/docs/android/setup)
- [Firebase iOS setup](https://firebase.google.com/docs/ios/setup)
- [Google Cloud OAuth clients](https://support.google.com/cloud/answer/15549257)
- [Supabase Deployment & Branching](https://supabase.com/docs/guides/deployment)
- [Render Scaling](https://render.com/docs/scaling)
