# HIỆN TRẠNG TOÀN BỘ APP EATFITAI (SNAPSHOT CODE THỰC TẾ)

Cập nhật lần cuối: 2026-02-27  
Repo: `d:\EatFitAI_v1`  
Phương pháp: đọc source code FE/BE/AI/DB + chạy kiểm tra build hiện tại (`dotnet test`, `npm run typecheck`).

Errata `2026-04-16`:

- Tài liệu này có drift ở lane `voice`.
- Source of truth hiện tại là mobile voice đi qua backend proxy cho `POST /api/voice/transcribe` và `POST /api/voice/parse`.
- Khi test/review release, ưu tiên [24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md](/D:/EatFitAI_v1/docs/24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md) và code trong [voiceService.ts](/D:/EatFitAI_v1/eatfitai-mobile/src/services/voiceService.ts:129).

---

## 1) Mục đích tài liệu

Tài liệu này mô tả **trạng thái app hiện đang có trong code** theo 6 khía cạnh bạn yêu cầu:

1. Toàn bộ chức năng.
2. Công nghệ đang dùng.
3. Userflow (luồng người dùng).
4. Workflow kỹ thuật (luồng hệ thống).
5. UI/UX hiện tại.
6. Toàn cảnh hệ thống (mobile + backend + AI + SQL).

Lưu ý:

- Đây là tài liệu hiện trạng, **không phải kế hoạch tương lai**.
- Nội dung ưu tiên bám code thật trong các thư mục `eatfitai-mobile`, `eatfitai-backend`, `ai-provider`.

---

## 2) Tóm tắt điều hành (Executive Snapshot)

### 2.1 Ứng dụng hiện có gì

EatFitAI hiện là hệ thống local-first gồm 4 thành phần:

1. App mobile React Native/Expo (`eatfitai-mobile`): giao diện chính cho người dùng.
2. Backend .NET 9 Web API (`eatfitai-backend`): business logic, auth, diary, analytics, gateway AI.
3. AI Provider Python Flask (`ai-provider`): vision, nutrition LLM, voice parse/transcribe.
4. SQL Server local: lưu dữ liệu người dùng, bữa ăn, thực phẩm, mục tiêu dinh dưỡng.

### 2.2 Mức hoàn thiện hiện tại

1. Core tracking (auth, profile, diary, summary, stats) đã có đầy đủ endpoint và màn hình chính.
2. AI scan + AI nutrition + voice đã tích hợp vào app.
3. Hệ thống đã có nhiều cơ chế runtime local (IP discovery, token refresh queue, health check).

### 2.3 Điểm nghẽn lớn ở thời điểm hiện tại

1. Boundary chưa đồng nhất: voice trên mobile còn gọi trực tiếp AI provider (`:5050`) thay vì đi qua backend.
2. Auth Google chồng chéo: tồn tại 2 luồng, trong đó 1 luồng còn `NotImplementedException`.
3. FE có gọi `POST /api/profile/avatar` nhưng backend chưa có endpoint tương ứng.
4. Build health chưa xanh:
   - `dotnet test` fail do test setup/chữ ký constructor không khớp.
   - `npm run typecheck` fail nhiều lỗi TypeScript/module/dependency.
5. AI provider và script dữ liệu còn điểm kỹ thuật chưa cứng (broad `except`, hardcoded Roboflow API key).

---

## 3) Bản đồ kiến trúc tổng thể hiện tại

## 3.1 Topology runtime

1. Mobile gọi backend qua `API_BASE_URL` (port mặc định 5247).
2. Backend gọi SQL Server local qua `DefaultConnection`.
3. Backend gọi AI provider qua `AIProvider:VisionBaseUrl` (`http://127.0.0.1:5050`).
4. Riêng voice trên mobile hiện có nhánh gọi trực tiếp AI provider (`:5050`) cho STT/parse.

Sơ đồ thực tế:

- Core thường: `Mobile -> Backend -> SQL Server`
- AI chuẩn: `Mobile -> Backend -> AI Provider`
- AI voice hiện tại: `Mobile -> AI Provider` (transcribe/parse) + `Mobile -> Backend` (execute/confirm)

## 3.2 Discovery và kết nối local

1. Backend expose `GET /discovery` (trong `Program.cs`) để app nhận diện đúng server EatFitAI trong LAN.
2. Mobile có `ipScanner.ts`:
   - scan subnet phổ biến,
   - verify `/discovery`,
   - cache URL vào AsyncStorage,
   - cooldown/rescan khi network đổi.
