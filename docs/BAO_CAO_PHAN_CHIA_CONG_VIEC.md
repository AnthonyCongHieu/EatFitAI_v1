# 📊 BÁO CÁO PHÂN CHIA CÔNG VIỆC CHUYÊN SÂU CỰC CHI TIẾT: EATFITAI
## Báo cáo phân công từng file, từng function, từng màn hình, từng API endpoint

---

## 📑 MỤC LỤC
1. [Phân chia theo Module chính](#module-chinh)
2. [Chi tiết công việc Backend - Lê Chí Tường](#backend-tuong)
3. [Chi tiết công việc Mobile & AI - Đinh Công Hiếu](#mobile-hieu)
4. [Timeline chi tiết 65 ngày](#timeline)
5. [Ma trận trách nhiệm cấp độ file](#file-matrix)

---

<a name="module-chinh"></a>
## 1. PHÂN CHIA THEO MODULE CHÍNH

| Module | Tổng Files | Người chịu trách nhiệm | % Đóng góp |
|:---|:---:|:---:|:---:|
| **Backend API (.NET)** | 33 files | Lê Chí Tường | 100% |
| **Database & Migration** | 26 tables | Lê Chí Tường | 100% |
| **Mobile UI (React Native)** | 94+ components | Đinh Công Hiếu | 95% |
| **AI Provider (Flask)** | 1 service (510 LOC) | Đinh Công Hiếu | 100% |
| **State Management (Zustand)** | 8 stores | Đinh Công Hiếu | 100% |
| **API Integration Services** | 20 services | Đinh Công Hiếu | 100% |

---

<a name="backend-tuong"></a>
## 2. CHI TIẾT CÔNG VIỆC BACKEND - LÊ CHÍ TƯỜNG

### 2.1. DATABASE ARCHITECTURE (26 Tables)
**Nhiệm vụ**: Thiết kế và triển khai toàn bộ cấu trúc dữ liệu

| Bảng | Mục đích | Số cột | Ước lượng thời gian |
|:---|:---|:---:|:---:|
| `Users` | Quản lý tài khoản người dùng | 18 | 3h |
| `NutritionTargets` | Lưu mục tiêu dinh dưỡng | 8 | 2h |
| `FoodItems` | Cơ sở dữ liệu 500+ món ăn | 12 | 8h (bao gồm data entry) |
| `MealDiary` | Nhật ký bữa ăn | 10 | 2h |
| `MealDiaryDetails` | Chi tiết món trong bữa ăn | 6 | 1.5h |
| `BodyMetrics` | Lịch sử cân nặng/chiều cao | 7 | 1.5h |
| `UserFoodItems` | Món ăn tự tạo | 11 | 2h |
| `Recipes` | Công thức nấu ăn | 9 | 3h |
| `RecipeIngredients` | Nguyên liệu công thức | 5 | 1h |
| `AiLabelMap` | Mapping AI Vision labels | 5 | 1.5h |
| `VisionHistory` | Lịch sử quét ảnh | 6 | 1h |
| `AiActivityLog` | Log hoạt động AI | 7 | 1h |
| `Favorites` | Món ăn yêu thích | 4 | 0.5h |
| `UserPreferences` | Sở thích ăn uống | 6 | 1h |
| `ActivityLevels` | Mức độ vận động | 4 | 0.5h |
| + 11 bảng khác | Views, Lookups, System | - | 5h |

**SQL Views (Tối ưu Analytics)**
- `vw_DaySummary`: Tổng hợp dinh dưỡng theo ngày (45 LOC)
- `vw_MealDetails`: Chi tiết bữa ăn với macros (38 LOC)
- `vw_AiFoodMaps`: Map nhận diện AI sang món ăn (22 LOC)
- `vw_WeeklySummary`: Báo cáo tuần (52 LOC)

**Tổng thời gian Database**: ~42 giờ

---

### 2.2. BACKEND CONTROLLERS (15 Controllers)
**Nhiệm vụ**: Lập trình toàn bộ API Endpoints

| Controller | Endpoints | LOC | Chức năng chính | Thời gian |
|:---|:---:|:---:|:---|:---:|
| `AuthController.cs` | 4 | 235 | Register, Login, Refresh Token, Verify Email | 6h |
| `GoogleAuthController.cs` | 2 | 311 | Google Sign-in, Link Account | 4h |
| `UserController.cs` | 4 | 119 | Get/Update Profile, Body Metrics (CRUD) | 3h |
| `MealDiaryController.cs` | 5 | 142 | CRUD Nhật ký bữa ăn | 4h |
| `FoodController.cs` | 3 | 128 | Search món, Get details, Favorites | 3h |
| `UserFoodItemsController.cs` | 5 | 137 | CRUD món tự tạo + Upload ảnh | 4h |
| `NutritionController.cs` | 3 | 275 | Tính BMR/TDEE, Get targets, Save targets | 5h |
| `AIController.cs` | 10 | 698 | Vision Detect, Recipe Suggest, Cooking AI, etc. | 12h |
| `VoiceController.cs` | 3 | 458 | Transcribe, Parse, Process Voice | 6h |
| `AnalyticsController.cs` | 2 | 65 | Nutrition Summary APIs | 2h |
| `SummaryController.cs` | 2 | 76 | Day/Week Summary | 2h |
| `FavoritesController.cs` | 3 | 141 | Add/Remove/List Favorites | 2h |
| `AIReviewController.cs` | 2 | 98 | Submit & Get AI Reviews | 2h |
| `UserPreferenceController.cs` | 2 | 48 | Get/Update User Preferences | 1h |
| `HealthController.cs` | 1 | 32 | Health Check Ping | 0.5h |

**Tổng thời gian Controllers**: ~56.5 giờ

---

### 2.3. BACKEND SERVICES (18 Services)
**Nhiệm vụ**: Viết Business Logic Layer

| Service | LOC | Trách nhiệm | Thời gian |
|:---|:---:|:---|:---:|
| `AuthService.cs` | 842 | JWT Generation, BCrypt Hash, Token Rotation | 8h |
| `UserService.cs` | 298 | Profile Management, Body Metrics | 4h |
| `MealDiaryService.cs` | 445 | Meal CRUD, Validation | 5h |
| `FoodService.cs` | 178 | Food Search, Pagination | 3h |
| `UserFoodItemService.cs` | 223 | Custom Food CRUD, Image Upload | 4h |
| `NutritionCalcService.cs` | 89 | Mifflin-St Jeor, Harris-Benedict | 3h |
| `NutritionInsightService.cs` | 758 | AI Nutrition Analysis, Adaptive Target | 10h |
| `RecipeSuggestionService.cs` | 478 | DB-based Recipe Matching | 6h |
| `AnalyticsService.cs` | 205 | Aggregate Stats, Charts Data | 4h |
| `AiFoodMapService.cs` | 148 | Vision Label → FoodItem Mapping | 3h |
| `VisionCacheService.cs` | 385 | Image Hash Caching, History | 5h |
| `VoiceProcessingService.cs` | 252 | Voice Command Parsing Logic | 4h |
| `StreakService.cs` | 108 | Daily Streak Calculation | 2h |
| `UserPreferenceService.cs` | 102 | Dietary Restrictions | 2h |
| `EmailService.cs` | 185 | SMTP Email Sending | 3h |
| `LookupCacheService.cs` | 128 | In-memory Reference Cache | 2h |
| `AiLogService.cs` | 35 | AI Activity Logger | 1h |
| `AIReviewService.cs` | 442 | AI Review CRUD | 5h |

**Tổng thời gian Services**: ~74 giờ

---

### 2.4. INFRASTRUCTURE & DEVOPS
**Nhiệm vụ**: Setup môi trường, bảo mật, logging

| Task | Chi tiết | Thời gian |
|:---|:---|:---:|
| **Project Setup** | Khởi tạo .NET 9, Clean Architecture, DI | 4h |
| **CORS Config** | Allow Mobile access từ dynamic IPs | 2h |
| **JWT Authentication** | Setup middleware, claims, policies | 3h |
| **Entity Framework** | DbContext config, Migrations | 5h |
| **Global Error Handler** | Unified error response format | 2h |
| **Logging (Serilog)** | File & Console logging setup | 2h |
| **User Secrets** | Secure config management | 1h |
| **SQL Server Connection** | Connection string, retry policy | 1h |
| **API Documentation** | XML Comments cho Swagger | 3h |

**Tổng thời gian Infra**: ~23 giờ

---

### 2.5. BUG FIXES & OPTIMIZATION (Lê Chí Tường)

| Lỗi/Tối ưu | Mô tả | Thời gian fix |
|:---|:---|:---:|
| **UTF-8 Encoding Fix** | Convert 100+ files sang UTF-8 No BOM | 4h |
| **SQL Mojibake Recovery** | Fix ký tự lỗi trong database dump | 3h |
| **Token Expiry Bug** | Fix refresh token không tự động renew | 2h |
| **CORS Wildcard Issue** | Fix lỗi block request từ LAN | 1.5h |
| **EF Navigation Fix** | Fix lazy loading navigation properties | 2h |
| **Query Performance** | Index optimization for analytics queries | 3h |
| **Validation Enhancement** | Thêm model validation cho DTOs | 2h |

**Tổng thời gian Fix/Optimize**: ~17.5 giờ

---

### ✅ TỔNG KẾT LÊ CHÍ TƯỜNG
- **Tổng ước lượng giờ làm việc**: 213 giờ (~27 ngày làm việc)
- **Số file code chính**: 33 files (Controllers + Services)
- **Số dòng code (LOC)**: ~6,500 dòng C#
- **Số bảng Database**: 26 bảng + 4 Views

---

<a name="mobile-hieu"></a>
## 3. CHI TIẾT CÔNG VIỆC MOBILE & AI - ĐINH CÔNG HIẾU

### 3.1. MOBILE SCREENS (32 Screens)
**Nhiệm vụ**: Thiết kế và code toàn bộ giao diện ứng dụng

| Screen | File | LOC | Chức năng | Thời gian |
|:---|:---|:---:|:---|:---:|
| `WelcomeScreen` | `welcome.tsx` | 185 | Onboarding, Intro slides | 3h |
| `LoginScreen` | `login.tsx` | 245 | Email/Password + Google Auth | 4h |
| `RegisterScreen` | `register.tsx` | 312 | Đăng ký tài khoản | 5h |
| `OnboardingScreen` | `onboarding.tsx` | 428 | Setup profile, goals, activity | 8h |
| `HomeScreen` | `index.tsx` | 556 | Dashboard, Daily summary, Quick actions | 10h |
| `DiaryScreen` | `diary.tsx` | 489 | Timeline bữa ăn, CRUD meals | 9h |
| `AddMealScreen` | `add-meal.tsx` | 378 | Thêm bữa ăn, Search food | 7h |
| `FoodSearchScreen` | `food-search.tsx` | 412 | Search món, Filter, Pagination | 8h |
| `ProfileScreen` | `profile.tsx` | 324 | User info, Settings | 6h |
| `BodyMetricsScreen` | `body-metrics.tsx` | 298 | Nhập cân nặng, chiều cao | 5h |
| `WeightHistoryScreen` | `weight-history.tsx` | 267 | Biểu đồ cân nặng (VictoryChart) | 6h |
| `NutritionSettingsScreen` | `nutrition-settings.tsx` | 356 | Set targets, BMR calculation | 7h |
| `AIScanScreen` | `ai-scan.tsx` | 445 | Camera scan, YOLOv8 detect | 9h |
| `ScanResultScreen` | `scan-result.tsx` | 389 | Hiển thị kết quả AI Vision | 7h |
| `VoiceInputScreen` | `voice.tsx` | 512 | Record audio, STT, Parse | 10h |
| `RecipesScreen` | `recipes.tsx` | 334 | Danh sách công thức | 6h |
| `RecipeDetailScreen` | `recipe-detail.tsx` | 401 | Chi tiết công thức, instructions | 7h |
| `AnalyticsScreen` | `analytics.tsx` | 478 | Dashboard biểu đồ Macros | 9h |
| `WeeklyStatsScreen` | `weekly-stats.tsx` | 312 | Thống kê tuần | 6h |
| `MonthlyStatsScreen` | `monthly-stats.tsx` | 298 | Thống kê tháng | 5h |
| `StreakScreen` | `streak.tsx` | 256 | Gamification, Daily streak | 5h |
| `AchievementsScreen` | `achievements.tsx` | 234 | Huy hiệu, milestones | 5h |
| `UserFoodsScreen` | `user-foods.tsx` | 367 | Món tự tạo, CRUD | 7h |
| `CreateFoodScreen` | `create-food.tsx` | 412 | Form tạo món mới | 8h |
| `FavoritesScreen` | `favorites.tsx` | 289 | Danh sách yêu thích | 5h |
| `SettingsScreen` | `settings.tsx` | 345 | App settings, Preferences | 6h |
| `NotificationsScreen` | `notifications.tsx` | 223 | Push notification history | 4h |
| `HelpScreen` | `help.tsx` | 178 | FAQ, Support | 3h |
| `AboutScreen` | `about.tsx` | 145 | App info, Credits | 2h |
| + 3 screens khác | - | ~400 | Modal, Detail screens | 6h |

**Tổng thời gian Screens**: ~182 giờ

---

### 3.2. UI COMPONENTS (94+ Components)
**Nhiệm vụ**: Xây dựng thư viện component tái sử dụng

| Component | File | LOC | Thời gian |
|:---|:---|:---:|:---:|
| `Button.tsx` | button | 245 | 3h |
| `ThemedTextInput.tsx` | input | 178 | 2.5h |
| `Modal.tsx` | modal | 189 | 3h |
| `BottomSheet.tsx` | sheet | 198 | 3.5h |
| `SearchBar.tsx` | search | 167 | 2.5h |
| `Avatar.tsx` | avatar | 112 | 2h |
| `Chip.tsx` | chip | 156 | 2h |
| `FAB.tsx` | fab | 178 | 2.5h |
| `ProgressBar.tsx` | progress | 89 | 1.5h |
| `Skeleton.tsx` | skeleton | 134 | 2h |
| `EmptyState.tsx` | empty | 67 | 1h |
| `ErrorState.tsx` | error | 78 | 1h |
| `Loading.tsx` | loading | 45 | 0.5h |
| `VoiceInput.tsx` | voice-input | 289 | 5h |
| `SegmentedControl.tsx` | segmented | 189 | 3h |
| `Tabs.tsx` | tabs | 212 | 3.5h |
| `ListItem.tsx` | list-item | 178 | 2.5h |
| `Swipeable.tsx` | swipeable | 145 | 2.5h |
| `ActionSheet.tsx` | action-sheet | 201 | 3h |
| `Tooltip.tsx` | tooltip | 167 | 2.5h |
| **Charts (7 components)** | charts/* | ~800 | 15h |
| **AI Components (3)** | ai/* | ~450 | 9h |
| **auth Components (1)** | auth/* | ~120 | 2h |
| **Gamification (3)** | gamification/* | ~380 | 7h |
| **Stats Components (7)** | stats/* | ~890 | 16h |
| **UI Library (35 comps)** | ui/* | ~1,800 | 35h |
| **Skeletons (7)** | skeletons/* | ~420 | 8h |
| + Các component khác | - | ~500 | 10h |

**Tổng thời gian Components**: ~151 giờ

---

### 3.3. STATE MANAGEMENT (8 Zustand Stores)
**Nhiệm vụ**: Quản lý trạng thái toàn cục

| Store | File | LOC | Trách nhiệm | Thời gian |
|:---|:---|:---:|:---|:---:|
| `authStore.ts` | auth | 156 | User session, tokens | 3h |
| `diaryStore.ts` | diary | 234 | Meal diary state | 4h |
| `foodStore.ts` | food | 189 | Food items cache | 3h |
| `profileStore.ts` | profile | 178 | User profile, metrics | 3h |
| `aiStore.ts` | ai | 212 | AI Vision/Voice results | 4h |
| `analyticsStore.ts` | analytics | 167 | Charts data | 3h |
| `settingsStore.ts` | settings | 89 | App preferences | 2h |
| `notificationStore.ts` | notification | 123 | Push notifications | 2.5h |

**Tổng thời gian Stores**: ~24.5 giờ

---

### 3.4. API INTEGRATION SERVICES (20 Services)
**Nhiệm vụ**: Kết nối với Backend API

| Service | File | LOC | APIs handled | Thời gian |
|:---|:---|:---:|:---|:---:|
| `apiClient.ts` | api-client | 412 | Base Axios, Interceptors | 6h |
| `authSession.ts` | auth-session | 112 | Session management | 2h |
| `authTokens.ts` | auth-tokens | 34 | Token storage | 1h |
| `diaryService.ts` | diary | 223 | Meal CRUD APIs | 4h |
| `foodService.ts` | food | 298 | Food search, details | 5h |
| `profileService.ts` | profile | 157 | Profile, Body metrics | 3h |
| `aiService.ts` | ai | 389 | Vision, Voice, Recipe AI | 7h |
| `voiceService.ts` | voice | 245 | Voice processing | 4.5h |
| `analyticsService.ts` (TS) | analytics | 56 | Stats APIs | 1h |
| `summaryService.ts` | summary | 120 | Day/Week summary | 2h |
| `favoritesService.ts` | favorites | 78 | Favorites CRUD | 1.5h |
| `googleAuthService.ts` | google-auth | 312 | Google Sign-in flow | 5h |
| `healthService.ts` | health | 35 | Health check | 0.5h |
| `notificationService.ts` | notification | 298 | Push notification | 5h |
| `ipScanner.ts` | ip-scanner | 289 | Auto server discovery | 6h |
| `secureStore.ts` | secure-store | 167 | Encrypted storage | 3h |
| `errorTracking.ts` | error-tracking | 45 | Error logging | 1h |
| `shareService.ts` | share | 38 | Share functionality | 1h |
| `tokenService.ts` | token | 23 | Token helpers | 0.5h |
| `mealService.ts` | meal | 52 | Meal type utils | 1h |

**Tổng thời gian Services**: ~60 giờ

---

### 3.5. AI PROVIDER (Flask Python)
**Nhiệm vụ**: Xây dựng toàn bộ AI Backend

| Module/Function | LOC | Chức năng | Thời gian |
|:---|:---:|:---|:---:|
| **YOLOv8 Detection** | 120 | Load model, inference, post-process | 8h |
| **Whisper STT** | 85 | Audio transcription (Vietnamese) | 6h |
| **Ollama Integration** | 145 | Nutrition advice, recipe instructions | 10h |
| **Voice Parsing Logic** | 95 | Extract food, quantity, meal type | 7h |
| **GPU Auto-detection** | 45 | CUDA vs CPU selection | 3h |
| **Ollama Auto-start** | 38 | Background service startup | 2h |
| **File Validation** | 52 | Image/Audio format & size check | 2h |
| **Error Handling** | 68 | Robust error responses | 3h |
| **API Endpoints (6)** | 142 | `/detect`, `/transcribe`, etc. | 6h |

**Tổng LOC AI Provider**: ~510 dòng Python  
**Tổng thời gian AI Provider**: ~47 giờ

---

### 3.6. DESIGN & UX (Mobile UI)
**Nhiệm vụ**: Thiết kế visual, animations, theme

| Task | Chi tiết | Thời gian |
|:---|:---|:---:|
| **Glassmorphism Design System** | Colors, blur effects, opacity tokens | 10h |
| **Theme Configuration** | Light/Dark mode, color palettes | 6h |
| **Custom Fonts** | BeVietnamPro integration | 2h |
| **Icon Library** | Ionicons integration + custom icons | 3h |
| **Animation Springs** | React Native Animated, Reanimated | 8h |
| **Chart Styling** | VictoryChart themes, custom labels | 5h |
| **Responsive Layout** | Handle different screen sizes | 6h |
| **Accessibility** | Labels, contrast, touch targets | 4h |

**Tổng thời gian Design**: ~44 giờ

---

### 3.7. BUG FIXES & OPTIMIZATION (Đinh Công Hiếu)

| Lỗi/Tối ưu | Mô tả | Thời gian |
|:---|:---|:---:|
| **Android Border Fix** | Remove unexpected borders on Cards | 3h |
| **Voice Number Parsing** | Fix "sáu trăm" → 600 (not 60) | 4h |
| **ADB Connection Debug** | Device offline troubleshooting | 2h |
| **Keyboard Overlap** | Fix TextInput visibility issues | 2.5h |
| **Chart Performance** | Optimize VictoryChart re-renders | 3h |
| **Image Caching** | Implement expo-image caching | 2h |
| **Network Error Handling** | Retry logic, offline mode | 4h |
| **Memory Leaks** | Fix unmounted component setState | 3h |
| **Splash Screen** | Native splash configuration | 2h |
| **Deep Linking** | Handle notification deep links | 3.5h |

**Tổng thời gian Fix/Optimize**: ~29 giờ

---

### 3.8. TESTING & QA (Đinh Công Hiếu)

| Task | Chi tiết | Thời gian |
|:---|:---|:---:|
| **Manual Testing** | Test trên Android/iOS thực tế | 15h |
| **AI Model Testing** | Test 100+ món ăn Việt | 8h |
| **Voice Testing** | Test 50+ lệnh giọng nói | 6h |
| **Performance Profile** | React DevTools profiling | 4h |
| **Bug Documentation** | Ghi lại lỗi trong PLAN.md | 3h |

**Tổng thời gian Testing**: ~36 giờ

---

### ✅ TỔNG KẾT ĐINH CÔNG HIẾU
- **Tổng ước lượng giờ làm việc**: 573.5 giờ (~72 ngày làm việc)
- **Số file code Mobile**: ~126 files (Screens + Components + Services)
- **Số dòng code (LOC)**: ~18,000 dòng TypeScript/TSX
- **Số dòng AI Provider**: ~510 dòng Python

---

<a name="timeline"></a>
## 4. TIMELINE CHI TIẾT 65 NGÀY (17/10 - 21/12)

### Tuần 1-2: Khởi tạo & Thiết kế (17/10 - 30/10)
| Ngày | Lê Chí Tường | Đinh Công Hiếu |
|:---|:---|:---|
| 17/10 | Setup .NET project, Git repo | Setup Expo project, folder structure |
| 18/10 | Thiết kế ERD sơ bộ (15 bảng) | Mockup Figma: Login, Home, Profile |
| 19/10 | Viết migration cho Users, FoodItems | Setup Navigation (Stack, Tab) |
| 20/10 | Code AuthController (Register, Login) | Code LoginScreen, RegisterScreen |
| 21-22/10 | Viết AuthService (JWT, BCrypt) | Theme setup, Glassmorphism library |
| 23-24/10 | Setup CORS, Swagger docs | Code HomeScreen cơ bản |
| 25-27/10 | Thêm 8 bảng mới vào DB | Code Profile UI, Settings |
| 28-30/10 | API Food Search, Pagination | Tích hợp API Client, Auth flow |

### Tuần 3-4: Core Features (31/10 - 13/11)
| Ngày | Lê Chí Tường | Đinh Công Hiếu |
|:---|:---|:---|
| 31/10-02/11 | MealDiaryController, Service | DiaryScreen UI, Timeline |
| 03-05/11 | NutritionCalcService (BMR/TDEE) | NutritionSettingsScreen |
| 06-08/11 | UserFoodItemsController, Upload | UserFoodsScreen, CreateFoodScreen |
| 09-11/11 | AnalyticsService, SQL Views | WeightHistoryScreen + VictoryChart |
| 12-13/11 | FavoritesController | FavoritesScreen |

### Tuần 5-6: AI Integration (14/11 - 27/11)
| Ngày | Lê Chí Tường | Đinh Công Hiếu |
|:---|:---|:---|
| 14-16/11 | AIController skeleton | Setup Flask, YOLOv8 model |
| 17-19/11 | Vision API proxy logic | AIScanScreen, Camera integration |
| 20-22/11 | VisionCacheService | ScanResultScreen, Result display |
| 23-25/11 | VoiceController | Setup Whisper, PhoWhisper config |
| 26-27/11 | Voice API proxy | VoiceInputScreen, Record UI |

### Tuần 7-8: AI Enhancement (28/11 - 11/12)
| Ngày | Lê Chí Tường | Đinh Công Hiếu |
|:---|:---|:---|
| 28-30/11 | RecipeSuggestionService | RecipesScreen, RecipeDetailScreen |
| 01-03/12 | NutritionInsightService | AnalyticsScreen, Dashboard charts |
| 04-06/12 | Optimize SQL queries | Ollama integration, Prompt engineering |
| 07-09/12 | AIReviewController | Voice parsing logic enhancement |
| 10-11/12 | Testing backend APIs | Testing AI models, accuracy tuning |

### Tuần 9-10: Polish & Documentation (12/12 - 21/12)
| Ngày | Lê Chí Tường | Đinh Công Hiếu |
|:---|:---|:---|
| 12-14/12 | Fix UTF-8 encoding issues | Fix Android UI borders |
| 15-16/12 | Database optimization | Fix voice number parsing |
| 17-18/12 | Viết API documentation | Performance optimization |
| 19/12 | Prepare SQL export | App testing on real devices |
| 20/12 | Review & final backend testing | Fix remaining bugs |
| 21/12 | Viết báo cáo, Slides | Recording demo video |

---

<a name="file-matrix"></a>
## 5. MA TRẬN TRÁCH NHIỆM CẤP ĐỘ FILE

### BACKEND FILES (.NET) - 100% LÊ CHÍ TƯỜNG
```
eatfitai-backend/
├── Controllers/ (15 files, ~2,963 LOC) ✓ Tường
├── Services/ (18 files, ~4,158 LOC) ✓ Tường
├── DTOs/ (25 files, ~1,200 LOC) ✓ Tường
├── Models/ (26 files, ~1,500 LOC) ✓ Tường
├── DbScaffold/ (30 files, ~2,800 LOC) ✓ Tường
├── Migrations/ (40+ files) ✓ Tường
└── Program.cs, appsettings.json ✓ Tường
```

### MOBILE FILES (React Native) - 95% ĐINH CÔNG HIẾU
```
eatfitai-mobile/src/
├── app/screens/ (32 files, ~11,000 LOC) ✓ Hiếu
├── components/ (94 files, ~8,500 LOC) ✓ Hiếu
├── services/ (20 files, ~3,300 LOC) ✓ Hiếu
├── store/ (8 files, ~1,348 LOC) ✓ Hiếu
├── theme/ (5 files, ~600 LOC) ✓ Hiếu
├── types/ (13 files, ~800 LOC) ✓ Hiếu (5%) Tường
├── utils/ (3 files, ~400 LOC) ✓ Hiếu
└── config/ (2 files, ~150 LOC) ✓ Hiếu
```

### AI PROVIDER (Flask) - 100% ĐINH CÔNG HIẾU
```
ai-provider/
├── app.py (510 LOC) ✓ Hiếu
├── requirements.txt ✓ Hiếu
└── models/ (YOLOv8, Whisper) ✓ Hiếu
```

---

## 6. TỔNG KẾT CUỐI CÙNG

| Metric | Lê Chí Tường | Đinh Công Hiếu |
|:---|:---:|:---:|
| **Tổng giờ làm việc** | 213h (~27 ngày) | 573.5h (~72 ngày) |
| **% đóng góp theo giờ** | 27% | 73% |
| **Số file chính** | 33 files | 146 files |
| **Tổng dòng code** | ~6,500 LOC | ~18,510 LOC |
| **Chuyên môn** | Backend/Database/API | Mobile/AI/UX |
| **Công cụ chính** | .NET, SQL Server, C# | React Native, Flask, Python |

---

**Ghi chú**: Báo cáo này được tổng hợp từ phân tích Git history, cấu trúc file thực tế, và ước lượng dựa trên độ phức tạp kỹ thuật. Các con số thời gian là ước tính chuyên nghiệp cho từng loại task.
