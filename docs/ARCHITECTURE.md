# Hi?n tr?ng to�n b? app EatFitAI (Snapshot code th?c t?)

Cập nhật lần cuối: `2026-04-18`
Phuong ph�p: d?c source code FE/BE/AI/DB + ch?y ki?m tra build hi?n t?i (`dotnet test`, `npm run typecheck`).

Errata `2026-04-18`:

- T�i li?u n�y c� drift ? lane `voice`.
- Source of truth hi?n t?i l� mobile voice di qua backend proxy cho `POST /api/voice/transcribe` v� `POST /api/voice/parse`.
- Khi test/review release, uu ti�n [TESTING_AND_RELEASE.md](TESTING_AND_RELEASE.md) v� code trong `eatfitai-mobile/src/services/voiceService.ts`.

---

## 1) M?c d�ch t�i li?u

T�i li?u n�y m� t? **tr?ng th�i app hi?n dang c� trong code** theo 6 kh�a c?nh b?n y�u c?u:

1. To�n b? ch?c nang.
2. C�ng ngh? dang d�ng.
3. Userflow (lu?ng ngu?i d�ng).
4. Workflow k? thu?t (lu?ng h? th?ng).
5. UI/UX hi?n t?i.
6. To�n c?nh h? th?ng (mobile + backend + AI + SQL).

Luu �:

- ��y l� t�i li?u hi?n tr?ng, **kh�ng ph?i k? ho?ch tuong lai**.
- N?i dung uu ti�n b�m code th?t trong c�c thu m?c `eatfitai-mobile`, `eatfitai-backend`, `ai-provider`.

---

## 2) T�m t?t di?u h�nh (Executive Snapshot)

### 2.1 ?ng d?ng hi?n c� g�

EatFitAI hi?n l� h? th?ng local-first g?m 4 th�nh ph?n:

1. App mobile React Native/Expo (`eatfitai-mobile`): giao di?n ch�nh cho ngu?i d�ng.
2. Backend .NET 9 Web API (`eatfitai-backend`): business logic, auth, diary, analytics, gateway AI.
3. AI Provider Python Flask (`ai-provider`): vision, nutrition LLM, voice parse/transcribe.
4. SQL Server local: luu d? li?u ngu?i d�ng, b?a an, th?c ph?m, m?c ti�u dinh du?ng.

### 2.2 M?c ho�n thi?n hi?n t?i

1. Core tracking (auth, profile, diary, summary, stats) d� c� d?y d? endpoint v� m�n h�nh ch�nh.
2. AI scan + AI nutrition + voice d� t�ch h?p v�o app.
3. H? th?ng d� c� nhi?u co ch? runtime local (IP discovery, token refresh queue, health check).

### 2.3 �i?m ngh?n l?n ? th?i di?m hi?n t?i

1. Boundary chua d?ng nh?t: voice tr�n mobile c�n g?i tr?c ti?p AI provider (`:5050`) thay v� di qua backend.
2. Auth Google ch?ng ch�o: t?n t?i 2 lu?ng, trong d� 1 lu?ng c�n `NotImplementedException`.
3. FE c� g?i `POST /api/profile/avatar` nhung backend chua c� endpoint tuong ?ng.
4. Build health chua xanh:
   - `dotnet test` fail do test setup/ch? k� constructor kh�ng kh?p.
   - `npm run typecheck` fail nhi?u l?i TypeScript/module/dependency.
5. AI provider v� script d? li?u c�n di?m k? thu?t chua c?ng (broad `except`, hardcoded Roboflow API key).

---

## 3) B?n d? ki?n tr�c t?ng th? hi?n t?i

## 3.1 Topology runtime

1. Mobile g?i backend qua `API_BASE_URL` (port m?c d?nh 5247).
2. Backend g?i SQL Server local qua `DefaultConnection`.
3. Backend g?i AI provider qua `AIProvider:VisionBaseUrl` (`http://127.0.0.1:5050`).
4. Ri�ng voice tr�n mobile hi?n c� nh�nh g?i tr?c ti?p AI provider (`:5050`) cho STT/parse.

So d? th?c t?:

