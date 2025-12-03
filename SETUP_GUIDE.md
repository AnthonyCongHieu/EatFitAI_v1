# 📦 HƯỚNG DẪN SETUP EATFITAI YOLO MODEL - CHO ĐỒNG NGHIỆP

**Dành cho**: Đồng nghiệp cần setup project EatFitAI và YOLO model trên máy mới  
**Thời gian ước tính**: 30-45 phút  
**Yêu cầu**: Kết nối internet tốt (cần download ~150MB model + dependencies)

---

## 🎯 MỤC TIÊU

Sau khi hoàn thành hướng dẫn này, bạn sẽ có:
- ✅ Full source code EatFitAI từ Git
- ✅ YOLO model (`best.pt` - 22.5MB) đã train xong
- ✅ AI Provider chạy được trên port 5050
- ✅ Backend API chạy được trên port 5000
- ✅ Mobile app có thể kết nối và sử dụng AI detection

---

## 📋 YÊU CẦU HỆ THỐNG

### Phần Mềm Cần Có

| Phần mềm | Version tối thiểu | Link download |
|----------|-------------------|---------------|
| **Git** | 2.30+ | https://git-scm.com/downloads |
| **Python** | 3.8+ (khuyến nghị 3.10) | https://www.python.org/downloads/ |
| **.NET SDK** | 8.0+ | https://dotnet.microsoft.com/download |
| **Node.js** | 18+ | https://nodejs.org/ |

### Phần Cứng Khuyến Nghị

- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB)
- **Disk**: 5GB trống
- **GPU** (Optional): NVIDIA GPU với CUDA 11.8+ (cho training/inference nhanh hơn)

---

## 🚀 BƯỚC 1: CLONE SOURCE CODE

### 1.1. Clone Repository

```bash
# Clone project
git clone <REPO_URL_CỦA_BẠN>
cd EatFitAI_v1
```

> **Lưu ý**: Thay `<REPO_URL_CỦA_BẠN>` bằng URL repo thực tế (GitHub/GitLab/Bitbucket)

### 1.2. Verify Structure

Kiểm tra xem các folder quan trọng đã có chưa:

```bash
ls -la
```

Bạn phải thấy:
```
eatfitai-backend/    # Backend API (.NET Core)
eatfitai-mobile/     # Mobile app (React Native)
ai-provider/         # AI service (Flask + YOLO)
```

---

## 📥 BƯỚC 2: DOWNLOAD YOLO MODEL

**⚠️ QUAN TRỌNG**: File `best.pt` (22.5MB) **KHÔNG** có trong Git vì nó bị ignore. Bạn cần download riêng.

### Option 1: Google Drive (Khuyến nghị)

1. **Download model từ link này**:
   ```
   https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing
   ```

2. **Di chuyển file vào đúng folder**:
   ```bash
   # Windows
   move best.pt ai-provider\best.pt

   # Linux/Mac
   mv best.pt ai-provider/best.pt
   ```

3. **Verify file size**:
   ```bash
   # Windows (PowerShell)
   (Get-Item ai-provider\best.pt).length / 1MB

   # Linux/Mac
   ls -lh ai-provider/best.pt
   ```

   Expected: ~22.5 MB

### Option 2: OneDrive/Dropbox

Nếu team dùng OneDrive/Dropbox:

```bash
# Download từ link share của OneDrive/Dropbox
curl -L "<LINK_SHARE>" -o ai-provider/best.pt
```

### Option 3: Copy Trực Tiếp (LAN)

Nếu bạn ở cùng văn phòng với người đã train model:

```bash
# Copy từ USB hoặc shared folder
cp /path/to/best.pt ai-provider/best.pt
```

---

## ⚙️ BƯỚC 3: SETUP AI PROVIDER (Python Flask)

### 3.1. Di chuyển vào folder

```bash
cd ai-provider
```

### 3.2. Tạo Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3.3. Cài đặt Dependencies

```bash
pip install -r requirements.txt
```

**Thời gian**: ~5-10 phút (tùy tốc độ mạng)

### 3.4. Verify Installation

```bash
python -c "import torch; from ultralytics import YOLO; print('OK')"
```

Expected output: `OK`

### 3.5. Test Model Loading

```bash
python -c "from ultralytics import YOLO; m = YOLO('best.pt'); print('Model loaded:', m.names)"
```

Expected: In ra danh sách classes (ingredients) model detect được.

---

## 🔧 BƯỚC 4: SETUP BACKEND API (.NET Core)

### 4.1. Di chuyển vào folder

```bash
cd ../eatfitai-backend
```

### 4.2. Restore Dependencies

```bash
dotnet restore
```

### 4.3. Update Connection String

**File**: `appsettings.Development.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

> **Lưu ý**: Điều chỉnh connection string theo setup SQL Server của bạn.

### 4.4. Run Migrations (Tạo Database)

```bash
# Chỉ chạy nếu database chưa có
dotnet ef database update
```

### 4.5. Build & Test

```bash
dotnet build
```

Expected: `Build succeeded` (có thể có warnings, OK)

---

## 📱 BƯỚC 5: SETUP MOBILE APP (React Native)

### 5.1. Di chuyển vào folder

```bash
cd ../eatfitai-mobile
```

### 5.2. Install Dependencies

```bash
npm install
# hoặc
yarn install
```

**Thời gian**: ~5-10 phút

### 5.3. Update API Base URL

**File**: `src/config/env.ts`

```typescript
export const API_BASE_URL = 'http://192.168.1.XXX:5000';  // Thay bằng IP máy chạy backend
```

---

## ▶️ BƯỚC 6: CHẠY TOÀN BỘ HỆ THỐNG

### 6.1. Start AI Provider (Terminal 1)

```bash
cd ai-provider
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

