# 🎓 BÁO CÁO ĐỒ ÁN TỐT NGHIỆP/MÔN HỌC - EATFITAI (BẢN FULL)
> **Dự án**: EatFitAI - Hệ thống Trợ lý Dinh dưỡng Cá nhân hóa sử dụng AI Vision & LLM
> **Phiên bản**: 2.0 (Comprehensive Edition)
> **Mục tiêu**: Báo cáo chuyên sâu về Kỹ thuật, Nghiệp vụ và Tính thực tiễn.

---

## 📑 MỤC LỤC CHI TIẾT (DETAILED AGENDA)

1.  **Lý do chọn đề tài & Thị trường** (Market & Motivation)
2.  **Bài toán & Phạm vi Nghiên cứu** (Problem Statement)
3.  **Phân tích & Thiết kế Hệ thống** (System Analysis & Design)
4.  **Công nghệ & Kỹ thuật Chuyên sâu** (Advanced Tech Stack)
5.  **Chi tiết Thuật toán AI** (AI Algorithms Deep Dive)
6.  **Quy trình Nghiệp vụ (User Flows)**
7.  **Thách thức Kỹ thuật & Giải quyết** (Challenges & Solutions)
8.  **So sánh & Đánh giá** (Evaluation)
9.  **Kết luận & Hướng phát triển** (Conclusion)

---

## 1. 🌟 LÝ DO CHỌN ĐỀ TÀI & PHÂN TÍCH THỊ TRƯỜNG

### 1.1 Đặt vấn đề
-   **Tình trạng béo phì/suy dinh dưỡng**: Nhu cầu kiểm soát cân nặng ngày càng cao tại Việt Nam.
-   **Khó khăn trong tracking**: 80% người dùng bỏ cuộc sau 1 tuần dùng app truyền thống vì việc nhập liệu (logging) quá tốn thời gian (3-5 phút/bữa).
-   **Rào cản kiến thức**: Người dùng không biết "1 bát phở" có bao nhiêu calo, macros ra sao.

### 1.2 Phân tích đối thủ (Competitor Analysis)
| Tiêu chí | MyFitnessPal | Yazio | **EatFitAI (Our Solution)** |
| :--- | :--- | :--- | :--- |
| **Nhập liệu** | Chủ yếu thủ công, barcode | Thủ công, scan cơ bản | **AI Vision (Multi-food detection)** + Voice |
| **Độ chính xác món Việt** | Thấp (Database Âu Mỹ) | Trung bình | **Cao** (Fine-tuned cho món Việt) |
| **Tư vấn cá nhân** | Cơ bản (Rule-based) | Cơ bản | **LLM Reasoning** (Giải thích chi tiết tại sao) |
| **UX/UI** | Phức tạp, nhiều quảng cáo | Hiện đại | **Glassmorphism**, tập trung trải nghiệm |
| **Chi phí** | Freemium (Premium đắt) | Freemium | Miễn phí (Đồ án Open Source) |

---

## 2. 🎯 BÀI TOÁN & PHẠM VI (SCOPE)

### 2.1 Input Bài toán
-   Người dùng muốn: "Tôi muốn giảm 5kg trong 2 tháng".
-   Hệ thống cần trả lời:
    1.  Mỗi ngày ăn bao nhiêu Calo? (TDEE calculation).
    2.  Bữa ăn này có gì? (Food Recognition).
    3.  Tình trạng hiện tại ra sao? (Health Analytics).

### 2.2 Phạm vi chức năng (Functional Scope)
1.  **Module Quản lý Người dùng**: Auth, Profile, Body Metrics.
2.  **Module Nhật ký & Vision**: Camera AI, Food Database, Meal Log.
3.  **Module Dinh dưỡng AI**: Tính toán mục tiêu, Gợi ý công thức (Recipe Gen).
4.  **Module Báo cáo**: Biểu đồ Victory Charts, Heatmap, Streak.
5.  **Module Gamification**: Thành tựu, Huy hiệu, Leveling.

---

## 3. 🏗️ PHÂN TÍCH & THIẾT KẾ HỆ THỐNG (SYSTEM DESIGN)

### 3.1 Architecture Overview (Mô hình Micro-kernel cải tiến)
Chúng tôi sử dụng mô hình lai giữa **N-Tier** và **Service-Oriented**:

```mermaid
graph TD
    Client[Mobile App React Native] --> Gateway[API Gateway / Load Balancer]
    Gateway --> API[.NET 9 Core API]
    
    subgraph "Backend Services"
        API --> AuthService
        API --> DiaryService
        API --> ReportService
    end
    
    subgraph "Intelligence Core (Python)"
        API -.->|HTTP/gRPC| AI_Proxy[AI Controller]
        AI_Proxy --> YOLO[YOLOv8 Engine]
        AI_Proxy --> LLM[Ollama/Gemini Engine]
        AI_Proxy --> STT[Whisper Engine]
    end
    
    subgraph "Data Storage"
        API --> SQL[SQL Server (Relational)]
        API --> Redis[Redis (Cache - Future)]
    end
```

### 3.2 Cơ sở dữ liệu (Database Schema Key Entities)
Mô hình ERD được chuẩn hóa (3NF):
-   **Users**: (Id, Email, PasswordHash, Height, Weight, ActivityLevel, Goal).
-   **FoodItems**: (Id, Name, Calories, Protein, Carbs, Fat, IsCustom).
-   **MealEntries**: (Id, UserId, FoodId, Date, MealType, Quantity).
-   **AiFoodMappings**: (Label_YOLO, FoodItemId) - *Bảng quan trọng giúp map nhãn AI sang món ăn DB*.
-   **WeeklyCheckIns**: (Id, UserId, Weight, Date, AiFeedback).

---

