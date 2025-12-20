# 📦 SETUP GUIDE - EatFitAI (Chi tiết)

> **Thời gian ước tính**: 30-45 phút  
> **Yêu cầu**: Kết nối internet tốt

---

## 📋 YÊU CẦU HỆ THỐNG

### Phần mềm bắt buộc

| Phần mềm | Version | Download |
|----------|---------|----------|
| **Git** | 2.30+ | https://git-scm.com/downloads |
| **Python** | 3.10+ | https://www.python.org/downloads |
| **.NET SDK** | 9.0+ | https://dotnet.microsoft.com/download |
| **Node.js** | 18+ | https://nodejs.org |
| **SQL Server** | 2019+ | Hoặc dùng Supabase |

### Phần mềm khuyến nghị (cho AI features)

| Phần mềm | Mục đích | Download |
|----------|----------|----------|
| **Ollama** | Local LLM | https://ollama.com/download |
| **CUDA Toolkit** | GPU acceleration | https://developer.nvidia.com/cuda-downloads |

### Phần cứng khuyến nghị

- **RAM**: 16GB (tối thiểu 8GB)
- **Disk**: 10GB trống
- **GPU** (Optional): NVIDIA với 6GB+ VRAM

---

## 🚀 BƯỚC 1: CLONE PROJECT

```powershell
git clone <REPO_URL>
cd EatFitAI_v1
```

Verify cấu trúc:
```
EatFitAI_v1/
├── ai-provider/          # ✅
├── eatfitai-backend/     # ✅
├── eatfitai-mobile/      # ✅
```

---

## 🗃️ BƯỚC 2: SETUP DATABASE

### Option A: SQL Server (Local)

1. **Tạo database EatFitAI** trong SQL Server Management Studio

2. **Import data** từ file SQL:
   ```powershell
   sqlcmd -S localhost -d EatFitAI -i "EatFitAI_14_12 tuong fix.sql"
   ```

3. **Update connection string** trong `eatfitai-backend/appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=YOUR_SERVER;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;"
     }
   }
   ```

### Option B: Supabase (Cloud)

1. Tạo project tại https://supabase.com
2. Lấy **Connection String** từ Settings → Database
3. Update `appsettings.json` với connection string của Supabase

---

## 🤖 BƯỚC 3: SETUP AI PROVIDER (Python)

### 3.1. Tạo Virtual Environment

```powershell
cd ai-provider
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3.2. Cài đặt Dependencies

```powershell
pip install -r requirements.txt
```

### 3.3. Cài PyTorch với CUDA (Optional - cho GPU)

```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 3.4. Download YOLO Model

⚠️ **File `best.pt` (~22.5MB) KHÔNG có trong Git!**

**Cách lấy:**
1. Download từ Google Drive/OneDrive của team
2. Đặt vào folder `ai-provider/`
3. Verify: `(Get-Item best.pt).length / 1MB` → ~22.5 MB

### 3.5. Setup Ollama (cho AI features)

```powershell
# Cài Ollama
winget install Ollama.Ollama

# Download model (chọn 1)
ollama pull llama3.2:3b          # Nhẹ, nhanh
ollama pull mistral:7b-instruct  # Chất lượng cao hơn

# Start Ollama server
ollama serve
```

### 3.6. Tạo file .env

```powershell
# Tạo file ai-provider/.env
Copy-Item .env.example .env
```

Nội dung `.env`:
```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

### 3.7. Test AI Provider

```powershell
python app.py
```

✅ **Thành công khi thấy:**
```
Starting AI Provider on port 5050
Model loaded successfully: best.pt
 * Running on http://0.0.0.0:5050
```

🔗 **Verify**: http://localhost:5050/healthz

---

## 🔧 BƯỚC 4: SETUP BACKEND (.NET)

### 4.1. Restore Dependencies

```powershell
cd eatfitai-backend
dotnet restore
```

### 4.2. Setup User Secrets

.NET sử dụng User Secrets thay vì `.env` file:

```powershell
# 1. Generate JWT Key
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwtKey = [Convert]::ToBase64String($bytes)

# 2. Set secrets
dotnet user-secrets set "Jwt:Key" "$jwtKey"
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com"
dotnet user-secrets set "Smtp:Port" "587"
dotnet user-secrets set "Smtp:User" "your-email@gmail.com"
dotnet user-secrets set "Smtp:Password" "your-app-password"
dotnet user-secrets set "Smtp:FromEmail" "your-email@gmail.com"

