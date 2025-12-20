# Voice Recording Test Instructions

## Bước 1: Reload app để áp dụng code mới

### Cách 1: Shake device
1. Lắc điện thoại
2. Chọn "Reload"

### Cách 2: Từ terminal
```powershell
# Force stop app
adb shell "am force-stop host.exp.exponent"

# Hoặc restart Metro bundler
# Ctrl+C trong terminal npm run dev
# Sau đó: npm run dev
```

## Bước 2: Mở app và vào Voice screen

1. Mở EatFitAI app
2. Bấm vào tab "Voice" (icon microphone ở bottom navigation)

## Bước 3: Test recording

1. **Bấm nút microphone** (nút tròn màu xanh ở giữa màn hình)
2. **Nói một câu lệnh tiếng Việt**, ví dụ:
   - "thêm một bát phở bữa trưa"
   - "thêm hai quả trứng bữa sáng"
   - "ghi cân nặng 65 kg"
3. **Bấm nút stop** (nút đỏ khi đang recording)
4. **Chờ xử lý** (sẽ thấy loading indicator)

## Bước 4: Xem logs để debug

### Từ Metro bundler (terminal npm run dev):
Tìm các dòng:
```
[VoiceService] API_BASE_URL: http://172.16.0.125:5247
[VoiceService] AI_PROVIDER_URL: http://172.16.0.125:5050
[VoiceService] Transcribing audio: file:///.../recording.m4a
[VoiceService] Using AI Provider URL: http://172.16.0.125:5050
[VoiceService] Sending audio to AI Provider...
```

### Từ Android device (terminal mới):
```powershell
adb logcat | Select-String "VoiceService"
```

Hoặc xem tất cả logs:
```powershell
adb logcat | Select-String "Voice|Whisper|STT"
```

## Kết quả mong đợi

### ✅ Thành công:
```
[VoiceService] Whisper response: {
  text: "thêm một bát phở bữa trưa",
  success: true,
  duration: 2.5,
  language: "vi"
}
[VoiceService] Parsing with Ollama: thêm một bát phở bữa trưa
[VoiceService] Ollama response: {
  intent: "ADD_FOOD",
  entities: {
    foodName: "phở",
    quantity: 1,
    unit: "bát",
    mealType: "lunch"
  }
}
```

App sẽ hiển thị:
- ✅ Parsed command với intent và entities
- Nút "Execute" để thực hiện lệnh
- Sau khi execute: "Đã thêm phở (300g, 450kcal) vào Bữa trưa"

### ❌ Lỗi có thể gặp:

#### Lỗi 1: Network Error
```
[VoiceService] Transcription error: Network Error
[VoiceService] Error details: { code: "ERR_NETWORK" }
```

**Nguyên nhân:**
- Device không reach được PC (IP sai hoặc khác WiFi)
- Firewall chặn port 5050
- AI Provider không chạy

**Giải pháp:**
```powershell
# Kiểm tra IP
ipconfig | Select-String "IPv4"

# Kiểm tra AI Provider
Invoke-RestMethod -Uri "http://localhost:5050/healthz"

# Test từ device
adb shell curl http://172.16.0.125:5050/healthz
```

#### Lỗi 2: Whisper STT not available
```
{
  error: "Whisper STT not available",
  success: false
}
```

**Nguyên nhân:** PhoWhisper chưa được khởi tạo

**Giải pháp:** Xem logs AI Provider khi start:
```
✅ STT initialized with: vinai/PhoWhisper-medium on cuda:0
```

Nếu không thấy dòng này → PhoWhisper chưa load → Cần download model

#### Lỗi 3: Microphone permission denied
```
Cần quyền truy cập microphone
```

**Giải pháp:** 
- Settings → Apps → EatFitAI → Permissions → Microphone → Allow

## Nếu vẫn lỗi

Gửi cho tôi:
1. **Screenshot** màn hình lỗi
2. **Logs từ Metro bundler** (copy các dòng [VoiceService])
3. **Logs từ adb logcat** (nếu có)

Tôi sẽ phân tích và tìm nguyên nhân chính xác!
