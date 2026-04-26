# EatFitAI User Flow

Updated: `2026-04-23`

Tài liệu này tóm tắt user flow hiện tại của app theo runtime trong repo. Khi có khác biệt, ưu tiên:

- `docs/ARCHITECTURE.md`
- `docs/TESTING_AND_RELEASE.md`

## 1. Main Runtime Shape

Core app flow:

```text
Launch -> Auth -> Onboarding / Intro -> Home / Diary / AI / Stats / Profile
```

Primary architecture path:

```text
Mobile -> Backend API -> SQL Server
Mobile -> Backend API -> AI Provider
```

Vision and voice are backend-proxied flows in the current branch.

## 2. Current Screen Inventory

Active screen groups reflected by architecture:

- Auth: `Welcome`, `Login`, `Register`, `VerifyEmail`, `ForgotPassword`, `Onboarding`, `IntroCarousel`
- Diary: `MealDiary`, `FoodSearch`, `FoodDetail`, `CustomDish`
- AI: `AIScan`, `VisionHistory`, `RecipeSuggestions`, `RecipeDetail`, `NutritionInsights`, `NutritionSettings`, `DietaryRestrictions`
- Stats: `Stats`, `WeekStats`, `MonthStats`
- Profile: `Profile`, `EditProfile`, `BodyMetrics`, `GoalSettings`, `WeightHistory`, `ChangePassword`, `Notifications`, `About`, `PrivacyPolicy`

`AddMealFromVision` đang là màn hỗ trợ sau scan trong `AppNavigator`, không phải tab chính. Tên lịch sử như `WeeklyHistory` không nên dùng làm source of truth hiện tại.

### 2.1 Bản đồ chức năng thường

```mermaid
flowchart TB
    Launch["Mở app"] --> Session{"Có session hợp lệ?"}
    Session -->|Không| Auth["Auth: Welcome, Login, Register, VerifyEmail, ForgotPassword"]
    Auth --> Onboarding["Onboarding / IntroCarousel"]
    Session -->|Có| MainTabs["AppTabs"]
    Onboarding --> MainTabs

    MainTabs --> Home["Home"]
    MainTabs --> Diary["MealDiary"]
    MainTabs --> Stats["Stats: Today / Week / Month"]
    MainTabs --> Profile["Profile"]

    Home --> QuickAdd["Quick actions / Smart add"]
    Diary --> FoodSearch["FoodSearch"]
    Diary --> FoodDetail["FoodDetail"]
    Diary --> CustomDish["CustomDish"]
    Diary --> CommonMeals["CommonMeals / CommonMealTemplate"]
    Diary --> RecentFood["Recent foods / copy previous day"]

    Profile --> BodyMetrics["BodyMetrics / WeightHistory"]
    Profile --> Goals["GoalSettings / BasicInfo"]
    Profile --> Account["ChangePassword / Notifications / About / PrivacyPolicy"]

    FoodSearch --> BackendFood["Backend food, favorites, user foods"]
    FoodDetail --> BackendDiary["Backend meal diary"]
    CustomDish --> BackendDiary
    RecentFood --> BackendDiary
    Stats --> BackendAnalytics["Backend analytics / summary"]
    Profile --> BackendProfile["Backend profile / body metrics"]
```

### 2.2 Bản đồ chức năng AI