- Core thu?ng: `Mobile -> Backend -> SQL Server`
- AI chu?n: `Mobile -> Backend -> AI Provider`
- AI voice hi?n t?i: `Mobile -> AI Provider` (transcribe/parse) + `Mobile -> Backend` (execute/confirm)

## 3.2 Discovery v� k?t n?i local

1. Backend expose `GET /discovery` (trong `Program.cs`) d? app nh?n di?n d�ng server EatFitAI trong LAN.
2. Mobile c� `ipScanner.ts`:
   - scan subnet ph? bi?n,
   - verify `/discovery`,
   - cache URL v�o AsyncStorage,
   - cooldown/rescan khi network d?i.
3. `apiClient.ts` init theo th? t?:
   - preload URL cache,
   - verify cache,
   - scan n?u c?n,
   - fallback env URL.

---

## 4) C�ng ngh? dang d�ng

## 4.1 Mobile (`eatfitai-mobile`)

### N?n t?ng

1. Expo `^54.0.0`
2. React Native `0.81.5`
3. React `19.1.0`
4. TypeScript `~5.3.3`

### Thu vi?n ch�nh

1. �i?u hu?ng: `@react-navigation/native`, stack, bottom tabs.
2. State: `zustand`.
3. Data fetching/cache: `@tanstack/react-query`.
4. Form/validation: `react-hook-form`, `zod`.
5. Networking: `axios` + fetch (m?t s? upload ?nh).
6. UI/animation: `react-native-reanimated`, `expo-linear-gradient`, glass components.
7. Media/AI input: `expo-camera`, `expo-image-picker`, `expo-av`, `expo-image-manipulator`.
8. Security/storage: `expo-secure-store`, AsyncStorage.
9. Notifications: `expo-notifications`.

### Font v� theme

1. App load b? font BeVietnamPro trong `App.tsx`.
2. Tab label dang d�ng `Inter_600SemiBold` ? `AppTabs.tsx`.
3. `ThemeProvider` default mode dang l� `'dark'`.

## 4.2 Backend (`eatfitai-backend`)

### N?n t?ng

1. .NET `net9.0`
2. ASP.NET Core Web API
3. EF Core 9 (SQL Server + InMemory)

### Package ch�nh

1. Auth: `Microsoft.AspNetCore.Authentication.JwtBearer`.
2. DB: `Microsoft.EntityFrameworkCore.SqlServer`, Tools.
3. Mapping: `AutoMapper`.
4. OpenAPI: `Swashbuckle.AspNetCore`.
5. Email: `Brevo Transactional Email API`.
6. Google sign-in verify token: `Google.Apis.Auth`.
7. Health check SQL: `AspNetCore.HealthChecks.SqlServer`.

### Cross-cutting hi?n c�

1. JWT authentication/authorization.
2. Rate limiting policies (`AuthPolicy`, `AIPolicy`, `GeneralPolicy`).
3. Health checks + endpoint liveness/readiness.
4. CORS policy cho local/dev.

## 4.3 AI Provider (`ai-provider`)

### N?n t?ng

1. Python Flask.
2. Ultralytics YOLOv8.
3. OpenCV/Pillow.
4. Whisper + Transformers.
5. Gemini/Ollama integration trong module nutrition/voice.

### Package ch�nh (`requirements.txt`)

1. `flask==3.0.3`
2. `ultralytics==8.3.234`
3. `opencv-python==4.10.0.84`
4. `google-generativeai==0.8.3`
5. `openai-whisper`
6. `transformers`

## 4.4 Database

1. SQL Server local.
2. K?t n?i qua `DefaultConnection` trong `appsettings.json`.
3. C� 2 DbContext trong backend:
   - `EatFitAIDbContext`
   - `ApplicationDbContext`

---

## 5) Inventory ch?c nang to�n b? app (theo module)

## 5.1 Auth & Account

### FE m�n h�nh

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

### Tr?ng th�i hi?n t?i

1. C� d?y d? auth thu?ng + email verification + refresh token.
2. C� Google signin ri�ng qua `GoogleAuthController`.
3. T?n t?i nh�nh Google legacy g?i `AuthService.GoogleLoginAsync` nhung method n�y throw `NotImplementedException`.