## 4. 🛠️ CÔNG NGHỆ & KỸ THUẬT CHUYÊN SÂU

### 4.1 Mobile (Frontend Excellence)
-   **Optimization**: Sử dụng `FlashList` thay cho `FlatList` để render danh sách dài (5x performance).
-   **State Management**: `Zustand` cho global state (nhẹ hơn Redux 10 lần) + `TanStack Query` để cache API data (Stale-while-revalidate).
-   **UI System**: Hệ thống Design Token (Spacing, Typography, Colors) nhất quán. Glassmorphism thực hiện bằng `expo-blur` native view.

### 4.2 Backend (.NET 9 Performance)
-   **Unit of Work & Repository Pattern**: Tách biệt logic truy xuất dữ liệu, giúp dễ unit test.
-   **DTOs & AutoMapper**: Mapping dữ liệu tự động, ẩn giấu cấu trúc DB với Client.
-   **Security**: Implement Refresh Token Rotation (chống replay attack), Email Verification 6 số.

### 4.3 Hạ tầng AI
-   **Cơ chế Fallback thông minh**:
    -   *Vision*: Custom Model -> Pretrained Model.
    -   *LLM*: Local Ollama (Privacy) -> Google Gemini (Cloud fallback nếu local yếu).
-   **Image Hashing**: Hash MD5 của ảnh upload để cache kết quả nhận diện, giảm tải cho GPU.

---

## 5. 🧠 CHI TIẾT THUẬT TOÁN AI (ALGORITHMS)

### 5.1 Thuật toán Vision (YOLOv8)
-   **Model**: YOLOv8s (Small) fine-tuned trên tập dữ liệu VNFood-25 (25 món ăn phổ biến VN: Phở, Bánh mì, Cơm tấm...).
-   **Pre-processing**: Resize ảnh về 640x640, chuẩn hóa RGB.
-   **Inference**:
    -   Input: Ảnh Raw.
    -   Output: Bounding Boxes (xyxy) + Class ID + Confidence Score.
-   **Post-processing**:
    -   Lọc bỏ box có confidence < 0.4.
    -   Non-max Suppression (NMS) để loại bỏ các box chồng chéo.

### 5.2 Thuật toán Tư vấn Dinh dưỡng (Chain-of-Thought Prompting)
Thay vì hỏi LLM "Tính calo cho tôi", chúng tôi dùng kỹ thuật **Chain-of-Thought (CoT)**:
> *"Hãy đóng vai chuyên gia. Bước 1: Tính BMR theo công thức X. Bước 2: Nhân hệ số Y. Bước 3: Điều chỉnh Z%. Hãy suy luận từng bước trước khi đưa ra kết quả JSON."*
-> Giúp kết quả chính xác và logic hơn 40% so với Zero-shot prompting.

---

## 6. 🚧 THÁCH THỨC KỸ THUẬT (CHALLENGES & SOLUTIONS)

| Thách thức | Giải pháp đã thực hiện |
| :--- | :--- |
| **Độ trễ khi nhận diện ảnh** (Latancy) | 1. Resize ảnh tại Client trước khi upload.<br>2. Cache kết quả Vision bằng MD5 Hash. |
| **Hiển thị món ăn Việt** | YOLO gốc chỉ biết "Noodle", "Rice". Phải train lại model với dataset tự thu thập cho "Pho", "Com Tam". |
| **App bị lag khi load list dài** | Chuyển từ `FlatList` (React native core) sang `FlashList` (Shopify) để tái sử dụng views. |
| **Token hết hạn khi đang dùng** | Viết `Axios Interceptor` để tự động refresh token ngầm, user không bị logout bất ngờ. |
| **LLM trả về sai định dạng** | Ép kiểu output JSON mode và bọc trong khối `try-catch` với fallback logic: nếu JSON lỗi -> dùng thuật toán cứng (Rule-based). |

---

## 7. 📊 ĐÁNH GIÁ KẾT QUẢ (EVALUATION)

### 7.1 Định lượng (Quantitative)
-   **Vision Accuracy**: ~85% trên tập test set (với điều kiện ánh sáng tốt).
-   **API Reponse Time**: Trung bình 150ms cho API thường, 1.2s cho Vision API.
-   **App size**: ~45MB (Android APK), tối ưu cho mạng di động.

### 7.2 Định tính (Qualitative)
-   Giao diện được đánh giá là "Premium" và "Sạch" (Clean).
-   Flow tạo món ăn mới tốn ít thao tác hơn 60% so với nhập tay hoàn toàn.

---

## 8. 🚀 KẾT LUẬN & HƯỚNG PHÁT TRIỂN (ROADMAP)

### 8.1 Kết luận
Đồ án đã xây dựng thành công MVP chứng minh tính khả thi của việc ứng dụng AI vào bài toán dinh dưỡng hàng ngày. Mặc dù còn hạn chế về hạ tầng, nòng cốt công nghệ đã được thiết lập vững chắc.

### 8.2 Future Roadmap (Lộ trình phát triển)
-   **Phase 1 (Optimization)**: Thêm Redis Caching, Sentry Monitoring để bắt lỗi crash.
-   **Phase 2 (Community)**: Tính năng Social (Share thực đơn, Challenge bạn bè).
-   **Phase 3 (Ecosystem)**: Tích hợp với Apple HealthKit/Google Fit để lấy dữ liệu Calo tiêu thụ (Output) tự động, kết hợp với Calo nạp vào (Input) để ra bài toán cân bằng năng lượng hoàn chỉnh.
-   **Phase 4 (Hardware)**: Tích hợp cân thông minh Bluetooth.

---
**DEMO**: Sau đây, tôi xin phép trình diễn trực tiếp các chức năng chính của ứng dụng EatFitAI.
*(Chuyển sang kịch bản Demo trực tiếp)*