# 3. Verify
dotnet user-secrets list
```

> 📝 **Lưu ý**: Xem chi tiết tại [JWT_CONFIGURATION.md](./JWT_CONFIGURATION.md)

### 4.3. Build & Run

```powershell
dotnet build
dotnet run
```

✅ **Thành công khi thấy:**
```
Now listening on: http://0.0.0.0:5247
Application started.
```

🔗 **Verify**: 
- Health: http://localhost:5247/health
- Swagger: http://localhost:5247/swagger

---

## 📱 BƯỚC 5: SETUP MOBILE (React Native)

### 5.1. Install Dependencies

```powershell
cd eatfitai-mobile
npm install
```

### 5.2. Tạo file .env

```powershell
Copy-Item .env.example .env.development
```

### 5.3. Cấu hình API URL

Sửa `.env.development`:

```bash
# Cho Android Emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5247

# Cho Physical Device (thay YOUR_IP bằng IP máy bạn)
EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:5247
```

**Cách lấy IP máy:**
```powershell
ipconfig | findstr "IPv4"
```

### 5.4. Run Mobile App

```powershell
npm run dev
```

**Chọn platform:**
- Press `a` → Android Emulator
- Scan QR → Expo Go app trên điện thoại

---

## ✅ BƯỚC 6: VERIFY TOÀN BỘ HỆ THỐNG

### Checklist

| Component | URL | Expected |
|-----------|-----|----------|
| AI Provider | http://localhost:5050/healthz | `{"status": "ok", "model_loaded": true}` |
| Backend | http://localhost:5247/health | `{"status": "Healthy"}` |
| Mobile | Expo Go app | App loads |

### Test Login

```
Email: demo@eatfit.ai
Password: demo123
```

---

## 📱 BƯỚC 7: BUILD ANDROID PHYSICAL DEVICE (Optional)

> ⚠️ **Lưu ý**: Chỉ cần nếu muốn chạy native app thay vì Expo Go

### 7.1. Cài đặt JDK 17

```powershell
# Download và cài JDK 17 từ:
# https://adoptium.net/temurin/releases/?version=17

# Hoặc dùng winget
winget install EclipseAdoptium.Temurin.17.JDK
```

### 7.2. Cấu hình Gradle dùng JDK 17

Tạo file `eatfitai-mobile/android/gradle.properties` (nếu chưa có):

```properties
# Java 17 path (Windows)
org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.x-hotspot

# Performance
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
org.gradle.caching=true
```

### 7.3. Build và Run

```powershell
cd eatfitai-mobile

# Kết nối device qua USB (bật USB Debugging)
adb devices

# Build và run
npx expo run:android
```

### 7.4. Mở Firewall ports

Mobile app cần kết nối đến Backend API:

```powershell
# Mở port 5247 cho Backend
netsh advfirewall firewall add rule name="EatFitAI Backend" dir=in action=allow protocol=TCP localport=5247

# Mở port 5050 cho AI Provider (nếu cần)
netsh advfirewall firewall add rule name="EatFitAI AI Provider" dir=in action=allow protocol=TCP localport=5050
```

### 7.5. Cấu hình .env cho Physical Device

```bash
# Lấy IP máy: ipconfig | findstr "IPv4"
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:5247
```

---

## ⚠️ TROUBLESHOOTING

### Lỗi: "Model file not found"
→ Download `best.pt` từ link bên dưới và đặt vào `ai-provider/`

### Lỗi: "CUDA not available"  
→ OK, model sẽ dùng CPU (chậm hơn nhưng vẫn hoạt động)

### Lỗi: "Cannot connect to API" (Mobile)
→ Check IP trong `.env.development` khớp với IP máy chạy backend
→ Đảm bảo firewall đã mở port 5247

### Lỗi: "Database connection failed"
→ Verify connection string trong `appsettings.json`
→ Check SQL Server đang chạy

### Lỗi: "JWT Key invalid"
→ Chạy lại `dotnet user-secrets set "Jwt:Key" "..."`

### Lỗi: "Unsupported class file major version 69" (Android build)
→ Cài JDK 17 và cấu hình trong `gradle.properties` (xem Bước 7)

### Lỗi: "Filename longer than 260 characters" (Android build)
→ Di chuyển project ra đường dẫn ngắn hơn (ví dụ: `D:\EatFitAI`)

---

## 📥 DOWNLOAD YOLO MODEL

File `best.pt` (~22.5MB) không có trong Git. Download từ:

| Source | Link |
|--------|------|
| **Google Drive** | [EatFitAI YOLO Model](https://drive.google.com/drive/folders/YOUR_FOLDER_ID) |
| **OneDrive** | Liên hệ team leader |

Sau khi download, đặt vào: `ai-provider/best.pt`

---

## 📚 TÀI LIỆU LIÊN QUAN

- [JWT_CONFIGURATION.md](./JWT_CONFIGURATION.md) - Chi tiết cấu hình JWT
- [ai-provider/README.md](./ai-provider/README.md) - API endpoints AI
- [ai-provider/TRAINING_GUIDE.md](./ai-provider/TRAINING_GUIDE.md) - Hướng dẫn train YOLO
- [docs/](./docs/) - Báo cáo đánh giá codebase

---

**Chúc bạn setup thành công! 🎉**
