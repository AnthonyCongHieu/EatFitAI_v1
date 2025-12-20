# Voice Recording - Kết quả kiểm tra hệ thống

**Thời gian:** 2025-12-20 21:36  
**IP máy PC:** 172.16.0.125  
**Status:** ✅ Sẵn sàng test

---

## ✅ Đã kiểm tra và xác nhận

### 1. AI Provider (Python Flask) - ✅ OK
```
Status: Running
Port: 5050
GPU: NVIDIA RTX 3050 (CUDA enabled)
Model: best.pt (YOLOv8 custom)
```

### 2. PhoWhisper STT - ✅ OK
```
Model: vinai/PhoWhisper-medium
Device: cuda:0
Status: Initialized successfully
```

### 3. Ollama Voice Parsing - ✅ OK
```
Test input: "test"
Response: {
  intent: "ADD_FOOD",
  confidence: 0.95,
  entities: { foodName: "...", mealType: "lunch", quantity: 1 }
}
```

### 4. Network Connectivity - ✅ OK
```
PC IP: 172.16.0.125
Port 5050: Accessible
Test connection: Success
```

### 5. Mobile App Configuration - ✅ FIXED
```
API_BASE_URL: http://172.16.0.125:5247
AI_PROVIDER_URL: http://172.16.0.125:5050 (đã sửa bug)
```

---

## 🐛 Bug đã sửa

### Vấn đề:
File `voiceService.ts` có bug nghiêm trọng:
```typescript
// ❌ BUG: Chỉ hoạt động nếu URL có chứa ':5247'
const AI_PROVIDER_URL = API_BASE_URL?.replace(':5247', ':5050')
```

Nếu `API_BASE_URL` không chứa `:5247` → replace không làm gì → AI_PROVIDER_URL sai → Network Error

### Đã sửa:
```typescript
// ✅ FIXED: Parse URL đúng cách và set port
const getAiProviderUrl = (): string => {
  if (!API_BASE_URL) {
    return 'http://10.0.2.2:5050';
  }
  
  try {
    const url = new URL(API_BASE_URL);
    url.port = '5050'; // Luôn set port = 5050
    return url.toString().replace(/\/$/, '');
  } catch {
    return API_BASE_URL.replace(/:\d+/, ':5050');
  }
};
```

---

## 📋 Bước tiếp theo - BẠN CẦN LÀM

### 1. Reload mobile app
```powershell
# Cách 1: Shake device → Reload
# Cách 2: Force stop
adb shell "am force-stop host.exp.exponent"
```

### 2. Test voice recording

Làm theo hướng dẫn trong file: **`VOICE_TEST_INSTRUCTIONS.md`**

Tóm tắt:
1. Mở app → Tab "Voice"
2. Bấm nút microphone
3. Nói: "thêm một bát phở bữa trưa"
4. Bấm stop
5. Xem kết quả

### 3. Xem logs

**Trong terminal Metro bundler**, tìm các dòng:
```
[VoiceService] API_BASE_URL: http://172.16.0.125:5247
[VoiceService] AI_PROVIDER_URL: http://172.16.0.125:5050
[VoiceService] Transcribing audio: file:///.../recording.m4a
[VoiceService] Whisper response: { text: "...", success: true }
```

**Hoặc từ terminal mới:**
```powershell
adb logcat | Select-String "VoiceService"
```

---

## 🎯 Kết quả mong đợi

### ✅ Thành công sẽ thấy:

1. **Transcription thành công:**
```
[VoiceService] Whisper response: {
  text: "thêm một bát phở bữa trưa",
  success: true,
  duration: 2.5
}
```

2. **Parsing thành công:**
```
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

3. **UI hiển thị:**
- Recognized text: "thêm một bát phở bữa trưa"
- Intent: ADD_FOOD
- Food: phở
- Meal: Bữa trưa
- Nút "Execute" để thực hiện

4. **Sau khi bấm Execute:**
- "✅ Đã thêm phở (300g, ~450kcal) vào Bữa trưa"

---

## ❌ Nếu vẫn lỗi

### Lỗi 1: Network Error
**Nguyên nhân:** Device không reach được PC

**Kiểm tra:**
```powershell
# Từ device
adb shell curl http://172.16.0.125:5050/healthz
```

**Giải pháp:**
- Đảm bảo PC và device cùng WiFi
- Tắt firewall hoặc allow port 5050
- Kiểm tra IP có đúng không

### Lỗi 2: Whisper STT not available
**Nguyên nhân:** AI Provider chưa khởi động đúng

**Giải pháp:**
```powershell
# Restart AI Provider
cd d:\EatFitAI_v1\ai-provider
.\venv\Scripts\activate
python app.py
```

Xem logs khi start, phải thấy:
```
✅ STT initialized with: vinai/PhoWhisper-medium on cuda:0
```

### Lỗi 3: Permission denied
**Giải pháp:** Settings → Apps → EatFitAI → Permissions → Microphone → Allow

---

## 📊 Tóm tắt

| Component | Status | Details |
|-----------|--------|---------|
| AI Provider | ✅ Running | Port 5050, GPU enabled |
| PhoWhisper | ✅ Loaded | Model: vinai/PhoWhisper-medium |
| Ollama | ✅ Working | Voice parsing tested |
| Network | ✅ OK | IP: 172.16.0.125, Port accessible |
| Bug Fix | ✅ Done | AI_PROVIDER_URL construction fixed |
| Code | ✅ Ready | Logging added for debugging |

**Trạng thái:** Sẵn sàng test! Hãy reload app và thử voice recording.

---

## 🔍 Debug nếu cần

Nếu vẫn gặp lỗi, gửi cho tôi:
1. Screenshot màn hình lỗi
2. Logs từ Metro bundler (copy các dòng [VoiceService])
3. Output của lệnh: `adb logcat | Select-String "Voice"`

Tôi sẽ phân tích nguyên nhân chính xác!