## 5.2 H? so ngu?i d�ng & co th?

### FE m�n h�nh

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

### Tr?ng th�i hi?n t?i

1. Lu?ng xem/s?a profile ho?t d?ng qua store/service.
2. C� API x�a t�i kho?n ? backend.
3. UI profile hi?n chua c� thao t�c x�a t�i kho?n.
4. FE c� h�m upload avatar (`POST /api/profile/avatar`) nhung backend chua c� endpoint n�y.

## 5.3 Th?c ph?m, m�n c� nh�n, nh?t k� b?a an

### FE m�n h�nh

1. `FoodSearchScreen`
2. `FoodDetailScreen`
3. `CustomDishScreen`
4. `MealDiaryScreen`
5. Home quick actions + smart add sheet

### BE endpoint li�n quan food/diary

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

### Tr?ng th�i hi?n t?i

1. Ch?c nang diary CRUD d?y d? theo ng�y/b?a/m�n.
2. C� h? tr? m�n c� nh�n user t?o.
3. C� y�u th�ch v� g?n d�y qua c�c service li�n quan.
4. `mealService.ts` c�n d�ng legacy g?i `GET /api/meals` (kh�ng th?y endpoint backend tuong ?ng); trong khi `diaryService.ts` d�ng d�ng `/api/meal-diary`.

## 5.4 Favorites / g?n d�y / ti?n �ch ghi nhanh

### FE

1. `FavoritesList` component xu?t hi?n ? Home.
2. Smart quick actions + SmartAddSheet.

### BE endpoint

1. `GET /api/favorites`
2. `POST /api/favorites` (toggle)
3. `GET /api/favorites/check/{foodId}`

### Tr?ng th�i hi?n t?i

1. Flow favorites c� d? list/toggle/check.
2. Lu?ng recent xu?t hi?n ? logic diary/home nhung m?c d? hi?n th? ph? thu?c screen/component.

## 5.5 AI Vision (scan ?nh)

### FE m�n h�nh

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

### Tr?ng th�i hi?n t?i

1. Scan flow c� camera + gallery + n�n ?nh + detect + edit + add to diary.
2. C� co ch? unmapped labels v� teach label d? c?i thi?n map AI-food.
3. C� l?ch s? detect v� g?i � c�ng th?c.

## 5.6 AI Nutrition

### FE m�n h�nh

1. `NutritionInsightsScreen`
2. `NutritionSettingsScreen`
3. M?t ph?n onboarding step cu?i g?i recalculate

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

### Tr?ng th�i hi?n t?i

1. C� c? nh�nh AIController v� NutritionController (2 c?m route c�ng domain nutrition).
2. Onboarding bu?c cu?i ph? thu?c call AI recalculate.
3. Khi AI unavailable, onboarding hi?n b�o l?i k?t n?i AI (chua th?y fallback local-formula ngay t?i FE onboarding).

## 5.7 Voice Assistant

### FE m�n h�nh v� store

1. `VoiceScreen` (full-screen voice assistant UI).
2. `useVoiceStore` di?u ph?i parse/execute/confirm.
3. `useVoiceRecognition` ghi �m.

### FE service

1. `voiceService.transcribeAudio`: g?i tr?c ti?p `http://<ip>:5050/voice/transcribe`.
2. `voiceService.parseWithOllama`: g?i tr?c ti?p `http://<ip>:5050/voice/parse`.
3. `voiceService.executeCommand`: g?i backend `/api/voice/execute`.
4. `voiceService.confirmWeight`: g?i backend `/api/voice/confirm-weight`.

### BE endpoint

1. `POST /api/voice/process`
2. `GET /api/voice/commands`
3. `POST /api/voice/execute`
4. `POST /api/voice/confirm-weight`

### AI Provider endpoint

1. `POST /voice/parse`
2. `POST /voice/transcribe`

### Tr?ng th�i hi?n t?i

1. T�nh nang voice d� usable: record -> parse -> execute.
2. Boundary chua d?ng nh?t do mobile g?i tr?c ti?p AI provider cho transcribe/parse.
3. Backend c� `/api/voice/process` nhung FE flow ch�nh dang kh�ng d�ng route n�y.

