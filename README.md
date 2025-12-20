# 🍎 EatFitAI

**Ứng dụng theo dõi dinh dưỡng cá nhân với tích hợp AI Vision**

---

## 📋 Tổng quan

EatFitAI giúp người dùng:
- 📸 Chụp ảnh món ăn → AI nhận diện thực phẩm tự động
- 📊 Theo dõi calories, protein, carbs, fat hàng ngày
- 🎯 Đặt mục tiêu dinh dưỡng cá nhân hóa
- 📈 Xem thống kê tuần/tháng với biểu đồ trực quan
- 🗣️ Điều khiển bằng giọng nói (tiếng Việt)

---

## 🛠️ Tech Stack

| Component | Công nghệ |
|-----------|-----------|
| **Mobile** | Expo SDK 54, React Native, TypeScript |
| **Backend** | .NET 9, ASP.NET Core Web API |
| **Database** | SQL Server / Supabase |
| **AI Vision** | YOLOv8 (trained on Vietnamese food) |
| **AI LLM** | Ollama (local) - llama3.2:3b |
| **AI Voice** | PhoWhisper (Vietnamese STT) |

---

## ⚡ Quick Start (3 Terminals)

### Prerequisites

Cài đặt sẵn:
- Python 3.10+
- .NET SDK 9.0+
- Node.js 18+
- SQL Server (hoặc Supabase account)
- [Ollama](https://ollama.com/download) (optional, cho AI features)

### 1️⃣ Terminal 1: AI Provider

```powershell
cd ai-provider
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

✅ Chạy trên `http://localhost:5050`

### 2️⃣ Terminal 2: Backend API

```powershell
cd eatfitai-backend
dotnet restore
dotnet run
```

✅ Chạy trên `http://localhost:5247` | Swagger: `/swagger`

### 3️⃣ Terminal 3: Mobile App

```powershell
cd eatfitai-mobile
npm install
npm run dev
```

✅ Scan QR bằng Expo Go app trên điện thoại

---

## 📖 Documentation

| Doc | Mô tả |
|-----|-------|
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Hướng dẫn chi tiết từng bước |
| [JWT_CONFIGURATION.md](./JWT_CONFIGURATION.md) | Cấu hình JWT và User Secrets |
| [ai-provider/README.md](./ai-provider/README.md) | API endpoints AI Provider |
| [docs/](./docs/) | Báo cáo đánh giá, kiến trúc |

---

## 🔐 Demo Account

```
Email: demo@eatfit.ai
Password: demo123
```

---

## 📁 Cấu trúc Project

```
EatFitAI_v1/
├── ai-provider/          # 🤖 Python Flask - YOLO + Ollama
├── eatfitai-backend/     # 🔧 .NET Core Web API
├── eatfitai-mobile/      # 📱 Expo React Native
├── docs/                 # 📚 Tài liệu đánh giá
└── *.sql                 # 🗃️ Database scripts
```

---

## 🧪 Testing

```powershell
# Backend
cd eatfitai-backend && dotnet test

# Mobile
cd eatfitai-mobile && npm test
```

---

## 📞 Health Check

- AI Provider: `http://localhost:5050/healthz`
- Backend: `http://localhost:5247/health`

---

**Made with ❤️ by EatFitAI Team**