3. `apiClient.ts` init theo thứ tự:
   - preload URL cache,
   - verify cache,
   - scan nếu cần,
   - fallback env URL.

---

## 4) Công nghệ đang dùng

## 4.1 Mobile (`eatfitai-mobile`)

### Nền tảng

1. Expo `^54.0.0`
2. React Native `0.81.5`
3. React `19.1.0`
4. TypeScript `~5.3.3`

### Thư viện chính

1. Điều hướng: `@react-navigation/native`, stack, bottom tabs.
2. State: `zustand`.
3. Data fetching/cache: `@tanstack/react-query`.
4. Form/validation: `react-hook-form`, `zod`.
5. Networking: `axios` + fetch (một số upload ảnh).
6. UI/animation: `react-native-reanimated`, `expo-linear-gradient`, glass components.
7. Media/AI input: `expo-camera`, `expo-image-picker`, `expo-av`, `expo-image-manipulator`.
8. Security/storage: `expo-secure-store`, AsyncStorage.
9. Notifications: `expo-notifications`.

### Font và theme

1. App load bộ font BeVietnamPro trong `App.tsx`.
2. Tab label đang dùng `Inter_600SemiBold` ở `AppTabs.tsx`.
3. `ThemeProvider` default mode đang là `'dark'`.

## 4.2 Backend (`eatfitai-backend`)

### Nền tảng

1. .NET `net9.0`
2. ASP.NET Core Web API
3. EF Core 9 (SQL Server + InMemory)

### Package chính

1. Auth: `Microsoft.AspNetCore.Authentication.JwtBearer`.
2. DB: `Microsoft.EntityFrameworkCore.SqlServer`, Tools.
3. Mapping: `AutoMapper`.
4. OpenAPI: `Swashbuckle.AspNetCore`.
5. Email: `Brevo Transactional Email API`.
6. Google sign-in verify token: `Google.Apis.Auth`.
7. Health check SQL: `AspNetCore.HealthChecks.SqlServer`.

### Cross-cutting hiện có

1. JWT authentication/authorization.
2. Rate limiting policies (`AuthPolicy`, `AIPolicy`, `GeneralPolicy`).
3. Health checks + endpoint liveness/readiness.
4. CORS policy cho local/dev.

## 4.3 AI Provider (`ai-provider`)

### Nền tảng

1. Python Flask.
2. Ultralytics YOLOv8.
3. OpenCV/Pillow.
4. Whisper + Transformers.
5. Gemini/Ollama integration trong module nutrition/voice.

### Package chính (`requirements.txt`)

1. `flask==3.0.3`
2. `ultralytics==8.3.234`
3. `opencv-python==4.10.0.84`
4. `google-generativeai==0.8.3`
5. `openai-whisper`
6. `transformers`

## 4.4 Database

1. SQL Server local.
2. Kết nối qua `DefaultConnection` trong `appsettings.json`.
3. Có 2 DbContext trong backend:
   - `EatFitAIDbContext`
   - `ApplicationDbContext`

---

## 5) Inventory chức năng toàn bộ app (theo module)

## 5.1 Auth & Account

### FE màn hình

1. `WelcomeScreen`
2. `LoginScreen`
3. `RegisterScreen`
4. `VerifyEmailScreen`
5. `ForgotPasswordScreen`
6. `OnboardingScreen`

### BE endpoint

1. `POST /api/auth/register`
2. `POST /api/auth/register-with-verification`
3. `POST /api/auth/verify-email`
4. `POST /api/auth/resend-verification`
5. `POST /api/auth/login`
6. `POST /api/auth/logout`
7. `POST /api/auth/refresh`
8. `POST /api/auth/forgot-password`
9. `POST /api/auth/reset-password`
10. `POST /api/auth/change-password`
11. `POST /api/auth/mark-onboarding-completed`
12. `GET /api/auth/google` (legacy)
13. `POST /api/auth/google/signin`
14. `POST /api/auth/google/link`

### Trạng thái hiện tại

1. Có đầy đủ auth thường + email verification + refresh token.
2. Có Google signin riêng qua `GoogleAuthController`.
3. Tồn tại nhánh Google legacy gọi `AuthService.GoogleLoginAsync` nhưng method này throw `NotImplementedException`.

## 5.2 Hồ sơ người dùng & cơ thể