## 5.8 Th?ng k�, analytics, gamification

### FE m�n h�nh

1. `StatsScreen` (tab con Today/Week/Month trong c�ng screen).
2. `WeekStatsScreen`, `MonthStatsScreen`.
3. `AchievementsScreen`.
4. Home c� streak card.

### BE endpoint

1. `GET /api/summary/day`
2. `GET /api/summary/week`
3. `GET /api/analytics/nutrition-summary`
4. `GET /api/ai-review/check-trigger`
5. `GET /api/ai-review/weekly`
6. `POST /api/ai-review/apply-suggestions`

### Tr?ng th�i hi?n t?i

1. Daily/weekly summary ho?t d?ng.
2. AI review weekly d� c� endpoint.
3. `apply-suggestions` c�n TODO auto-apply logic trong controller.

## 5.9 Health, preference, h? th?ng ph? tr?

### Endpoint

1. `GET /api/health`
2. `GET /api/health/live`
3. `GET /api/health/ready`
4. `GET /api/user-preference`
5. `POST /api/user-preference`

### Tr?ng th�i hi?n t?i

1. C� health endpoint d? app ping server.
2. HomeScreen d�ng health ping d? x�c d?nh server up/down tr?ng th�i UI.

---

## 6) Userflow hi?n t?i (lu?ng ngu?i d�ng)

## 6.1 Lu?ng v�o app v� x�c th?c

1. User m? app -> `AppNavigator` ki?m tra tr?ng th�i auth trong store.
2. N?u chua auth -> v�o c?m auth (`Welcome`, `Login`, `Register`, `VerifyEmail`, `ForgotPassword`).
3. Login th�nh c�ng -> luu access/refresh token -> v�o `AppTabs`.
4. N?u account chua onboarding -> chuy?n `OnboardingScreen`.

## 6.2 Lu?ng onboarding

1. User nh?p th�ng tin co b?n + co th? + m?c ti�u + activity.
2. Bu?c cu?i g?i `POST /api/ai/nutrition/recalculate`.
3. N?u th�nh c�ng -> luu profile/target + mark onboarding complete.
4. N?u AI kh�ng s?n s�ng -> hi?n toast l?i "AI Provider kh�ng kh? d?ng".

## 6.3 Lu?ng ghi b?a an th? c�ng

1. T? Home ho?c tab ph� h?p, user v�o `FoodSearch`.
2. Ch?n food/custom dish -> v�o `FoodDetail`.
3. Nh?p gram/portion v� meal type.
4. App g?i API luu diary (`/api/meal-diary`).
5. Query cache invalidation -> Home/Diary/Stats c?p nh?t.

## 6.4 Lu?ng scan AI ?nh

1. User m? `AIScanScreen`.
2. Ch?p ?nh ho?c ch?n ?nh thu vi?n.
3. App n�n ?nh (`expo-image-manipulator`) tru?c khi g?i.
4. G?i detect qua `aiService`.
5. Hi?n th? danh s�ch item nh?n di?n + confidence.
6. User c� th?:
   - ch?nh nhanh item,
   - th�m v�o gi? nguy�n li?u,
   - chuy?n `AddMealFromVision` d? luu diary.

## 6.5 Lu?ng voice assistant

1. User m? `VoiceScreen`.
2. Nh?n mic, ghi �m.
3. `transcribeAudio` g?i AI provider tr?c ti?p.
4. `parseWithOllama` g?i AI provider tr?c ti?p.
5. `executeCommand` g?i backend d? ghi b?a/c�n n?ng ho?c tr? l?i calories.
6. N?u c?n x�c nh?n c�n n?ng -> `confirmWeight` g?i backend.

## 6.6 Lu?ng xem th?ng k�

1. User v�o tab Stats.
2. Chuy?n nhanh day/week/month ngay trong `StatsScreen`.
3. App g?i summary/analytics endpoint tuong ?ng.
4. Hi?n th? progress calories/macro v� bi?u d?.

## 6.7 Lu?ng h? so