```mermaid
flowchart TB
    MainTabs["AppTabs"] --> AiScan["AIScan / AiCamera"]
    MainTabs --> Voice["Voice"]
    MainTabs --> AiScreens["NutritionInsights / RecipeSuggestions / VisionHistory"]

    AiScan --> VisionDetect["POST /api/ai/vision/detect"]
    VisionDetect --> VisionCache{"Có cache ảnh?"}
    VisionCache -->|Có| MappedResult["Kết quả đã map món ăn"]
    VisionCache -->|Không| ProviderDetect["AI provider POST /detect"]
    ProviderDetect --> Yolo["YOLO best.pt, fallback yolov8s.pt khi được bật"]
    Yolo --> FoodMap["Backend map label sang food catalog"]
    FoodMap --> MappedResult
    MappedResult --> AddFromVision["AddMealFromVision: review, đổi món, chỉnh gram"]
    AddFromVision --> TeachAI["Dạy AI: POST /api/ai/labels/teach"]
    AddFromVision --> SaveDiary["Lưu vào MealDiary"]

    AiScreens --> Recipes["POST /api/ai/recipes/suggest"]
    Recipes --> RecipeDetail["GET /api/ai/recipes/{recipeId}"]
    RecipeDetail --> Cooking["POST /api/ai/cooking-instructions"]

    AiScreens --> Nutrition["Nutrition target, insights, adaptive target"]
    Nutrition --> GeminiNutrition["Gemini-first, fallback công thức khi AI lỗi"]

    Voice --> VoiceInput["Text command; STT local đang tắt mặc định"]
    VoiceInput --> VoiceParse["POST /api/voice/parse"]
    VoiceParse --> GeminiVoice["AI provider POST /voice/parse"]
    GeminiVoice --> VoiceFallback{"Kết quả đủ tin cậy?"}
    VoiceFallback -->|Có| VoiceExecute["POST /api/voice/execute"]
    VoiceFallback -->|Không| RuleParser["Backend rule fallback + cần review"]
    RuleParser --> VoiceExecute
    VoiceExecute --> VoiceActions["Thêm món, ghi cân nặng, hỏi calo"]
```

### 2.3 Ranh giới runtime

```mermaid
flowchart LR
    Mobile["Expo React Native mobile"] --> Backend["ASP.NET Core API"]
    Backend --> Database["PostgreSQL/Supabase production hoặc SQL Server local"]
    Backend --> AiProvider["Flask AI provider"]
    AiProvider --> VisionModel["YOLO vision"]
    AiProvider --> Gemini["Gemini nutrition, cooking, voice parse"]
    AiProvider --> OptionalSTT["Voice transcribe optional; ENABLE_STT=false mặc định local"]
    Mobile -. "Không gọi trực tiếp AI provider cho app feature" .-> AiProvider
```

## 3. Authentication Flow

Typical first-run path:

1. App launches.
2. If there is no valid session, user goes through `Welcome` -> `Login` or `Register`.
3. Email verification / forgot-password flows remain backend-owned.
4. New users continue through onboarding and intro screens.
5. Authenticated users land in the main app shell.

## 4. Diary Flow

Manual diary flow:

1. User opens `MealDiary`.
2. User adds food through `FoodSearch` or `FoodDetail`.
3. Backend stores entries under `/api/meal-diary`.
4. Day summary and grouped meal UI refresh from backend summary + diary data.

Current quick-log helpers added in this branch:

- recent searches remain local on mobile
- recent foods come from backend `GET /api/food/recent`
- same-as-yesterday uses backend `POST /api/meal-diary/copy-previous-day`

## 5. Vision Flow

Current vision path:

1. User opens `AIScan`.
2. Mobile uploads image to backend `POST /api/ai/vision/detect`.
3. Backend proxies to the AI provider.
4. Backend maps detections to food items and returns app-ready results.
5. User reviews, edits, and saves to diary.

Important note:

- The current app should not be documented as calling `POST /detect` directly from mobile.

## 6. Voice Flow

Current voice path:

1. User records or enters voice/text input.
2. Mobile calls backend-owned routes:
   - `POST /api/voice/transcribe`
   - `POST /api/voice/parse`
   - `POST /api/voice/execute`
3. Backend proxies parse work to AI provider and falls back when needed.
4. Backend executes supported intents such as adding food or logging weight.

Important note:

- Old descriptions that route voice through direct Whisper/Ollama runtime are historical only.

## 7. Stats And Profile Flow

Stats flow:

1. User opens `Stats`.
2. Weekly and monthly views load backend analytics.
3. Weekly review uses current stats screens, not a legacy standalone screen map.

Profile flow:

1. User opens `Profile`.
2. User can edit profile/body metrics/goals and view weight history.
3. Password, notification, about, and privacy screens are part of the active profile surface.

## 8. Doc Safety Notes

This file intentionally replaces the old generated inventory because the generated 2025-12-12 map no longer matched runtime.

If a future feature changes routing or screen names, update this file together with:

- `docs/ARCHITECTURE.md`
- `docs/TESTING_AND_RELEASE.md`