### FE màn hình

1. `ProfileScreen`
2. `EditProfileScreen`
3. `BodyMetricsScreen`
4. `GoalSettingsScreen`
5. `WeightHistoryScreen`
6. `ChangePasswordScreen`
7. `NotificationsScreen`
8. `AboutScreen`

### BE endpoint

1. `GET /api/profile`
2. `PUT /api/profile`
3. `DELETE /api/profile`
4. `POST /api/body-metrics`
5. `GET /api/body-metrics/history`

### Trạng thái hiện tại

1. Luồng xem/sửa profile hoạt động qua store/service.
2. Có API xóa tài khoản ở backend.
3. UI profile hiện chưa có thao tác xóa tài khoản.
4. FE có hàm upload avatar (`POST /api/profile/avatar`) nhưng backend chưa có endpoint này.

## 5.3 Thực phẩm, món cá nhân, nhật ký bữa ăn

### FE màn hình

1. `FoodSearchScreen`
2. `FoodDetailScreen`
3. `CustomDishScreen`
4. `MealDiaryScreen`
5. Home quick actions + smart add sheet

### BE endpoint liên quan food/diary

1. `GET /api/search`
2. `GET /api/food/search`
3. `GET /api/food/search-all`
4. `GET /api/{id:int}`
5. `GET /api/food/{id:int}`
6. `POST /api/custom-dishes`
7. `GET /api/meal-diary`
8. `GET /api/meal-diary/{id}`
9. `POST /api/meal-diary`
10. `PUT /api/meal-diary/{id}`
11. `DELETE /api/meal-diary/{id}`
12. `GET /api/user-food-items`
13. `GET /api/user-food-items/{id}`
14. `POST /api/user-food-items`
15. `PUT /api/user-food-items/{id}`
16. `DELETE /api/user-food-items/{id}`

### Trạng thái hiện tại

1. Chức năng diary CRUD đầy đủ theo ngày/bữa/món.
2. Có hỗ trợ món cá nhân user tạo.
3. Có yêu thích và gần đây qua các service liên quan.
4. `mealService.ts` còn dòng legacy gọi `GET /api/meals` (không thấy endpoint backend tương ứng); trong khi `diaryService.ts` dùng đúng `/api/meal-diary`.

## 5.4 Favorites / gần đây / tiện ích ghi nhanh

### FE

1. `FavoritesList` component xuất hiện ở Home.
2. Smart quick actions + SmartAddSheet.

### BE endpoint

1. `GET /api/favorites`
2. `POST /api/favorites` (toggle)
3. `GET /api/favorites/check/{foodId}`

### Trạng thái hiện tại

1. Flow favorites có đủ list/toggle/check.
2. Luồng recent xuất hiện ở logic diary/home nhưng mức độ hiển thị phụ thuộc screen/component.

## 5.5 AI Vision (scan ảnh)

### FE màn hình

1. `AIScanScreen`
2. `AddMealFromVisionScreen`
3. `VisionHistoryScreen`
4. `RecipeSuggestionsScreen`
5. `RecipeDetailScreen`

### BE endpoint

1. `POST /api/ai/vision/detect`
2. `POST /api/ai/recipes/suggest`
3. `GET /api/ai/recipes/{recipeId}`
4. `POST /api/ai/vision/history`
5. `GET /api/ai/vision/unmapped-stats`
6. `GET /api/ai/vision/suggest-mapping/{label}`
7. `POST /api/ai/labels/teach`
8. `POST /api/ai/cooking-instructions`

### AI Provider endpoint

1. `POST /detect`
2. `POST /cooking-instructions`

### Trạng thái hiện tại

1. Scan flow có camera + gallery + nén ảnh + detect + edit + add to diary.
2. Có cơ chế unmapped labels và teach label để cải thiện map AI-food.
3. Có lịch sử detect và gợi ý công thức.

## 5.6 AI Nutrition

### FE màn hình

1. `NutritionInsightsScreen`
2. `NutritionSettingsScreen`
3. Một phần onboarding step cuối gọi recalculate

### BE endpoint

1. `GET /api/ai/nutrition-targets/current`
2. `POST /api/ai/nutrition/recalculate`
3. `POST /api/ai/nutrition/insights`
4. `POST /api/ai/nutrition/adaptive-target`
5. `POST /api/ai/nutrition/apply-target`
6. `POST /api/ai/nutrition/suggest` (NutritionController)
7. `POST /api/ai/nutrition/apply`
8. `GET /api/ai/nutrition/current`

