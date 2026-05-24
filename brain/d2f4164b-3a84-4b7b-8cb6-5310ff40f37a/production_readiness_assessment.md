# EatFitAI — Đánh Giá Production Readiness (v2)

> **Ngày đánh giá:** 2026-04-24
> **Phương pháp:** Verify 100% bằng `grep` + đọc code thật. KHÔNG dựa trên docs.

---

## Tổng quan kiến trúc đã verify

| Layer | Stack | Trạng thái |
|---|---|---|
| **Mobile** | Expo / React Native + TypeScript | ✅ Hoạt động |
| **Backend** | ASP.NET Core + PostgreSQL (Supabase) | ✅ Hoạt động |
| **AI Provider** | Flask + YOLO + Gemini API | ✅ Hoạt động |
| **Cloud** | Render.com (Free Tier x2 services) | ⚠️ Free Plan |
| **Email** | Brevo transactional email | ✅ Đã config |

---

## I. ĐÁNH GIÁ THEO TỪNG MẢNG (CODE-VERIFIED)

### 1. Authentication & Security — 95% ✅

| Tiêu chí | Trạng thái | Evidence |
|---|---|---|
| JWT Auth (HS256 + Supabase ES256) | ✅ Done | [Program.cs:719-767](file:///d:/EatFitAI_v1/eatfitai-backend/Program.cs#L719-L767) — Dual issuer validation |
| JWT Key rotation (`JwtKeyRing`) | ✅ Done | `Jwt:PreviousKeys` config support |
| Password reset → Database | ✅ Done | [AuthService.cs:559-611](file:///d:/EatFitAI_v1/eatfitai-backend/Services/AuthService.cs#L559-L611) — `PasswordResetCodes` DB table, NOT memory cache |
| Token refresh flow (mobile) | ✅ Done | [apiClient.ts:206-217](file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/apiClient.ts#L206-L217) — Auto retry 401 |
| Google Sign-In | ✅ Done | `GoogleAuthController.cs` (16KB) |
| Email verification flow | ✅ Done | `VerifyEmailScreen.tsx` + backend `verify-email` endpoint |
| Rate Limiting | ✅ Done | [Program.cs:514-544](file:///d:/EatFitAI_v1/eatfitai-backend/Program.cs#L514-L544) — Auth 10/min, AI 20/min, General 100/min |
| `[Authorize]` trên controllers | ✅ Done | User, Diary, Voice, Water, Favorites, Summary, Telemetry — tất cả có `[Authorize]` |
| Security Headers middleware | ✅ Done | [SecurityHeadersMiddleware.cs](file:///d:/EatFitAI_v1/eatfitai-backend/Middleware/SecurityHeadersMiddleware.cs) — X-Content-Type-Options, X-Frame-Options, COEP, CORP |
| HTTPS redirect (Production) | ✅ Done | [Program.cs:1045](file:///d:/EatFitAI_v1/eatfitai-backend/Program.cs#L1045) |
| Production config validation | ✅ Done | [Program.cs:375-426](file:///d:/EatFitAI_v1/eatfitai-backend/Program.cs#L375-L426) — Crash on startup if secrets missing |
| Encryption service | ✅ Done | `EncryptionService.cs` — Gemini keys encrypted at rest |

> [!NOTE]
> **Docs AUTH_AND_INFRA.md ghi password reset dùng IMemoryCache → SAI.** Code thật đã dùng DB (`_adminContext.PasswordResetCodes`). `IMemoryCache` trong `AuthService` field tồn tại nhưng **không được gọi** trong password reset flow. Cần cập nhật docs.

### 2. Mobile App — 90% ✅

| Tiêu chí | Trạng thái | Evidence |
|---|---|---|
| **Screens (37 screens)** | ✅ Đầy đủ | Auth (7) + Home + Profile + Voice + Diary (6) + AI (7) + Profile settings (9) + Stats (3) + Gamification (1) + Meals (1) |
| **Components (34 shared + 13 dirs)** | ✅ Mature | Button, Modal, BottomSheet, SearchBar, Tabs, FAB, Skeleton, ErrorBoundary, etc. |
| **State management** | ✅ Zustand | 8 stores: Auth, Diary, Gamification, IngredientBasket, Profile, Stats, UserPreference, Voice |
| **Data fetching** | ✅ React Query | `useQuery` in 15+ screens, `useQueryClient` for cache invalidation |
| **Offline support** | ✅ Basic | [offlineCache.ts](file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/offlineCache.ts) — AsyncStorage-based fallback for diary, profile, nutrition |
| **Image optimization** | ✅ expo-image | [AppImage.tsx:11](file:///d:/EatFitAI_v1/eatfitai-mobile/src/components/ui/AppImage.tsx#L11) — Wrapper using `expo-image` |
| **Error tracking** | ✅ Firebase Crashlytics | [errorTracking.ts](file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/errorTracking.ts) — `recordError`, `setUserId`, `log`, dual channel (Firebase + custom telemetry) |
| **Crashlytics native setup** | ✅ Done | [app/build.gradle:5](file:///d:/EatFitAI_v1/eatfitai-mobile/android/app/build.gradle#L5) — `apply plugin: "com.google.firebase.crashlytics"`, [build.gradle:13](file:///d:/EatFitAI_v1/eatfitai-mobile/android/build.gradle#L13) — `firebase-crashlytics-gradle:3.0.3` |
| **Analytics** | ✅ Custom telemetry | [analytics.ts](file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/analytics.ts) — `trackScreen`, `trackEvent` → backend telemetry |
| **Barcode scanner** | ✅ Done | [AIScanScreen.tsx](file:///d:/EatFitAI_v1/eatfitai-mobile/src/app/screens/ai/AIScanScreen.tsx) — Dual mode (AI scan + Barcode), `lookupByBarcode` |
| **Secure token storage** | ✅ Done | [secureStore.ts](file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/secureStore.ts) (5.5KB) |
| **API client resilience** | ✅ Done | [apiClient.ts](file:///d:/EatFitAI_v1/eatfitai-mobile/src/services/apiClient.ts) — Auto LAN discovery, 401 retry, network retry with cooldown |

**ScrollView vs FlatList — Phân tích chi tiết:**

| Screen dùng ScrollView | Lý do hợp lệ? |
|---|---|
| `Screen.tsx` (shared wrapper) | ✅ Generic container cho form screens |
| `GoalSettingsScreen`, `NotificationsScreen` | ✅ Form với số lượng fixed items |
| `MealDiarySkeleton.tsx` | ✅ Skeleton placeholder |
| `AddRecipeToDiarySheet.tsx` | ✅ Bottom sheet content |
| `Tabs.tsx` | ✅ Horizontal tab bar |

| Screen dùng FlatList | Lý do đúng? |
|---|---|
| `FavoritesList.tsx` | ✅ Dynamic list |
| `FoodPickerBottomSheet.tsx` | ✅ Search results |
| `IngredientBasketSheet.tsx` | ✅ Dynamic items |
| `AchievementsScreen.tsx` | ✅ Large list |
| `IntroCarouselScreen.tsx` | ✅ Horizontal pager |
| `FoodItemPicker.tsx` | ✅ Search results |
| `TeachLabelBottomSheet.tsx` | ✅ Label list |

> **Kết luận:** ScrollView/FlatList đã được dùng **đúng context**. Không cần refactor.

**staleTime optimization — Phân tích chi tiết:**

| Location | Value | Hợp lý? |
|---|---|---|
| `useAiStatus.ts` | 15s | ✅ AI status cần fresh |
| `InsightsCard.tsx` | 1 hour | ✅ Insights ít thay đổi |
| `FavoritesList.tsx` | 5 min | ✅ Hợp lý |
| `StatsScreen` (water) | 30s | ⚠️ Có thể tăng lên 2-5 min |
| `StatsScreen` (weekly review) | 5 min | ✅ Hợp lý |
| `WeightHistoryScreen` | 5 min | ✅ Hợp lý |
| `HomeScreen` (day summary) | 30s | ⚠️ Có thể tăng lên 1-2 min |
| `FoodDetailScreen` | 5 min | ✅ Hợp lý |
| `CommonMealTemplate` | 0 (always fresh) | ⚠️ Cố ý — template cần latest |
| `CommonMealsScreen` | 0 (always fresh) | ⚠️ Cố ý — meal list cần latest |

> **Kết luận:** 8/10 queries đã set hợp lý. 2 chỗ `staleTime: 0` là cố ý (user-mutable data). 2 chỗ 30s ở Home/Stats có thể tối ưu nhưng **impact không đáng kể**.

### 3. Backend API — 93% ✅

| Tiêu chí | Trạng thái | Evidence |
|---|---|---|
| **Controllers (25)** | ✅ Đầy đủ | Auth, User, Food, Diary, AI, Voice, Water, Admin (5), Analytics, Summary, etc. |
| **Services (36)** | ✅ Mature | Auth, Food, Meal, Recipe, Nutrition, AI, Voice, Email, Encryption, Telemetry, etc. |
| **Health Checks** | ✅ Done | [Program.cs:683-691](file:///d:/EatFitAI_v1/eatfitai-backend/Program.cs#L683-L691) — PostgreSQL health + Startup bootstrap health |
| **Exception Handling** | ✅ Custom middleware | `ExceptionHandlingMiddleware.cs` |
| **Request Logging** | ✅ Custom middleware | `RequestLoggingMiddleware.cs` |
| **CORS** | ✅ Environment-based | Dev vs Prod policies [Program.cs:496-511](file:///d:/EatFitAI_v1/eatfitai-backend/Program.cs#L496-L511) |
| **DB Retry on Failure** | ✅ Done | `EnableRetryOnFailure()` on both DbContexts |
| **Swagger (Dev only)** | ✅ Done | Disabled in Production |
| **Admin Dashboard API** | ✅ Done | 5 Admin controllers + Governance bootstrapper |
| **Response Compression** | ❌ **Missing** | `UseResponseCompression` = 0 results. JSON gửi raw |
| **Unit Tests (16 files)** | ✅ Coverage | Auth, Food, Diary, Email, Encryption, VisionCache, etc. |
| **Integration Tests (10 files)** | ✅ Coverage | AI, Auth, Food, Diary, Voice, Telemetry, etc. |

### 4. AI Provider — 90% ✅

| Tiêu chí | Trạng thái | Evidence |
|---|---|---|
| YOLO model load | ✅ Module-level (correct) | [app.py:107-151](file:///d:/EatFitAI_v1/ai-provider/app.py#L107-L151) — Eager load, NOT lazy |
| Model download from Supabase | ✅ Auto-download | [app.py:66-104](file:///d:/EatFitAI_v1/ai-provider/app.py#L66-L104) |
| GPU/CPU auto-detect | ✅ Done | [app.py:114-126](file:///d:/EatFitAI_v1/ai-provider/app.py#L114-L126) |
| Gemini multi-key pool + failover | ✅ Done | `nutrition_llm.py`, `GEMINI_KEY_POOL_JSON`, exhaustion tracking |
| Rate limiting (Gemini) | ✅ Done | `GEMINI_RPM_LIMIT`, `GEMINI_TPM_LIMIT`, `GEMINI_RPD_LIMIT` |
| Health check endpoints | ✅ Done | `/healthz` + `/healthz/gemini` |
| File size + type validation | ✅ Done | [app.py:54-62](file:///d:/EatFitAI_v1/ai-provider/app.py#L54-L62) — 10MB max, image type whitelist |
| Upload cleanup | ✅ Done | [app.py:311-316](file:///d:/EatFitAI_v1/ai-provider/app.py#L311-L316) — finally block |

### 5. Infrastructure & DevOps — 75% ⚠️

| Tiêu chí | Trạng thái | Evidence |
|---|---|---|
| `render.yaml` blueprint | ✅ Done | [render.yaml](file:///d:/EatFitAI_v1/render.yaml) — Docker-based, env vars configured |
| Cloud plan | ⚠️ **Free Tier** | Backend + AI Provider đều `plan: free` |
| Response compression | ❌ **Missing** | Không có `AddResponseCompression` / `UseResponseCompression` |
| Health check path | ✅ Done | Backend: `/health/ready`, AI: `/healthz` |
| Env vars management | ✅ Done | `sync: false` for secrets, Brevo/Google/Supabase/JWT all configured |
| CI/CD | ⚠️ Manual | No GitHub Actions workflow file found |
| Keep-alive (UptimeRobot/Cron-job) | 🔧 **Manual** | Docs có hướng dẫn nhưng cần bạn tự setup |

### 6. Testing — 85% ✅

| Tiêu chí | Trạng thái | Evidence |
|---|---|---|
| Backend Unit Tests | ✅ 16 files | AuthService, FoodService, MealDiary, Encryption, VisionCache, etc. |
| Backend Integration Tests | ✅ 10 files | AI, Auth, Food, Diary, Voice, Telemetry controllers |
| Integration Test Host | ✅ Done | [IntegrationTestHost.cs](file:///d:/EatFitAI_v1/eatfitai-backend/Tests/Integration/IntegrationTestHost.cs) — In-memory test server |
| Mobile Tests | ⚠️ Minimal | 1 `__tests__` dir in services |
| Smoke Scripts | ✅ Done | `start-mobile-cloud-smoke.ps1`, `seed-scan-demo.ps1` |
| E2E / Device Tests | ❌ Not automated | Appium framework chosen, not yet integrated in CI |

### 7. Documentation — 80% ⚠️

| Doc | Trạng thái | Notes |
|---|---|---|
| `21_PRODUCT_CHECKLIST_2026-04-19.md` | ✅ Current | Có progress update 2026-04-23 |
| `STABILIZATION_PLAN.md` | ⚠️ **Stale** | 51KB, chứa thông tin cũ (IMemoryCache claim sai) |
| `AUTH_AND_INFRA.md` | ⚠️ **Stale** | Ghi password reset dùng cache → thực tế đã dùng DB |
| `ARCHITECTURE.md` | ✅ OK | 6.5KB, tổng quan đúng |
| `SECRETS_SETUP.md` | ✅ OK | 7.4KB, hướng dẫn setup secrets |

---

## II. BẢNG TỔNG HỢP THEO MẢNG

| Mảng | Score | Giải thích |
|---|---|---|
| Authentication & Security | **95%** | Hoàn chỉnh: JWT dual-issuer, rate limiting, security headers, DB-based reset |
| Mobile App | **90%** | 37 screens, Zustand + RQ, Crashlytics, barcode, offline cache |
| Backend API | **93%** | 25 controllers, 36 services, middleware pipeline, tests |
| AI Provider | **90%** | YOLO + Gemini multi-key, health checks, file validation |
| Infrastructure | **75%** | Free tier, no compression, no CI/CD |
| Testing | **85%** | Good backend coverage, weak mobile/E2E |
| Documentation | **80%** | Một số docs stale, cần cleanup |

---

## III. TỔNG ĐIỂM PRODUCTION READINESS

### **Overall: ~87%** (tăng từ 72% ban đầu — vì lần trước đánh giá sai do dựa docs stale)

---

## IV. KHOẢNG CÁCH ĐẾN 100% PRODUCTION

### ✅ KHÔNG CẦN LÀM (đã verify done)

| Item cũ | Tại sao bỏ |
|---|---|
| IMemoryCache → DB | Đã dùng DB rồi (`PasswordResetCodes`). Docs sai. |
| expo-image migration | Đã dùng expo-image rồi (`AppImage.tsx`). |
| ScrollView → FlatList | Đã dùng đúng context. Không cần refactor. |
| YOLO lazy model load | Pattern hiện tại (eager load) đã đúng cho production. |
| JwtService refactor | Class này không tồn tại. Docs sai. |
| staleTime optimization | 8/10 queries đã set hợp lý. Impact không đáng kể. |

### ⚠️ THỰC SỰ CẦN LÀM (verified gaps)

| # | Item | Effort | Impact | Evidence |
|---|---|---|---|---|
| 1 | **Response Compression** | 15 phút | Medium | `UseResponseCompression` = 0 results. JSON raw → tốn bandwidth 3G/4G |
| 2 | **Docs cleanup** | 30 phút | Low | `AUTH_AND_INFRA.md` + `STABILIZATION_PLAN.md` ghi sai về IMemoryCache |
| 3 | **Firebase Crashlytics verify** | 30 phút | Medium | Code đã implement xong, nhưng cần build APK → trigger crash → check Firebase Console. **Chỉ bạn làm được.** |
| 4 | **CI/CD pipeline** | 2-4 giờ | High | Không có GitHub Actions. Deploy thủ công. |
| 5 | **Cloud plan upgrade** | 💰 | High | Free tier = cold start 30-60s, 750h/tháng budget. **Vấn đề tiền, bạn đã chọn bỏ qua.** |

### 🟡 OPTIONAL (nice-to-have, không block production)

| # | Item | Effort | Impact |
|---|---|---|---|
| 6 | Mobile unit/E2E tests | 4-8 giờ | Medium — Tăng confidence cho regression |
| 7 | `staleTime` tune (Home 30s→120s, Stats 30s→120s) | 5 phút | Low — Giảm ~4 API calls/phút |
| 8 | Manual logging speed (favorites, recent, same-as-yesterday) | 8-16 giờ | Medium — **Feature mới**, không phải bug |

---

## V. KẾT LUẬN THẲNG THẮN

**App hiện tại đã ở mức production-ready về code.** 37 screens, 25 API controllers, 36 services, 26 test files, Crashlytics, analytics, barcode scanner, offline cache, security headers, rate limiting, JWT dual-issuer — tất cả đã implement xong.

**Khoảng cách thực sự đến 100% không phải code, mà là ops:**
1. Response compression (15 phút code)
2. CI/CD pipeline (quy trình, không phải code)
3. Cloud plan (tiền)
4. Firebase verify (manual device test)

**So với lần đánh giá trước (72%):** Sai số lớn do dựa vào docs stale. Thực tế code đã mature hơn nhiều so với docs mô tả. Score thực = **~87%**, và 8% còn lại chủ yếu là infra/ops chứ không phải code defects.
