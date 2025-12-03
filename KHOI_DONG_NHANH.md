# ⚡ KHỞI ĐỘNG NHANH - EATFITAI

**Mục đích**: Chạy đầy đủ Backend + AI + Mobile trong 3 phút ⏱️

---

## 🎯 TÓM TẮT 3 BƯỚC

```
Terminal 1 → AI Provider (Python Flask)
Terminal 2 → Backend API (.NET Core)
Terminal 3 → Mobile App (Expo React Native)
```

---

## 📂 TERMINAL 1: AI PROVIDER

```powershell
cd "d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\ai-provider"
.\.venv\Scripts\Activate.ps1
python app.py
```

✅ **Thành công khi thấy**:
```
Starting AI Provider on port 5050
Model loaded successfully: best.pt
 * Running on http://0.0.0.0:5050
```

🔗 **Test**: http://localhost:5050/healthz

---

## 🔧 TERMINAL 2: BACKEND API

```powershell
cd "d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\eatfitai-backend"
dotnet run
```

✅ **Thành công khi thấy**:
```
Now listening on: http://0.0.0.0:5247
Application started.
```

🔗 **Test**: 
- Swagger: http://localhost:5247/swagger
- Health: http://localhost:5247/health

---

## 📱 TERMINAL 3: MOBILE APP

```powershell
cd "d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\eatfitai-mobile"
npm run dev
```

✅ **Thành công khi thấy**: Metro bundler running

**Chọn platform**:
- Press `a` → Android Emulator
- Scan QR → Physical device (cùng Wi-Fi)

---

## ✅ CHECKLIST HOÀN THÀNH

- [ ] Terminal 1: AI Provider chạy trên port **5050** ✅
- [ ] Terminal 2: Backend API chạy trên port **5247** ✅
- [ ] Terminal 3: Mobile App mở được trên emulator/device ✅
- [ ] Test: App có thể login và sử dụng AI camera ✅

---

## 🛑 TẮT HỆ THỐNG

Nhấn `Ctrl+C` trên từng terminal theo thứ tự:
1. Terminal 3 (Mobile)
2. Terminal 2 (Backend)
3. Terminal 1 (AI Provider)

---

## ⚠️ LỖI THƯỜNG GẶP

### Lỗi 1: `venv not found` (Terminal 1)
```powershell
# Tạo venv mới
python -m venv .venv
```

### Lỗi 2: `best.pt not found` (Terminal 1)
Download model từ Google Drive theo hướng dẫn trong [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### Lỗi 3: `Database connection failed` (Terminal 2)
```powershell
# Verify User Secrets
dotnet user-secrets list
```

### Lỗi 4: `Cannot connect to API` (Mobile)
Kiểm tra file `.env.development`:
```bash
# Android Emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247

# Physical Device (thay IP máy bạn)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:5247
```

---

## 📚 TÀI LIỆU CHI TIẾT

- **Setup lần đầu**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Cấu hình nâng cao**: [eatfitai-backend/DEV-RUN-GUIDE.md](./eatfitai-backend/DEV-RUN-GUIDE.md)
- **Workflow automation**: `.agent/workflows/startup.md`

---

**Chúc bạn code vui! 🚀**