### AI Provider endpoint

1. `POST /nutrition-advice`
2. `POST /meal-insight`

### Trạng thái hiện tại

1. Có cả nhánh AIController và NutritionController (2 cụm route cùng domain nutrition).
2. Onboarding bước cuối phụ thuộc call AI recalculate.
3. Khi AI unavailable, onboarding hiện báo lỗi kết nối AI (chưa thấy fallback local-formula ngay tại FE onboarding).

## 5.7 Voice Assistant

### FE màn hình và store

1. `VoiceScreen` (full-screen voice assistant UI).
2. `useVoiceStore` điều phối parse/execute/confirm.
3. `useVoiceRecognition` ghi âm.

### FE service

1. `voiceService.transcribeAudio`: gọi trực tiếp `http://<ip>:5050/voice/transcribe`.
2. `voiceService.parseWithOllama`: gọi trực tiếp `http://<ip>:5050/voice/parse`.
3. `voiceService.executeCommand`: gọi backend `/api/voice/execute`.
4. `voiceService.confirmWeight`: gọi backend `/api/voice/confirm-weight`.

### BE endpoint

1. `POST /api/voice/process`
2. `GET /api/voice/commands`
3. `POST /api/voice/execute`
4. `POST /api/voice/confirm-weight`

### AI Provider endpoint

1. `POST /voice/parse`
2. `POST /voice/transcribe`

### Trạng thái hiện tại

1. Tính năng voice đã usable: record -> parse -> execute.
2. Boundary chưa đồng nhất do mobile gọi trực tiếp AI provider cho transcribe/parse.
3. Backend có `/api/voice/process` nhưng FE flow chính đang không dùng route này.

## 5.8 Thống kê, analytics, gamification

### FE màn hình

1. `StatsScreen` (tab con Today/Week/Month trong cùng screen).
2. `WeekStatsScreen`, `MonthStatsScreen`.
3. `AchievementsScreen`.
4. Home có streak card.

### BE endpoint

1. `GET /api/summary/day`
2. `GET /api/summary/week`
3. `GET /api/analytics/nutrition-summary`
4. `GET /api/ai-review/check-trigger`
5. `GET /api/ai-review/weekly`
6. `POST /api/ai-review/apply-suggestions`

### Trạng thái hiện tại

1. Daily/weekly summary hoạt động.
2. AI review weekly đã có endpoint.
3. `apply-suggestions` còn TODO auto-apply logic trong controller.

## 5.9 Health, preference, hệ thống phụ trợ

### Endpoint

1. `GET /api/health`
2. `GET /api/health/live`
3. `GET /api/health/ready`
4. `GET /api/user-preference`
5. `POST /api/user-preference`

### Trạng thái hiện tại

1. Có health endpoint để app ping server.
2. HomeScreen dùng health ping để xác định server up/down trạng thái UI.

---

## 6) Userflow hiện tại (luồng người dùng)

## 6.1 Luồng vào app và xác thực

1. User mở app -> `AppNavigator` kiểm tra trạng thái auth trong store.
2. Nếu chưa auth -> vào cụm auth (`Welcome`, `Login`, `Register`, `VerifyEmail`, `ForgotPassword`).
3. Login thành công -> lưu access/refresh token -> vào `AppTabs`.
4. Nếu account chưa onboarding -> chuyển `OnboardingScreen`.

## 6.2 Luồng onboarding

1. User nhập thông tin cơ bản + cơ thể + mục tiêu + activity.
2. Bước cuối gọi `POST /api/ai/nutrition/recalculate`.
3. Nếu thành công -> lưu profile/target + mark onboarding complete.
4. Nếu AI không sẵn sàng -> hiện toast lỗi "AI Provider không khả dụng".

## 6.3 Luồng ghi bữa ăn thủ công

1. Từ Home hoặc tab phù hợp, user vào `FoodSearch`.
2. Chọn food/custom dish -> vào `FoodDetail`.
3. Nhập gram/portion và meal type.
4. App gọi API lưu diary (`/api/meal-diary`).
5. Query cache invalidation -> Home/Diary/Stats cập nhật.

## 6.4 Luồng scan AI ảnh