1. User v�o tab Profile.
2. Xem hero profile + ch? s? nhanh.
3. �i?u hu?ng sang c�c m�n h�nh con d? c?p nh?t info, body metric, goal, password, notifications.
4. Logout qua action trong Profile.

---

## 7) Workflow k? thu?t hi?n t?i (lu?ng h? th?ng)

## 7.1 Kh?i d?ng mobile v� t�m backend

1. `initializeApiClient()` ch?y khi app bootstrap.
2. Uu ti�n URL d� cache v� verify qua `/discovery`.
3. N?u cache h?ng -> scan LAN subnet ph? bi?n.
4. N?u kh�ng scan ra -> fallback env URL.

## 7.2 G?i request v� qu?n l� token

1. Request interceptor t? d�nh k�m `Authorization: Bearer <accessToken>`.
2. N?u 401:
   - lock refresh queue,
   - g?i `POST /api/auth/refresh`,
   - c?p nh?t token m?i,
   - retry request ch? trong queue.
3. N?u refresh fail:
   - clear token,
   - trigger callback auth expired -> logout v? login.

## 7.3 Network failure v� rescan

1. Khi g?p network error, interceptor c� co ch? retry + rescan backend URL (c� cooldown).
2. M?c ti�u: gi?m l?i do d?i IP local server.

## 7.4 Workflow backend request pipeline

1. Middleware co b?n: exception handling + swagger + CORS.
2. Auth middleware: `UseAuthentication` -> `UseAuthorization`.
3. Rate limiter �p theo policy endpoint.
4. Controller x? l� request -> Service -> Repository/DbContext.
5. V?i AI endpoints: backend g?i HTTP sang AI provider base URL.

## 7.5 Workflow AI provider

1. Flask app kh?i t?o model vision YOLO khi start.
2. `start_ollama_if_needed()` du?c g?i ? giai do?n import d? c? g?ng d?m b?o Ollama service s?n s�ng.
3. Endpoint nh?n ?nh/text/audio v� tr? JSON cho backend/mobile.
4. C� nhi?u `except:` broad catch d? tr�nh crash runtime, nhung gi?m t�nh minh b?ch l?i.

---

## 8) UI/UX hi?n t?i (chi ti?t theo s?n ph?m)

## 8.1 C?u tr�c di?u hu?ng

### Bottom tabs

1. `HomeTab`
2. `AIScanTab`
3. `VoiceTab`
4. `StatsTab`
5. `ProfileTab`

### Stack screens (ngo�i tab)

1. To�n b? auth flow.
2. To�n b? diary flow (search/detail/custom/meal diary).
3. To�n b? AI flow (camera, add from vision, history, recipe, nutrition).
4. To�n b? profile settings flow.
5. Achievements/gamification.

## 8.2 Ng�n ng? v� c?m gi�c giao di?n

1. UI ti?ng Vi?t l� ch�nh.
2. Thi?t k? theo xu hu?ng gradient + glassmorphism + animation.
3. Dark mode m?c d?nh t? ThemeProvider.
4. C� nhi?u feedback tuong t�c: toast, haptics, animation tr?ng th�i.

## 8.3 �i?m m?nh UX hi?n t?i

1. Nhi?u di?m v�o d? log b?a an (search, AI scan, voice).
2. Home t?ng h?p du?c nhi?u th�ng tin trong 1 m�n h�nh.
3. Voice screen c� tr?ng th�i r�: listening, parsing, executing, success/error.
4. Profile d?ng menu gi�p di?u hu?ng settings d? hon.

## 8.4 �i?m UX c?n ch� � theo hi?n tr?ng code

1. D�ng ch?y d? li?u AI chua nh?t qu�n (voice di t?t AI provider) l�m tang d? ph?c t?p khi debug.
2. M?t s? route/service legacy c�n t?n t?i (`/api/meals`) c� th? g�y h�nh vi kh�ng d?ng nh?t.
3. Onboarding ph? thu?c AI ? bu?c cu?i c� th? l�m user k?t khi AI local kh�ng s?n s�ng.
4. Avatar upload chua ho�n ch?nh v� FE g?i endpoint chua t?n t?i ? backend.

---

