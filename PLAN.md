# Kế hoạch xử lý Encoding và Kết nối thiết bị

## 1. Mục tiêu
- Khắc phục triệt để lỗi hiển thị tiếng Việt (Mojibake) trong toàn bộ project.
- Đảm bảo tất cả file lưu ở định dạng UTF-8 No BOM.
- Xử lý vấn đề kết nối ADB `device offline` để test trên máy thật.
- Kiểm tra tính đúng đắn của dữ liệu tiếng Việt từ DB (SQL).

## 2. Các bước thực hiện

### Bước 1: Fix Encoding (Đã thực hiện 80%)
- [x] Chuyển đổi toàn bộ code (.ts, .tsx, .cs, .py, .sql) sang UTF-8 No BOM bằng script Python.
- [x] Fix lỗi Mojibake trong các file SQL (`EatFitAI_14_12 tuong fix.sql`, `temp_sql_utf8.sql`) bằng bảng tra cứu ký tự tiếng Việt.
- [ ] Kiểm tra lại các file Backend C# xem còn ký tự lạ không.

### Bước 2: Khắc phục ADB `device offline`
- [ ] Chạy lệnh `adb kill-server` và `adb start-server`.
- [ ] Hướng dẫn user kiểm tra cáp, cổng USB và thông báo xác nhận RSA trên điện thoại.
- [ ] Kiểm tra trạng thái máy bằng `adb devices`.

### Bước 3: Kiểm tra và Chạy thử
- [ ] Build lại ứng dụng lên máy thật.
- [ ] Kiểm tra các màn hình có tiếng Việt: Login, Register, Profile, Diary.
- [ ] Đảm bảo dữ liệu từ Database (sau khi chạy script SQL đã fix) hiển thị đúng trên App.

## 3. Rủi ro và Giải pháp
- **Rủi ro:** Dữ liệu cũ trong DB vẫn là Mojibake.
- **Giải pháp:** User cần import lại file SQL đã được fix vào Database.