1. User mở `AIScanScreen`.
2. Chụp ảnh hoặc chọn ảnh thư viện.
3. App nén ảnh (`expo-image-manipulator`) trước khi gửi.
4. Gọi detect qua `aiService`.
5. Hiển thị danh sách item nhận diện + confidence.
6. User có thể:
   - chỉnh nhanh item,
   - thêm vào giỏ nguyên liệu,
   - chuyển `AddMealFromVision` để lưu diary.

## 6.5 Luồng voice assistant

1. User mở `VoiceScreen`.
2. Nhấn mic, ghi âm.
3. `transcribeAudio` gọi AI provider trực tiếp.
4. `parseWithOllama` gọi AI provider trực tiếp.
5. `executeCommand` gọi backend để ghi bữa/cân nặng hoặc trả lời calories.
6. Nếu cần xác nhận cân nặng -> `confirmWeight` gọi backend.

## 6.6 Luồng xem thống kê

1. User vào tab Stats.
2. Chuyển nhanh day/week/month ngay trong `StatsScreen`.
3. App gọi summary/analytics endpoint tương ứng.
4. Hiển thị progress calories/macro và biểu đồ.

## 6.7 Luồng hồ sơ

1. User vào tab Profile.
2. Xem hero profile + chỉ số nhanh.
3. Điều hướng sang các màn hình con để cập nhật info, body metric, goal, password, notifications.
4. Logout qua action trong Profile.

---

## 7) Workflow kỹ thuật hiện tại (luồng hệ thống)

## 7.1 Khởi động mobile và tìm backend

1. `initializeApiClient()` chạy khi app bootstrap.
2. Ưu tiên URL đã cache và verify qua `/discovery`.
3. Nếu cache hỏng -> scan LAN subnet phổ biến.
4. Nếu không scan ra -> fallback env URL.

## 7.2 Gửi request và quản lý token

1. Request interceptor tự đính kèm `Authorization: Bearer <accessToken>`.
2. Nếu 401:
   - lock refresh queue,
   - gọi `POST /api/auth/refresh`,
   - cập nhật token mới,
   - retry request chờ trong queue.
3. Nếu refresh fail:
   - clear token,
   - trigger callback auth expired -> logout về login.

## 7.3 Network failure và rescan

1. Khi gặp network error, interceptor có cơ chế retry + rescan backend URL (có cooldown).
2. Mục tiêu: giảm lỗi do đổi IP local server.

## 7.4 Workflow backend request pipeline

1. Middleware cơ bản: exception handling + swagger + CORS.
2. Auth middleware: `UseAuthentication` -> `UseAuthorization`.
3. Rate limiter áp theo policy endpoint.
4. Controller xử lý request -> Service -> Repository/DbContext.
5. Với AI endpoints: backend gọi HTTP sang AI provider base URL.

## 7.5 Workflow AI provider

1. Flask app khởi tạo model vision YOLO khi start.
2. `start_ollama_if_needed()` được gọi ở giai đoạn import để cố gắng đảm bảo Ollama service sẵn sàng.
3. Endpoint nhận ảnh/text/audio và trả JSON cho backend/mobile.
4. Có nhiều `except:` broad catch để tránh crash runtime, nhưng giảm tính minh bạch lỗi.

---

## 8) UI/UX hiện tại (chi tiết theo sản phẩm)

## 8.1 Cấu trúc điều hướng

### Bottom tabs

1. `HomeTab`
2. `AIScanTab`
3. `VoiceTab`
4. `StatsTab`
5. `ProfileTab`

### Stack screens (ngoài tab)

1. Toàn bộ auth flow.
2. Toàn bộ diary flow (search/detail/custom/meal diary).
3. Toàn bộ AI flow (camera, add from vision, history, recipe, nutrition).
4. Toàn bộ profile settings flow.
5. Achievements/gamification.

## 8.2 Ngôn ngữ và cảm giác giao diện

1. UI tiếng Việt là chính.
2. Thiết kế theo xu hướng gradient + glassmorphism + animation.
3. Dark mode mặc định từ ThemeProvider.
4. Có nhiều feedback tương tác: toast, haptics, animation trạng thái.

## 8.3 Điểm mạnh UX hiện tại

1. Nhiều điểm vào để log bữa ăn (search, AI scan, voice).
2. Home tổng hợp được nhiều thông tin trong 1 màn hình.
3. Voice screen có trạng thái rõ: listening, parsing, executing, success/error.
4. Profile dạng menu giúp điều hướng settings dễ hơn.

