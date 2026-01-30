# Manual Test Checklist - Profile Redesign 2026

## Pre-requisites
- [ ] Backend đang chạy (`dotnet run`)
- [ ] Mobile app đang chạy (`npm start`)
- [ ] User đã đăng nhập

---

## Phase 1: UI Components

### SettingsMenuItem
- [ ] Hiển thị icon (emoji hoặc Ionicons)
- [ ] Hiển thị label và subtitle
- [ ] Press animation hoạt động
- [ ] Arrow icon hiển thị (nếu có onPress)

### BMIIndicator
- [ ] Hiển thị đúng BMI value
- [ ] Gauge color đúng theo category (underweight/normal/overweight/obese)
- [ ] Label category hiển thị đúng

---

## Phase 2: ProfileScreen

### Hero Section
- [ ] Hiển thị đúng tên user
- [ ] Hiển thị email
- [ ] BMI Indicator hiển thị đúng
- [ ] Streak badge hiển thị đúng số ngày

### Menu Navigation
- [ ] Nhấn "Chỉnh sửa hồ sơ" → EditProfileScreen
- [ ] Nhấn "Chỉ số cơ thể" → BodyMetricsScreen  
- [ ] Nhấn "Mục tiêu & Hoạt động" → GoalSettingsScreen
- [ ] Nhấn "Lịch sử cân nặng" → WeightHistoryScreen
- [ ] Nhấn "Thông báo" → NotificationsScreen
- [ ] Nhấn "Đổi mật khẩu" → ChangePasswordScreen
- [ ] Nhấn "Về ứng dụng" → AboutScreen

### Dark Mode Toggle
- [ ] Switch chuyển đổi light/dark mode
- [ ] UI cập nhật ngay lập tức

---

## Phase 3: Profile Screens

### EditProfileScreen
- [ ] Hiển thị đúng thông tin hiện tại
- [ ] Có thể sửa tên
- [ ] Có thể chọn giới tính
- [ ] Có thể nhập tuổi
- [ ] Lưu thành công → hiển thị toast

### BodyMetricsScreen
- [ ] Hiển thị chiều cao, cân nặng hiện tại
- [ ] Có thể nhập cân nặng mục tiêu
- [ ] BMI Indicator cập nhật real-time
- [ ] Lưu thành công → hiển thị toast

### GoalSettingsScreen
- [ ] Hiển thị mục tiêu hiện tại (giảm/duy trì/tăng)
- [ ] Có thể chọn mức hoạt động
- [ ] Card selected highlight đúng
- [ ] Lưu thành công

### WeightHistoryScreen
- [ ] Hiển thị chart tiến trình (nếu có data)
- [ ] List các lần ghi cân nặng
- [ ] Empty state nếu không có data

### NotificationsScreen
- [ ] Master toggle bật/tắt thông báo
- [ ] Các meal reminders (sáng/trưa/tối/phụ)
- [ ] Weekly review toggle
- [ ] Lưu cài đặt thành công

### ChangePasswordScreen
- [ ] Nhập mật khẩu cũ
- [ ] Nhập mật khẩu mới (≥6 ký tự)
- [ ] Xác nhận mật khẩu mới
- [ ] Đổi thành công → hiển thị toast

### AboutScreen
- [ ] Hiển thị version app
- [ ] Link phản hồi hoạt động
- [ ] Link terms/privacy hoạt động

---

## Phase 4: Streak Tracking

### Streak Logic
- [ ] Log 1 meal → streak = 1
- [ ] Log meal ngày tiếp theo → streak = 2
- [ ] Bỏ 1 ngày → streak reset về 1
- [ ] LongestStreak cập nhật khi vượt record

### Profile Display
- [ ] Streak badge hiển thị "🔥 X ngày streak"
- [ ] Streak 0 → hiển thị "Bắt đầu streak hôm nay!"

---

## Phase 5: Notifications (nếu implement)

- [ ] Yêu cầu quyền thông báo khi bật
- [ ] Nhận notification đúng giờ đã set
- [ ] Tắt notification → không nhận nữa

---

## Regression Tests

- [ ] App không crash khi navigate
- [ ] Dữ liệu persist sau reload app
- [ ] Logout/Login lại vẫn giữ data

---

## Phase 6: AI Provider (19/12/2025)

### GPU Verification
- [ ] Healthz endpoint: `curl http://127.0.0.1:5050/healthz`
  - Expected: `"cuda_available": true`, `"device": "cuda:0"`
- [ ] Log startup: `✅ GPU detected: NVIDIA GeForce RTX 3050`
- [ ] Model loaded on `cuda:0` (not `cpu`)

### AI Vision (YOLOv8)
- [ ] Mở Camera → Chụp ảnh thức ăn
- [ ] Nhận diện đúng (cà chua, trứng, cơm, etc.)
- [ ] Hiển thị 63 classes trong healthz

### AI Nutrition (Ollama qwen2:1.5b)
- [ ] Profile → Nutrition Settings → Nhập thông tin
- [ ] Response có `"source": "ollama"` (không phải "formula")
- [ ] Thời gian response < 5 giây
- [ ] JSON trả về đúng: calories, protein, carbs, fat

### AI Voice (Whisper STT)
- [ ] Voice Input → Nói "Thêm một bát phở"
- [ ] Transcript tiếng Việt chính xác
- [ ] Log: `STT initialized on cuda:0`

### Recipe Filtering (Dietary Preferences)
- [ ] Profile → Dietary Restrictions → Chọn "Vegetarian"
- [ ] Recipe Suggestions → KHÔNG có món thịt (bò, gà, heo)
- [ ] Thử Allergy "Seafood" → KHÔNG có tôm/cá/mực
- [ ] Clear preferences → Hiển thị đầy đủ món