## 9) Backend API inventory (to�n b? endpoint hi?n c�)

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

## 10) AI provider inventory hi?n t?i

## 10.1 Endpoint Flask

1. `GET /`
2. `GET /healthz`
3. `POST /detect`
4. `POST /nutrition-advice`
5. `POST /meal-insight`
6. `POST /cooking-instructions`
7. `POST /voice/parse`
8. `POST /voice/transcribe`

## 10.2 Nang l?c AI hi?n c� trong code

1. Vision detection b?ng YOLO (uu ti�n model local `best.pt`, fallback `yolov8s.pt`).
2. Nutrition advice v?i uu ti�n Ollama local, fallback cloud/formula t�y module.
3. Meal insight b?ng LLM.
4. Voice parse + STT qua endpoint ri�ng.

## 10.3 �i?m k? thu?t c?n luu �

1. C� startup side-effect g?i `start_ollama_if_needed()` khi import app.
2. Nhi?u `except:` broad catch ? `app.py` v� `nutrition_llm.py`.
3. `download_dataset.py` dang hardcode Roboflow API key.

---

## 11) Database hi?n tr?ng

## 11.1 Context v� mi?n d? li?u

### `EatFitAIDbContext` c� c�c DbSet ch�nh

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
12. Nhi?u view t?ng h?p: daily/weekly/monthly/target progress

### `ApplicationDbContext` b? sung

1. Gi? ph?n l?n DbSet tuong t? scaffold context.
2. B? sung `AiLabelMaps`, `UserPreferences`.

## 11.2 Migration v� credibility

1. C� migration `AddCredibilityFields` trong nh�nh `Migrations/EatFitAIDb`.
2. Model `FoodItem` scaffold c� c�c field credibility (`Source`, `IsVerified`, `VerifiedBy`, `UpdatedAt`).

## 11.3 R?i ro thi?t k? DB ? th?i di?m hi?n t?i

1. D�ng song song 2 DbContext l�m tang nguy co drift schema/domain mapping.
2. M?t s? model gi?a `Models/*` v� `DbScaffold/Models/*` chua ho�n to�n d?ng nh?t (v� d? kh�c bi?t tru?ng avatar trong `User`).

---

## 12) Ch?t lu?ng k? thu?t hi?n t?i (build/test/type)

## 12.1 K?t qu? `dotnet test EatFitAI_v1.sln` (ch?y ng�y 2026-02-27)

1. K?t qu?: **Fail**.
2. L?i ch�nh: test `AuthServiceTests` kh�ng kh?p constructor m?i c?a `AuthService` (thi?u dependency `ILogger<AuthService>`).
3. C� warning v? async kh�ng `await` ? m?t s? service/controller.
4. C� warning MSBuild v? `BaseIntermediateOutputPath` trong test project.

## 12.2 K?t qu? `npm run typecheck` (mobile, ch?y ng�y 2026-02-27)

1. K?t qu?: **Fail**.
2. L?i ch�nh g?m:
   - `TS6046` li�n quan option `--module` t? `expo/tsconfig.base.json` v?i TS hi?n t?i.
   - Thi?u module `../src/hooks/useListSkeleton` trong test file.
   - Thi?u module/type `expo-image-manipulator` (d� dependency c� trong package).
   - Mismatch ki?u payload ? `FoodDetailScreen` khi g?i add diary t? user food item.
   - `aiService.ts`: `string | undefined` kh�ng g�n du?c v�o `string`.
   - `notificationService.ts`: object c� th? `null`.

## 12.3 � nghia th?c t?

1. H? th?ng dang ch?y du?c ? m?c dev feature, nhung baseline CI ch?t lu?ng chua ?n d?nh.
2. Mu?n tang d? tin c?y cho demo/b?o v? c?n ch?t l?i test health tru?c.

---

## 13) B?o m?t v� ri�ng tu d? li?u (hi?n tr?ng)

## 13.1 �i?m t?t dang c�

1. D�ng JWT access + refresh token.
2. C� luu token b?o m?t ? mobile (`expo-secure-store` + memory cache).
3. Backend c� auth middleware, authorization, rate limiting, health checks.
4. Appsettings d� d�ng placeholder cho JWT key v� SMTP password (`REPLACE_WITH_USER_SECRET`).