## 8.4 Điểm UX cần chú ý theo hiện trạng code

1. Dòng chảy dữ liệu AI chưa nhất quán (voice đi tắt AI provider) làm tăng độ phức tạp khi debug.
2. Một số route/service legacy còn tồn tại (`/api/meals`) có thể gây hành vi không đồng nhất.
3. Onboarding phụ thuộc AI ở bước cuối có thể làm user kẹt khi AI local không sẵn sàng.
4. Avatar upload chưa hoàn chỉnh vì FE gọi endpoint chưa tồn tại ở backend.

---

## 9) Backend API inventory (toàn bộ endpoint hiện có)

## 9.1 Auth

1. `POST /api/auth/forgot-password`
2. `POST /api/auth/reset-password`
3. `POST /api/auth/register`
4. `POST /api/auth/register-with-verification`
5. `POST /api/auth/verify-email`
6. `POST /api/auth/resend-verification`
7. `POST /api/auth/mark-onboarding-completed`
8. `POST /api/auth/login`
9. `POST /api/auth/logout`
10. `POST /api/auth/refresh`
11. `GET /api/auth/google` (legacy)
12. `POST /api/auth/change-password`
13. `POST /api/auth/google/signin`
14. `POST /api/auth/google/link`

## 9.2 User/Profile

1. `GET /api/profile`
2. `PUT /api/profile`
3. `POST /api/body-metrics`
4. `GET /api/body-metrics/history`
5. `DELETE /api/profile`

## 9.3 Food/Diary/Favorites

1. `GET /api/search`
2. `GET /api/food/search`
3. `GET /api/food/search-all`
4. `GET /api/{id:int}`
5. `GET /api/food/{id:int}`
6. `POST /api/custom-dishes`
7. `GET /api/meal-diary`
8. `GET /api/meal-diary/{id}`
9. `POST /api/meal-diary`
10. `PUT /api/meal-diary/{id}`
11. `DELETE /api/meal-diary/{id}`
12. `GET /api/user-food-items`
13. `GET /api/user-food-items/{id}`
14. `POST /api/user-food-items`
15. `PUT /api/user-food-items/{id}`
16. `DELETE /api/user-food-items/{id}`
17. `GET /api/favorites`
18. `POST /api/favorites`
19. `GET /api/favorites/check/{foodId}`

## 9.4 AI + Voice + Analytics + Health

1. `POST /api/ai/vision/detect`
2. `POST /api/ai/recipes/suggest`
3. `GET /api/ai/recipes/{recipeId}`
4. `GET /api/ai/nutrition-targets/current`
5. `POST /api/ai/nutrition/recalculate`
6. `POST /api/ai/nutrition/insights`
7. `POST /api/ai/nutrition/adaptive-target`
8. `POST /api/ai/nutrition/apply-target`
9. `POST /api/ai/vision/history`
10. `GET /api/ai/vision/unmapped-stats`
11. `GET /api/ai/vision/suggest-mapping/{label}`
12. `POST /api/ai/cooking-instructions`
13. `POST /api/ai/labels/teach`
14. `POST /api/ai/nutrition/suggest`
15. `POST /api/ai/nutrition/apply`
16. `GET /api/ai/nutrition/current`
17. `POST /api/voice/process`
18. `GET /api/voice/commands`
19. `POST /api/voice/execute`
20. `POST /api/voice/confirm-weight`
21. `GET /api/summary/day`
22. `GET /api/summary/week`
23. `GET /api/analytics/nutrition-summary`
24. `GET /api/ai-review/check-trigger`
25. `GET /api/ai-review/weekly`
26. `POST /api/ai-review/apply-suggestions`
27. `GET /api/health`
28. `GET /api/health/live`
29. `GET /api/health/ready`
30. `GET /api/user-preference`
31. `POST /api/user-preference`

---

## 10) AI provider inventory hiện tại

## 10.1 Endpoint Flask

1. `GET /`
2. `GET /healthz`
3. `POST /detect`
4. `POST /nutrition-advice`
5. `POST /meal-insight`
6. `POST /cooking-instructions`
7. `POST /voice/parse`
8. `POST /voice/transcribe`

## 10.2 Năng lực AI hiện có trong code

1. Vision detection bằng YOLO (ưu tiên model local `best.pt`, fallback `yolov8s.pt`).
2. Nutrition advice với ưu tiên Ollama local, fallback cloud/formula tùy module.
3. Meal insight bằng LLM.
4. Voice parse + STT qua endpoint riêng.

