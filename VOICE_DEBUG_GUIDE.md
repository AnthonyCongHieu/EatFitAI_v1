# Voice Recording Debug Guide

## Vấn đề đã sửa

### Bug 1: AI_PROVIDER_URL không đúng
**Nguyên nhân:** Logic `API_BASE_URL?.replace(':5247', ':5050')` chỉ hoạt động nếu URL có chứa `:5247`. Nếu URL là `http://192.168.100.126:5247` thì OK, nhưng nếu là `http://192.168.100.126` (không có port) thì replace không làm gì cả.

**Đã sửa:** Parse URL đúng cách và set port = 5050

### Cải thiện 2: Error logging chi tiết
Thêm logging để debug network errors và server errors

## Cách test

### 1. Restart Metro bundler
```bash
# Stop npm run dev hiện tại (Ctrl+C)
npm run dev
```

### 2. Reload app trên device
- Shake device → Reload
- Hoặc: `adb shell input keyevent 82` → Reload

### 3. Test Voice Recording

#### Bước 1: Mở Voice Screen
- Bấm vào tab "Voice" hoặc nút microphone

#### Bước 2: Bấm Record
- Bấm nút microphone
- Nói một câu lệnh tiếng Việt, ví dụ: "thêm một bát phở bữa trưa"
- Bấm stop

#### Bước 3: Xem logs
Mở terminal mới và chạy:
```bash
# Xem logs từ Metro bundler (terminal đang chạy npm run dev)
# Tìm các dòng:
# [VoiceService] API_BASE_URL: ...
# [VoiceService] AI_PROVIDER_URL: ...
# [VoiceService] Transcribing audio: ...
# [VoiceService] Sending audio to AI Provider...
```

Hoặc xem logs từ Android device:
```bash
adb logcat | Select-String "VoiceService"
```

### 4. Kiểm tra kết quả

#### ✅ Thành công nếu thấy:
```
[VoiceService] Whisper response: { text: "thêm một bát phở bữa trưa", success: true, ... }
```

#### ❌ Lỗi nếu thấy:
```
[VoiceService] Transcription error: Network Error
[VoiceService] Error details: { code: "ERR_NETWORK", ... }
```

**Nguyên nhân có thể:**
1. AI Provider không chạy (port 5050)
2. Firewall chặn port 5050
3. IP không đúng (device không reach được PC)

## Troubleshooting

### Lỗi: Network Error khi transcribe

#### Kiểm tra 1: AI Provider có chạy không?
```powershell
Invoke-RestMethod -Uri "http://localhost:5050/healthz" -Method Get
```

Kết quả mong đợi:
```
status: ok
model_loaded: True
cuda_available: True
```

#### Kiểm tra 2: Device có reach được AI Provider không?
```powershell
# Lấy IP của PC
ipconfig | Select-String "IPv4"

# Giả sử IP là 192.168.100.126
# Từ device, test:
adb shell curl http://192.168.100.126:5050/healthz
```

#### Kiểm tra 3: Firewall
```powershell
# Cho phép port 5050
New-NetFirewallRule -DisplayName "EatFitAI AI Provider" -Direction Inbound -LocalPort 5050 -Protocol TCP -Action Allow
```

### Lỗi: Whisper STT not available

**Nguyên nhân:** PhoWhisper model chưa được download

**Giải pháp:**
```bash
cd d:\EatFitAI_v1\ai-provider
.\venv\Scripts\activate
python
```

```python
from transformers import WhisperForConditionalGeneration, WhisperProcessor

# Download PhoWhisper
model = WhisperForConditionalGeneration.from_pretrained("vinai/PhoWhisper-medium")
processor = WhisperProcessor.from_pretrained("vinai/PhoWhisper-medium")
print("✅ PhoWhisper downloaded!")
```

Sau đó restart AI Provider.

### Lỗi: Audio file không được gửi đúng

Kiểm tra logs xem có thông báo về file URI không:
```
[VoiceService] Transcribing audio: file:///data/user/0/.../recording.m4a
```

Nếu URI sai hoặc file không tồn tại → Vấn đề ở `useVoiceRecognition.ts`

## Expected Flow

1. User bấm microphone → `startRecording()`
2. Recording... → `expo-av` ghi âm
3. User bấm stop → `stopRecording()`
4. Save audio file → URI: `file:///.../recording.m4a`
5. Call `voiceService.transcribeAudio(uri)`
6. Send FormData to `http://IP:5050/voice/transcribe`
7. AI Provider nhận file → PhoWhisper transcribe
8. Return `{ text: "...", success: true }`
9. Call `voiceService.parseWithOllama(text)`
10. Ollama parse intent → `{ intent: "ADD_FOOD", entities: {...} }`
11. Call `voiceService.executeCommand(command)`
12. Backend save to database

## Logs mẫu khi thành công

```
[VoiceService] API_BASE_URL: http://192.168.100.126:5247
[VoiceService] AI_PROVIDER_URL: http://192.168.100.126:5050
[VoiceRecognition] Recording saved: file:///data/.../recording.m4a
[VoiceRecognition] Whisper transcribed: thêm một bát phở bữa trưa
[VoiceService] Transcribing audio: file:///data/.../recording.m4a
[VoiceService] Using AI Provider URL: http://192.168.100.126:5050
[VoiceService] Sending audio to AI Provider...
[VoiceService] Whisper response: { text: "thêm một bát phở bữa trưa", success: true, duration: 2.5 }
[VoiceService] Parsing with Ollama: thêm một bát phở bữa trưa
[VoiceService] Ollama response: { intent: "ADD_FOOD", entities: { foodName: "phở", ... } }
[VoiceService] Sending to backend: { intent: "ADD_FOOD", ... }
✅ Đã thêm phở (300g, 450kcal) vào Bữa trưa
```
