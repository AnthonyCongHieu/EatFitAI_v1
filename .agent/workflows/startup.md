---
description: Khởi động Backend, Frontend và AI
---

# 🚀 WORKFLOW: KHỞI ĐỘNG HỆ THỐNG EATFITAI

**Mục đích**: Hướng dẫn khởi động đầy đủ Backend (.NET), AI Provider (Python Flask), và Mobile App (Expo React Native) cho môi trường Development.

**Thời gian**: ~2-3 phút (nếu đã setup)

---

## ✅ YÊU CẦU TRƯỚC KHI KHỞI ĐỘNG

Đảm bảo bạn đã hoàn thành setup ban đầu (chỉ làm 1 lần):
- ✅ Đã clone source code
- ✅ Đã cài dependencies: `dotnet restore`, `pip install -r requirements.txt`, `npm install`
- ✅ Đã có file YOLO model `best.pt` trong `ai-provider/`
- ✅ Đã cấu hình User Secrets cho Backend (connection string, JWT key)
- ✅ Đã setup `.env.development` cho Mobile App

> **Lưu ý**: Nếu chưa setup, xem file [SETUP_GUIDE.md](../SETUP_GUIDE.md) hoặc [DEV-RUN-GUIDE.md](../eatfitai-backend/DEV-RUN-GUIDE.md)

---

## 📋 CÁC BƯỚC KHỞI ĐỘNG

### BƯỚC 1: Khởi động AI Provider (Terminal 1)

```powershell
# Di chuyển vào thư mục ai-provider
cd "d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\ai-provider"

# Kích hoạt virtual environment
.\.venv\Scripts\Activate.ps1

# Chạy Flask server
python app.py
```

**Xác nhận thành công**:
- Console hiển thị: `Starting AI Provider on port 5050`
- Console hiển thị: `Model loaded successfully: best.pt`
- Truy cập: http://localhost:5050/healthz → Trả về JSON với `"status": "ok"`

**Nếu gặp lỗi**:
- `ModuleNotFoundError`: Chạy `pip install -r requirements.txt`
- `Model file not found`: Download `best.pt` theo hướng dẫn trong SETUP_GUIDE.md
- `Port 5050 already in use`: Đổi port trong `app.py` (dòng 161) và cập nhật `appsettings.json` backend

---

### BƯỚC 2: Khởi động Backend API (Terminal 2)

```powershell
# Mở terminal mới, di chuyển vào thư mục backend
cd "d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\eatfitai-backend"

# Chạy backend
dotnet run
```

**Xác nhận thành công**:
- Console hiển thị: `Now listening on: http://0.0.0.0:5247`
- Truy cập Swagger UI: http://localhost:5247/swagger
- Truy cập Health Check: http://localhost:5247/health → Trả về `"Healthy"`

**Nếu gặp lỗi**:
- `Connection string not found`: Kiểm tra `dotnet user-secrets list`
- `Database connection failed`: Verify SQL Server đang chạy
- `Port 5247 already in use`: Dùng port khác hoặc kill process cũ

---

### BƯỚC 3: Khởi động Mobile App (Terminal 3)

```powershell
# Mở terminal mới, di chuyển vào thư mục mobile
cd "d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\eatfitai-mobile"

# Chạy Expo dev server
npm run dev
```

**Chọn platform**:
- Nhấn `a` để mở Android Emulator (nếu đã cài Android Studio)
- Quét QR code bằng Expo Go app trên điện thoại thật (phải cùng Wi-Fi)

**Xác nhận thành công**:
- Metro bundler chạy thành công
- App hiển thị màn hình đăng nhập

**Nếu gặp lỗi**:
- `Metro bundler error`: Xóa cache với `npm start -- --clear`
- `Cannot connect to backend`: Kiểm tra `.env.development` có đúng API URL không
- `Network request failed`: Đảm bảo backend đang chạy và firewall không block port 5247

---

## 🔍 KIỂM TRA HỆ THỐNG

### Checklist Hoàn Chỉnh

Terminal 1 (AI Provider):
- ✅ Flask running on `http://0.0.0.0:5050`
- ✅ Model `best.pt` loaded
- ✅ Health check: http://localhost:5050/healthz trả về `"status": "ok"`

Terminal 2 (Backend):
- ✅ Kestrel running on `http://0.0.0.0:5247`
- ✅ Swagger UI accessible: http://localhost:5247/swagger
- ✅ Health check: http://localhost:5247/health trả về `"Healthy"`

Terminal 3 (Mobile):
- ✅ Metro bundler running
- ✅ App hiển thị trên emulator/device
- ✅ Có thể đăng nhập và sử dụng chức năng

### Test End-to-End (Optional)

Để test toàn bộ flow AI Vision:

1. Mở app trên emulator/device
2. Đăng nhập
3. Chọn chức năng "AI Camera" hoặc "Scan Food"
4. Chụp/upload ảnh món ăn
5. Xác nhận app nhận diện được nguyên liệu

Nếu thành công → Hệ thống hoạt động 100% ✅

---

## 🛑 TẮT HỆ THỐNG

Khi kết thúc làm việc, tắt theo thứ tự:

1. **Mobile App**: `Ctrl+C` trong Terminal 3
2. **Backend API**: `Ctrl+C` trong Terminal 2
3. **AI Provider**: `Ctrl+C` trong Terminal 1

---

## 📝 GHI CHÚ QUAN TRỌNG

### Port Mapping
- **AI Provider**: 5050
- **Backend API**: 5247
- **Mobile Metro**: 8081 (tự động)

### Network Configuration
- **Android Emulator → Backend**: Dùng `http://10.0.2.2:5247`
- **Physical Device → Backend**: Dùng IP máy host (VD: `http://192.168.1.10:5247`)
- Ensure cùng Wi-Fi network khi test trên thiết bị thật

### Development Tips
- Để tự động reload backend khi code thay đổi: `dotnet watch run`
- Để clear Metro bundler cache: `npm start -- --clear`
- Để xem AI Provider logs: Mở Terminal 1

---

## 🆘 TROUBLESHOOTING NHANH

| Lỗi | Giải pháp |
|-----|-----------|
| `venv not found` | Tạo venv: `python -m venv .venv` tại `ai-provider/` |
| `best.pt not found` | Download model theo SETUP_GUIDE.md |
| `dotnet command not found` | Cài .NET SDK 8.0+ |
| `Database connection failed` | Check SQL Server running + User Secrets |
| `CORS error in mobile` | Backend đã config CORS cho Development |
| `Port already in use` | Kill process hoặc đổi port |

---

**Chúc bạn code hiệu quả! 🎉**

Nếu gặp vấn đề phức tạp, tham khảo:
- [SETUP_GUIDE.md](../SETUP_GUIDE.md) - Setup ban đầu chi tiết
- [DEV-RUN-GUIDE.md](../eatfitai-backend/DEV-RUN-GUIDE.md) - Cấu hình nâng cao