## 10.3 Điểm kỹ thuật cần lưu ý

1. Có startup side-effect gọi `start_ollama_if_needed()` khi import app.
2. Nhiều `except:` broad catch ở `app.py` và `nutrition_llm.py`.
3. `download_dataset.py` đang hardcode Roboflow API key.

---

## 11) Database hiện trạng

## 11.1 Context và miền dữ liệu

### `EatFitAIDbContext` có các DbSet chính

1. `Users`
2. `FoodItems`
3. `MealDiaries`
4. `NutritionTargets`
5. `BodyMetrics`
6. `UserFoodItems`
7. `UserFavoriteFoods`
8. `UserRecentFoods`
9. `Recipes`, `RecipeIngredients`
10. `ServingUnits`, `FoodServings`
11. `AILogs`, `AISuggestions`, `ImageDetections`
12. Nhiều view tổng hợp: daily/weekly/monthly/target progress

### `ApplicationDbContext` bổ sung

1. Giữ phần lớn DbSet tương tự scaffold context.
2. Bổ sung `AiLabelMaps`, `UserPreferences`.

## 11.2 Migration và credibility

1. Có migration `AddCredibilityFields` trong nhánh `Migrations/EatFitAIDb`.
2. Model `FoodItem` scaffold có các field credibility (`Source`, `IsVerified`, `VerifiedBy`, `UpdatedAt`).

## 11.3 Rủi ro thiết kế DB ở thời điểm hiện tại

1. Dùng song song 2 DbContext làm tăng nguy cơ drift schema/domain mapping.
2. Một số model giữa `Models/*` và `DbScaffold/Models/*` chưa hoàn toàn đồng nhất (ví dụ khác biệt trường avatar trong `User`).

---

## 12) Chất lượng kỹ thuật hiện tại (build/test/type)

## 12.1 Kết quả `dotnet test EatFitAI_v1.sln` (chạy ngày 2026-02-27)

1. Kết quả: **Fail**.
2. Lỗi chính: test `AuthServiceTests` không khớp constructor mới của `AuthService` (thiếu dependency `ILogger<AuthService>`).
3. Có warning về async không `await` ở một số service/controller.
4. Có warning MSBuild về `BaseIntermediateOutputPath` trong test project.

## 12.2 Kết quả `npm run typecheck` (mobile, chạy ngày 2026-02-27)

1. Kết quả: **Fail**.
2. Lỗi chính gồm:
   - `TS6046` liên quan option `--module` từ `expo/tsconfig.base.json` với TS hiện tại.
   - Thiếu module `../src/hooks/useListSkeleton` trong test file.
   - Thiếu module/type `expo-image-manipulator` (dù dependency có trong package).
   - Mismatch kiểu payload ở `FoodDetailScreen` khi gọi add diary từ user food item.
   - `aiService.ts`: `string | undefined` không gán được vào `string`.
   - `notificationService.ts`: object có thể `null`.

## 12.3 Ý nghĩa thực tế

1. Hệ thống đang chạy được ở mức dev feature, nhưng baseline CI chất lượng chưa ổn định.
2. Muốn tăng độ tin cậy cho demo/bảo vệ cần chốt lại test health trước.

---

## 13) Bảo mật và riêng tư dữ liệu (hiện trạng)

## 13.1 Điểm tốt đang có

1. Dùng JWT access + refresh token.
2. Có lưu token bảo mật ở mobile (`expo-secure-store` + memory cache).
3. Backend có auth middleware, authorization, rate limiting, health checks.
4. Appsettings đã dùng placeholder cho JWT key và SMTP password (`REPLACE_WITH_USER_SECRET`).

## 13.2 Điểm yếu/cần xử lý

1. Script dataset hardcode API key (`download_dataset.py`).
2. Tồn tại nhánh validate token trong service bỏ `issuer/audience`.
3. Error contract chưa đồng nhất hoàn toàn, nhiều chỗ vẫn trả `ex.Message` trực tiếp.
4. Boundary voice chưa chuẩn làm mở rộng bề mặt cấu hình mạng/port.

---

## 14) Độ khớp giữa báo cáo đồ án và code hiện tại

## 14.1 Phần khớp tốt