python app.py
```

**Expected output**:
```
Starting AI Provider on port 5050
Model: best.pt
Model loaded successfully: best.pt
 * Running on http://0.0.0.0:5050
```

✅ **Verify**: Mở browser: `http://localhost:5050/healthz`  
Expected JSON:
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_file": "best.pt",
  "model_type": "yolov8-custom-eatfitai",
  "model_classes_count": 45
}
```

### 6.2. Start Backend API (Terminal 2)

```bash
cd eatfitai-backend
dotnet run
```

**Expected output**:
```
Now listening on: http://localhost:5000
Application started.
```

✅ **Verify**: `http://localhost:5000/api/Health/live`  
Expected JSON: `{"status":"live"}`

### 6.3. Start Mobile App (Terminal 3)

```bash
cd eatfitai-mobile
npm start
```

Sau đó:
- Press `a` để chạy trên Android emulator
- Press `i` để chạy trên iOS simulator
- Hoặc scan QR code bằng Expo Go app trên điện thoại

---

## ✅ BƯỚC 7: TEST INTEGRATION

### Test 1: AI Provider Detection

```bash
# Upload ảnh test
curl -X POST http://localhost:5050/detect \
  -F "file=@test_image.jpg"
```

Expected: JSON với `detections` array

### Test 2: Backend Integration

```bash
# Cần auth token (lấy từ login)
curl -X POST http://localhost:5000/api/ai/vision/detect \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "file=@test_image.jpg"
```

Expected: JSON với `items` array (mapped food items)

### Test 3: Mobile App

1. Mở app trên emulator/device
2. Login với tài khoản test
3. Chụp ảnh món ăn
4. Xem kết quả detection

---

## ⚠️ TROUBLESHOOTING (XỬ LÝ LỖI)

### Lỗi 1: "Model file not found"

**Nguyên nhân**: `best.pt` chưa có trong folder `ai-provider/`

**Giải pháp**:
```bash
# Verify file exists
ls -la ai-provider/best.pt

# Re-download nếu file không tồn tại (see Bước 2)
```

### Lỗi 2: "CUDA not available" (GPU không hoạt động)

**Nguyên nhân**: PyTorch không phát hiện NVIDIA GPU

**Giải pháp**: Model vẫn chạy được trên CPU (chậm hơn), hoặc cài CUDA:

```bash
# Check GPU status
python -c "import torch; print('CUDA:', torch.cuda.is_available())"

# Nếu False, model sẽ dùng CPU (OK cho testing)
```

### Lỗi 3: Port 5050 đã bị chiếm

**Giải pháp**: Đổi port trong `app.py` dòng 157:

```python
app.run(host="0.0.0.0", port=5051)  # Đổi thành port khác
```

Và update `appsettings.json` trong backend:
```json
{
  "AIProvider": {
    "VisionBaseUrl": "http://127.0.0.1:5051"
  }
}
```

### Lỗi 4: Backend không kết nối được SQL Server

**Giải pháp**:
1. Verify SQL Server đang chạy
2. Update connection string trong `appsettings.Development.json`
3. Test connection:
   ```bash
   dotnet ef database update
   ```

---

## 📞 LIÊN HỆ HỖ TRỢ

Nếu vẫn gặp vấn đề:

1. **Check logs**:
   - AI Provider: Console terminal 1
   - Backend: Console terminal 2
   - Mobile: Metro bundler terminal 3

2. **Contact team**:
   - Slack: #eatfitai-dev
   - Email: tech-lead@example.com

---

## 📚 TÀI LIỆU THAM KHẢO

- [YOLO Training Evaluation](./yolo-training-evaluation.md) - Hiệu suất model
- [YOLO Integration Plan](./yolo-integration-plan.md) - Kiến trúc tích hợp
- [Walkthrough](./walkthrough.md) - Chi tiết các thay đổi code

---

## ✨ BONUS: SCRIPT TỰ ĐỘNG (Optional)

Tạo file `setup.sh` (Linux/Mac) hoặc `setup.ps1` (Windows):

```bash
#!/bin/bash
# setup.sh - Auto setup script

echo "🚀 EatFitAI Setup Script"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

# Check .NET
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET SDK not found. Please install .NET 8.0+"
    exit 1
fi

# Setup AI Provider
echo "📦 Setting up AI Provider..."
cd ai-provider
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Verify model
if [ ! -f "best.pt" ]; then
    echo "⚠️  WARNING: best.pt not found!"
    echo "Please download model from shared drive"
    exit 1
fi

# Setup Backend
echo "🔧 Setting up Backend..."
cd ../eatfitai-backend
dotnet restore
dotnet build

# Setup Mobile
echo "📱 Setting up Mobile..."
cd ../eatfitai-mobile
npm install

echo "✅ Setup complete!"
echo "Run: ./start-all.sh to start all services"
```

Chạy:
```bash
chmod +x setup.sh
./setup.sh
```

---

**END OF GUIDE**

Chúc bạn setup thành công! 🎉