## 13.2 �i?m y?u/c?n x? l�

1. Script dataset hardcode API key (`download_dataset.py`).
2. T?n t?i nh�nh validate token trong service b? `issuer/audience`.
3. Error contract chua d?ng nh?t ho�n to�n, nhi?u ch? v?n tr? `ex.Message` tr?c ti?p.
4. Boundary voice chua chu?n l�m m? r?ng b? m?t c?u h�nh m?ng/port.

---

## 14) �? kh?p gi?a b�o c�o d? �n v� code hi?n t?i

## 14.1 Ph?n kh?p t?t

1. C� d? c�c module ch�nh: auth, profile, diary, food, stats, AI vision, AI nutrition, voice.
2. Ki?n tr�c da t?ng FE/BE/AI/DB d� tri?n khai th?c t?.
3. C� endpoint health, analytics, summary, favorites, user food.

## 14.2 Ph?n l?ch/kh�ng d?ng nh?t c?n luu � khi vi?t b�o c�o

1. B�o c�o ghi ki?n tr�c "mobile -> backend -> AI" nhung th?c t? voice c�n g?i AI tr?c ti?p.
2. B�o c�o c� th? m� t? Google auth th?ng nh?t, nhung code c�n nh�nh legacy chua ho�n ch?nh.
3. B�o c�o c� th? coi build health ?n, nhung th?c t? test/typecheck dang fail.
4. B�o c�o n�i upload avatar n?u dua v�o ph?n ch?c nang ch�nh th� c?n ghi r� tr?ng th�i backend chua c� endpoint tuong ?ng.

---

## 15) Danh s�ch v?n d? hi?n tr?ng quan tr?ng (uu ti�n)

## 15.1 M?c Blocker/High

1. `AuthService.GoogleLoginAsync` chua implement nhung route legacy v?n t?n t?i.
2. Voice c�n di t?t mobile -> AI provider cho parse/transcribe.
3. Typecheck mobile fail.
4. Dotnet test fail.
5. Hardcoded key trong script dataset.

## 15.2 M?c Medium

1. 2 DbContext song song -> nguy co drift.
2. Chua d?ng nh?t ho�n to�n error envelope.
3. Onboarding ph? thu?c AI, fallback UX chua th?t s? m?m.
4. Service legacy (`/api/meals`) c� th? g�y nh?m l?n.

---

## 16) K?t lu?n hi?n tr?ng app

EatFitAI hi?n d� c� n?n t?ng s?n ph?m tuong d?i d?y d? v? m?t t�nh nang cho m?t d? �n t?t nghi?p c� AI:

1. C� d?y d? core flow theo d�i dinh du?ng v� s?c kh?e.
2. C� 3 k�nh input b?a an: manual, scan ?nh, voice.
3. C� AI nutrition v� analytics h? tr? c� nh�n h�a.
4. C� ki?n tr�c local-first ph� h?p b?i c?nh demo d? �n.

Tuy nhi�n, d? app d?t m?c "uy t�n k? thu?t cao" trong b?o v?, hi?n tr?ng code cho th?y c?n x? l� d?t di?m c�c di?m sau tru?c:

1. Chu?n h�a boundary mobile-backend-AI (d?c bi?t voice).
2. D?n ch?ng ch�o auth Google v� route legacy.
3. �ua build health v? tr?ng th�i xanh (`dotnet test`, `npm run typecheck`).
4. Lo?i b? hardcoded secret v� chu?n h�a l?i tr? v?.

---

## 17) Ph? l?c: file ch�nh d� ki?m tra

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

## 18) Tr?ng th�i s? d?ng t�i li?u n�y

B?n c� th? d�ng tr?c ti?p t�i li?u n�y cho:

1. Chuong "N?i dung th?c hi?n" (m?c hi?n tr?ng h? th?ng).
2. Chuong "H?n ch? c?a d? t�i" (n�u d�ng di?m ngh?n th?c t?).
3. Slide b?o v? (1-2 slide snapshot k? thu?t + 1 slide risk).