1. Có đủ các module chính: auth, profile, diary, food, stats, AI vision, AI nutrition, voice.
2. Kiến trúc đa tầng FE/BE/AI/DB đã triển khai thực tế.
3. Có endpoint health, analytics, summary, favorites, user food.

## 14.2 Phần lệch/không đồng nhất cần lưu ý khi viết báo cáo

1. Báo cáo ghi kiến trúc "mobile -> backend -> AI" nhưng thực tế voice còn gọi AI trực tiếp.
2. Báo cáo có thể mô tả Google auth thống nhất, nhưng code còn nhánh legacy chưa hoàn chỉnh.
3. Báo cáo có thể coi build health ổn, nhưng thực tế test/typecheck đang fail.
4. Báo cáo nói upload avatar nếu đưa vào phần chức năng chính thì cần ghi rõ trạng thái backend chưa có endpoint tương ứng.

---

## 15) Danh sách vấn đề hiện trạng quan trọng (ưu tiên)

## 15.1 Mức Blocker/High

1. `AuthService.GoogleLoginAsync` chưa implement nhưng route legacy vẫn tồn tại.
2. Voice còn đi tắt mobile -> AI provider cho parse/transcribe.
3. Typecheck mobile fail.
4. Dotnet test fail.
5. Hardcoded key trong script dataset.

## 15.2 Mức Medium

1. 2 DbContext song song -> nguy cơ drift.
2. Chưa đồng nhất hoàn toàn error envelope.
3. Onboarding phụ thuộc AI, fallback UX chưa thật sự mềm.
4. Service legacy (`/api/meals`) có thể gây nhầm lẫn.

---

## 16) Kết luận hiện trạng app

EatFitAI hiện đã có nền tảng sản phẩm tương đối đầy đủ về mặt tính năng cho một đồ án tốt nghiệp có AI:

1. Có đầy đủ core flow theo dõi dinh dưỡng và sức khỏe.
2. Có 3 kênh input bữa ăn: manual, scan ảnh, voice.
3. Có AI nutrition và analytics hỗ trợ cá nhân hóa.
4. Có kiến trúc local-first phù hợp bối cảnh demo đồ án.

Tuy nhiên, để app đạt mức "uy tín kỹ thuật cao" trong bảo vệ, hiện trạng code cho thấy cần xử lý dứt điểm các điểm sau trước:

1. Chuẩn hóa boundary mobile-backend-AI (đặc biệt voice).
2. Dọn chồng chéo auth Google và route legacy.
3. Đưa build health về trạng thái xanh (`dotnet test`, `npm run typecheck`).
4. Loại bỏ hardcoded secret và chuẩn hóa lỗi trả về.

---

## 17) Phụ lục: file chính đã kiểm tra

### Mobile

1. `eatfitai-mobile/src/app/navigation/AppNavigator.tsx`
2. `eatfitai-mobile/src/app/navigation/AppTabs.tsx`
3. `eatfitai-mobile/src/app/screens/**/*`
4. `eatfitai-mobile/src/services/apiClient.ts`
5. `eatfitai-mobile/src/services/ipScanner.ts`
6. `eatfitai-mobile/src/services/voiceService.ts`
7. `eatfitai-mobile/src/services/profileService.ts`
8. `eatfitai-mobile/src/services/mealService.ts`
9. `eatfitai-mobile/src/config/env.ts`
10. `eatfitai-mobile/src/theme/ThemeProvider.tsx`

### Backend

1. `eatfitai-backend/Program.cs`
2. `eatfitai-backend/Controllers/*`
3. `eatfitai-backend/Services/*`
4. `eatfitai-backend/DbScaffold/Data/EatFitAIDbContext.cs`
5. `eatfitai-backend/Data/ApplicationDbContext.cs`
6. `eatfitai-backend/Migrations/EatFitAIDb/20260129114105_AddCredibilityFields.cs`
7. `eatfitai-backend/appsettings.json`

### AI Provider

1. `ai-provider/app.py`
2. `ai-provider/nutrition_llm.py`
3. `ai-provider/download_dataset.py`
4. `ai-provider/requirements.txt`

---

## 18) Trạng thái sử dụng tài liệu này

Bạn có thể dùng trực tiếp tài liệu này cho:

1. Chương "Nội dung thực hiện" (mục hiện trạng hệ thống).
2. Chương "Hạn chế của đề tài" (nêu đúng điểm nghẽn thực tế).
3. Slide bảo vệ (1-2 slide snapshot kỹ thuật + 1 slide risk).

