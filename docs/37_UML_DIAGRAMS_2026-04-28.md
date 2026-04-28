# 📐 EatFitAI — UML Diagrams

> Updated: `2026-04-28` | Dùng cho báo cáo tốt nghiệp

---

## 1. ERD — Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ MealDiary : "ghi nhật ký"
    User ||--o{ BodyMetric : "đo chỉ số"
    User ||--o{ NutritionTarget : "đặt mục tiêu"
    User ||--o{ AILog : "tạo log AI"
    User ||--o{ UserDish : "tạo món tùy chỉnh"
    User ||--o{ UserFavoriteFood : "yêu thích"
    User ||--o{ UserFoodItem : "tạo thực phẩm"
    User ||--o{ UserRecentFood : "gần đây"
    User ||--o{ WaterIntake : "uống nước"
    User ||--|| UserPreference : "thiết lập"

    MealDiary }o--|| MealType : "loại bữa"
    MealDiary }o--o| FoodItem : "thực phẩm"
    MealDiary }o--o| Recipe : "công thức"
    MealDiary }o--o| UserDish : "món tùy chỉnh"
    MealDiary }o--o| ServingUnit : "đơn vị"

    FoodItem ||--o{ FoodServing : "đơn vị phục vụ"
    FoodItem ||--o{ AISuggestion : "gợi ý AI"
    FoodItem ||--o{ RecipeIngredient : "nguyên liệu"
    FoodItem ||--o{ UserDishIngredient : "thành phần"
    FoodItem ||--o{ UserFavoriteFood : "yêu thích"
    FoodItem ||--o{ UserRecentFood : "gần đây"

    Recipe ||--o{ RecipeIngredient : "chứa"
    Recipe ||--o{ MealDiary : "dùng trong"

    UserDish ||--o{ UserDishIngredient : "chứa"
    UserDish ||--o{ MealDiary : "dùng trong"

    AILog ||--o{ AISuggestion : "gợi ý"
    AILog ||--o{ ImageDetection : "phát hiện"

    NutritionTarget }o--o| ActivityLevel : "mức hoạt động"

    User {
        Guid UserId PK
        string Email UK
        string PasswordHash
        string DisplayName
        string AvatarUrl
        bool EmailVerified
        string VerificationCode
        bool OnboardingCompleted
        string Role
        decimal TargetWeightKg
        int CurrentStreak
        int LongestStreak
        DateTime LastLogDate
        DateTime CreatedAt
    }

    FoodItem {
        int FoodItemId PK
        string FoodName
        string FoodNameEn
        string FoodNameUnsigned
        decimal CaloriesPer100g
        decimal ProteinPer100g
        decimal CarbPer100g
        decimal FatPer100g
        string Barcode
        string ThumbNail
        bool IsVerified
        int CredibilityScore
    }

    MealDiary {
        int MealDiaryId PK
        Guid UserId FK
        DateOnly EatenDate
        int MealTypeId FK
        int FoodItemId FK
        int UserDishId FK
        int RecipeId FK
        decimal Grams
        decimal Calories
        decimal Protein
        decimal Carb
        decimal Fat
        string PhotoUrl
        string SourceMethod
    }

    NutritionTarget {
        int NutritionTargetId PK
        Guid UserId FK
        int ActivityLevelId FK
        int TargetCalories
        int TargetProtein
        int TargetCarb
        int TargetFat
        DateOnly EffectiveFrom
        DateOnly EffectiveTo
    }

    BodyMetric {
        int BodyMetricId PK
        Guid UserId FK
        decimal HeightCm
        decimal WeightKg
        DateOnly MeasuredDate
        string Note
    }

    AILog {
        int AILogId PK
        Guid UserId FK
        string Action
        string InputData
        string OutputData
        DateTime CreatedAt
    }

    WaterIntake {
        int WaterIntakeId PK
        Guid UserId FK
        DateOnly IntakeDate
        int AmountMl
        int TargetMl
    }

    UserPreference {
        int UserPreferenceId PK
        Guid UserId FK
        string DietaryRestrictions
        string Allergies
        int PreferredMealsPerDay
        string PreferredCuisine
    }

    GeminiKey {
        Guid Id PK
        string KeyName
        string EncryptedApiKey
        int DailyRequestsUsed
        int TotalRequestsUsed
        string Tier
        string Model
        int DailyQuotaLimit
        string ProjectId
    }
```

---

## 2. Use Case Diagram

```mermaid
graph TB
    subgraph "EatFitAI System"
        subgraph "Authentication"
            UC1["Đăng ký tài khoản"]
            UC2["Đăng nhập"]
            UC3["Xác minh Email"]
            UC4["Quên mật khẩu"]
            UC5["Đăng nhập Google"]
            UC6["Onboarding"]
        end

        subgraph "Nhật ký dinh dưỡng"
            UC10["Thêm bữa ăn thủ công"]
            UC11["Tìm kiếm thực phẩm"]
            UC12["Xem chi tiết thực phẩm"]
            UC13["Tạo món tùy chỉnh"]
            UC14["Sao chép bữa ngày trước"]
            UC15["Xóa/sửa bữa ăn"]
            UC16["Ghi lượng nước uống"]
        end

        subgraph "AI Features"
            UC20["Scan ảnh nhận diện món ăn"]
            UC21["Voice input ghi nhật ký"]
            UC22["Gợi ý công thức nấu ăn"]
            UC23["Hướng dẫn nấu ăn AI"]
            UC24["Phân tích dinh dưỡng AI"]
            UC25["Dạy AI nhận diện mới"]
        end

        subgraph "Thống kê & Mục tiêu"
            UC30["Xem thống kê ngày"]
            UC31["Xem thống kê tuần"]
            UC32["Xem thống kê tháng"]
            UC33["Đặt mục tiêu calo/macro"]
            UC34["Theo dõi cân nặng"]
        end

        subgraph "Hồ sơ"
            UC40["Chỉnh sửa hồ sơ"]
            UC41["Cập nhật chỉ số cơ thể"]
            UC42["Đổi mật khẩu"]
            UC43["Quản lý thông báo"]
            UC44["Thiết lập chế độ ăn"]
        end

        subgraph "Admin"
            UC50["Quản lý người dùng"]
            UC51["Quản lý thực phẩm"]
            UC52["Quản lý Gemini Keys"]
            UC53["Xem AI Logs"]
            UC54["Dashboard thống kê"]
        end
    end

    User((Người dùng))
    Admin((Admin))
    AIProvider[/"AI Provider"/]

    User --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6
    User --> UC10 & UC11 & UC12 & UC13 & UC14 & UC15 & UC16
    User --> UC20 & UC21 & UC22 & UC23 & UC24 & UC25
    User --> UC30 & UC31 & UC32 & UC33 & UC34
    User --> UC40 & UC41 & UC42 & UC43 & UC44

    Admin --> UC50 & UC51 & UC52 & UC53 & UC54

    UC20 -.-> AIProvider
    UC21 -.-> AIProvider
    UC22 -.-> AIProvider
    UC23 -.-> AIProvider
    UC24 -.-> AIProvider
```

---

## 3. Sequence Diagram — AI Vision Scan Flow

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant M as Mobile App
    participant B as Backend API
    participant AI as AI Provider
    participant DB as PostgreSQL
    participant R2 as Cloudflare R2

    U->>M: Chụp ảnh món ăn
    M->>B: POST /api/ai/vision/detect (image)
    B->>B: Xác thực JWT token
    B->>B: Kiểm tra vision cache

    alt Cache hit
        B-->>M: Trả kết quả cached
    else Cache miss
        B->>AI: POST /detect (image binary)
        AI->>AI: YOLO ONNX inference
        AI-->>B: Raw detections (labels, confidence, bbox)
        B->>DB: Map labels → FoodItem catalog
        B->>DB: Lưu AILog + ImageDetection
        B->>R2: Upload ảnh gốc
        B-->>M: VisionDetectResultDto
    end

    M->>U: Hiển thị kết quả nhận diện
    U->>M: Review, chỉnh sửa, xác nhận
    M->>B: POST /api/meal-diary (save entries)
    B->>DB: INSERT MealDiary records
    B-->>M: 201 Created
    M->>U: Cập nhật nhật ký thành công
```

---

## 4. Sequence Diagram — Voice Input Flow

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant M as Mobile App
    participant B as Backend API
    participant AI as AI Provider
    participant DB as PostgreSQL

    U->>M: Nói "Tôi vừa ăn 1 bát phở bò"
    M->>B: POST /api/voice/parse (text)
    B->>B: Xác thực JWT
    B->>AI: POST /voice/parse (text, user_context)
    AI->>AI: Gemini NLP processing
    AI-->>B: ParseResult (intent, food, quantity, confidence)

    alt Confidence >= threshold
        B->>DB: Tìm FoodItem matching
        B-->>M: Parsed result + food suggestions
        U->>M: Xác nhận
        M->>B: POST /api/voice/execute (confirmed data)
        B->>DB: INSERT MealDiary
        B-->>M: Execution result
    else Low confidence
        B->>B: Rule-based fallback parsing
        B-->>M: Fallback result + cần review
        U->>M: Chỉnh sửa và xác nhận
        M->>B: POST /api/voice/execute
        B->>DB: INSERT MealDiary
        B-->>M: Execution result
    end

    M->>U: Xác nhận ghi nhật ký thành công
```

---

## 5. Sequence Diagram — Authentication Flow

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant M as Mobile App
    participant B as Backend API
    participant DB as PostgreSQL
    participant Mail as Brevo SMTP

    U->>M: Nhập email + password
    M->>B: POST /api/auth/register

    B->>DB: Check email tồn tại
    alt Email đã tồn tại
        B-->>M: 409 Conflict
    else Email mới
        B->>B: Hash password (BCrypt)
        B->>B: Generate verification code (6 số)
        B->>DB: INSERT User
        B->>Mail: Gửi email xác minh
        B-->>M: 201 Created
    end

    U->>M: Nhập mã xác minh
    M->>B: POST /api/auth/verify-email
    B->>DB: Verify code + expiry
    B->>DB: UPDATE EmailVerified = true
    B-->>M: JWT Token + RefreshToken

    Note over M,B: Các request tiếp theo đều kèm JWT
    M->>B: GET /api/user/profile (Bearer token)
    B->>B: Validate JWT
    B->>DB: SELECT User
    B-->>M: User profile data
```

---

## 6. Activity Diagram — Diary Entry Flow

```mermaid
flowchart TD
    Start([Bắt đầu]) --> OpenDiary[Mở Nhật ký]
    OpenDiary --> ChooseMethod{Chọn phương thức}

    ChooseMethod -->|Thủ công| SearchFood[Tìm kiếm thực phẩm]
    ChooseMethod -->|AI Scan| TakePhoto[Chụp ảnh]
    ChooseMethod -->|Voice| SpeakInput[Nói lệnh]
    ChooseMethod -->|Copy| CopyPrev[Sao chép ngày trước]

    SearchFood --> SelectFood[Chọn thực phẩm]
    SelectFood --> InputGrams[Nhập khối lượng gram]

    TakePhoto --> AIDetect[AI nhận diện YOLO]
    AIDetect --> ReviewResult{Kết quả chính xác?}
    ReviewResult -->|Có| InputGrams
    ReviewResult -->|Không| TeachAI[Dạy AI / Chỉnh sửa]
    TeachAI --> InputGrams

    SpeakInput --> NLPParse[AI phân tích ngữ nghĩa]
    NLPParse --> ConfirmParse{Phân tích đúng?}
    ConfirmParse -->|Có| AutoFill[Tự điền thông tin]
    ConfirmParse -->|Không| ManualEdit[Chỉnh sửa thủ công]
    ManualEdit --> AutoFill
    AutoFill --> InputGrams

    CopyPrev --> LoadPrevDay[Tải bữa ăn ngày trước]
    LoadPrevDay --> ConfirmCopy{Xác nhận?}
    ConfirmCopy -->|Có| SaveDiary
    ConfirmCopy -->|Không| EditCopy[Chỉnh sửa]
    EditCopy --> SaveDiary

    InputGrams --> CalcNutrition[Tính toán dinh dưỡng]
    CalcNutrition --> ChooseMeal[Chọn bữa: Sáng/Trưa/Tối/Phụ]
    ChooseMeal --> SaveDiary[Lưu vào MealDiary]

    SaveDiary --> UpdateStats[Cập nhật thống kê ngày]
    UpdateStats --> UpdateStreak[Cập nhật streak]
    UpdateStreak --> End([Kết thúc])
```

---

## 7. Activity Diagram — Onboarding Flow

```mermaid
flowchart TD
    Start([Đăng ký thành công]) --> VerifyEmail[Xác minh email]
    VerifyEmail --> BasicInfo[Nhập thông tin cơ bản]
    BasicInfo --> InputHeight[Chiều cao cm]
    InputHeight --> InputWeight[Cân nặng kg]
    InputWeight --> InputAge[Tuổi + Giới tính]
    InputAge --> SelectGoal{Chọn mục tiêu}

    SelectGoal -->|Giảm cân| LoseWeight[Deficit -500 kcal]
    SelectGoal -->|Tăng cân| GainWeight[Surplus +300 kcal]
    SelectGoal -->|Duy trì| Maintain[Maintain TDEE]

    LoseWeight --> SelectActivity
    GainWeight --> SelectActivity
    Maintain --> SelectActivity

    SelectActivity[Chọn mức hoạt động] --> CalcTDEE[Tính TDEE theo Harris-Benedict]
    CalcTDEE --> CalcMacro[Tính macro targets]
    CalcMacro --> SaveTarget[Lưu NutritionTarget]
    SaveTarget --> SetPreference[Thiết lập chế độ ăn / dị ứng]
    SetPreference --> CompleteOnboarding[OnboardingCompleted = true]
    CompleteOnboarding --> HomeScreen([Vào trang chính])
```

---

## 8. Component Diagram — System Architecture

```mermaid
graph TB
    subgraph "Mobile Layer"
        RN["React Native / Expo"]
        Camera["Camera Module"]
        Voice["Voice Input"]
    end

    subgraph "Backend Layer"
        API["ASP.NET Core API"]
        Auth["AuthService + JWT"]
        Diary["MealDiaryService"]
        Food["FoodService"]
        AICtrl["AIController"]
        VoiceCtrl["VoiceController"]
        Encrypt["EncryptionService"]
        Storage["R2MediaStorageService"]
    end

    subgraph "AI Provider Layer"
        Flask["FastAPI Server"]
        YOLO["YOLOv8 ONNX Runtime"]
        Gemini["Gemini 2.5 Flash Pool"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL / Supabase"]
        R2["Cloudflare R2"]
    end

    RN -->|HTTPS| API
    Camera -->|Image| API
    Voice -->|Text| API

    API --> Auth
    API --> Diary
    API --> Food
    API --> AICtrl
    API --> VoiceCtrl
    API --> Encrypt
    API --> Storage

    AICtrl -->|HTTP Internal| Flask
    VoiceCtrl -->|HTTP Internal| Flask

    Flask --> YOLO
    Flask --> Gemini

    Auth --> PG
    Diary --> PG
    Food --> PG
    Storage --> R2

    style RN fill:#61dafb,color:#000
    style API fill:#512bd4,color:#fff
    style Flask fill:#009688,color:#fff
    style PG fill:#336791,color:#fff
    style R2 fill:#f48120,color:#fff
```

---

## 9. Deployment Diagram

```mermaid
graph LR
    subgraph "Client"
        Android["Android Device"]
        iOS["iOS Device"]
    end

    subgraph "Render Cloud"
        BE["Backend Service<br/>ASP.NET Core<br/>Docker Container"]
        AIP["AI Provider<br/>FastAPI + ONNX<br/>Docker Container"]
    end

    subgraph "Supabase"
        PG["PostgreSQL Database<br/>us-east-1"]
    end

    subgraph "Cloudflare"
        R2["R2 Object Storage<br/>Media bucket"]
    end

    subgraph "External Services"
        Gemini["Google Gemini API<br/>6-project pool"]
        Brevo["Brevo SMTP<br/>Email service"]
    end

    Android & iOS -->|HTTPS| BE
    BE -->|Internal HTTP| AIP
    BE -->|TCP 5432| PG
    BE -->|S3 API| R2
    BE -->|SMTP| Brevo
    AIP -->|HTTPS| Gemini

    style BE fill:#512bd4,color:#fff
    style AIP fill:#009688,color:#fff
    style PG fill:#336791,color:#fff
    style R2 fill:#f48120,color:#fff
    style Gemini fill:#4285f4,color:#fff
```
