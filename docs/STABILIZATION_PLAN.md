# Kế hoạch Ổn định & Nâng cấp EatFitAI v2

> **Bắt đầu**: 2026-04-20  
> **Nguyên tắc**: Thảo luận → Chốt → Code → Commit dần. KHÔNG push vội.  
> **Trạng thái**: 🟢 Code ~95% xong — còn manual ops (keep-alive) + full release gate verification trên môi trường thật

---

## Mục lục & Trạng thái

| # | Mục | Trạng thái |
|---|---|---|
| 1 | [Cloud Stability](#1-cloud-stability) | ✅ Đã chốt |
| 2 | [Bảo mật (Security)](#2-bảo-mật-security) | ✅ Đã chốt |
| 3 | [Telemetry (Giám sát)](#3-telemetry-giám-sát) | ✅ Đã chốt |
| 4 | [Auth (Xác thực)](#4-auth-xác-thực) | ✅ Đã chốt |
| 5 | [Chức năng AI](#5-chức-năng-ai) | 🟡 Deep Audit — 6 commits mới (5A-5F) |
| 6 | [Features Mới](#6-features-mới) | ✅ Đã chốt |
| 7 | [Hiệu năng](#7-hiệu-năng-performance) | ✅ Đã chốt |
| 8 | [Documentation](#8-documentation) | ✅ Đã chốt |
| 9 | [Data Integrity](#9-data-integrity) | ✅ Đã chốt |

---

## 1. Cloud Stability

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20)

Sau khi đọc `Program.cs` (1137 dòng) và `HealthController.cs` — **hầu hết đã được implement**:

| Hạng mục | Trạng thái | Vị trí code |
|---|---|---|
| Health ready check (DB query) | ✅ ĐÃ CÓ | `Program.cs:684-688` — `AddNpgSql()` tag `"ready"` |
| EnableRetryOnFailure | ✅ ĐÃ CÓ | `Program.cs:599, 605` |
| render.yaml Brevo | ✅ ĐÃ ĐÚNG | `render.yaml:47-52` |
| Rate limiting Auth/AI/General | ✅ ĐÃ CÓ | `Program.cs:514-544` |
| Production config validation | ✅ ĐÃ CÓ | `Program.cs:375-426` |
| Connection mode detection | ✅ ĐÃ CÓ | `Program.cs:355-373` |

### Quyết định đã chốt

- ❌ **CLOUD-006 (Backend warmup)**: LOẠI BỎ — user có giải pháp riêng
- ❌ **Commit 1A (Health fix)**: LOẠI BỎ — code đã đúng, dùng `AddNpgSql` check DB thật
- ❌ **Commit 1B (Retry)**: LOẠI BỎ — `EnableRetryOnFailure()` đã có
- ❌ **Commit 1C (render.yaml)**: LOẠI BỎ — đã dùng Brevo, không có SMTP config sai

### Còn lại — Manual actions (không commit)

| Action | Trạng thái | Ghi chú |
|---|---|---|
| **CLOUD-001** UptimeRobot setup | ⬜ Chưa làm | Xem [Phụ lục A](#phụ-lục-a-hướng-dẫn-uptimerobot) |
| **CLOUD-007** Đổi port 6543→5432 | ✅ ĐÃ CHỐT | User tự đổi trên Render dashboard (env var `DATABASE_URL`) |
| **CLOUD-004** Lazy model load | ⏩ Chuyển mục AI | Xem [Mục 5 — AI](#5-chức-năng-ai) |
| **CLOUD-005** Gunicorn config | ⏩ Chuyển mục AI | Xem [Mục 5 — AI](#5-chức-năng-ai) |

> **📝 Ghi chú**: Backend cloud stability đã ở trạng thái tốt. Phần lớn công việc là manual (UptimeRobot, đổi port Render).

---

## 2. Bảo mật (Security)

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20)

| Task | Trạng thái | Kết luận |
|---|---|---|
| SEC-009 ex.Message cleanup | ⚠️ **~50 chỗ cần sửa** | Log lỗi vào Render Logs, trả message chung cho client |
| SEC-010 Security headers | ⚠️ **CHƯA CÓ** | Thêm middleware: nosniff + X-Frame-Options + HSTS |
| SEC-010 Rate limiting | ✅ ĐÃ CÓ | Auth 10/min, AI 20/min, General 100/min (`Program.cs:514-544`) |
| SEC-017 Token storage | ✅ ĐÃ AN TOÀN | `expo-secure-store` — LOẠI BỎ khỏi plan |
| SEC-020 dotnet | ✅ SẠCH | 0 vulnerabilities |
| SEC-020 npm | ⚠️ 19 lỗ hổng (hầu hết dev tools) | `npm audit fix` — risk thấp |

### Commit 2A → 2J: SEC-009 — ex.Message cleanup (chia theo controller)

**Chiến lược**: Chia theo controller, mỗi commit 1 controller. Dev vẫn thấy lỗi đầy đủ trên **Render Logs**
(UserId + Stack trace + Error message), client chỉ nhận message chung.

**Pattern sửa** (giống nhau cho tất cả):
```csharp
// TRƯỚC:
catch (Exception ex) {
    return StatusCode(500, new { message = "Lỗi...", error = ex.Message });
}
// SAU:
catch (Exception ex) {
    _logger.LogError(ex, "Lỗi... cho user {UserId}", userId);
    return StatusCode(500, new { message = "Lỗi..." });
}
```

| Commit | Controller | Số chỗ sửa |
|---|---|---|
| 2A | `AuthController.cs` | ~15 |
| 2B | `AIController.cs` | ~12 |
| 2C | `MealDiaryController.cs` | ~7 |
| 2D | `FoodController.cs` | ~5 |
| 2E | `UserController.cs` | ~8 |
| 2F | `UserFoodItemsController.cs` | ~7 |
| 2G | `WaterIntakeController.cs` | ~4 |
| 2H | `NutritionController.cs` | ~4 + validation fix + `GetCurrent()` try-catch |
| 2I | `SummaryController.cs` | ~2 |
| 2J | `VoiceController.cs` | ~3 |

### Commit 2K: SEC-010 — Security Headers Middleware

| File | Thay đổi |
|---|---|
| `Middleware/SecurityHeadersMiddleware.cs` | **[NEW]** Thêm nosniff, X-Frame-Options, HSTS |
| `Program.cs` | Thêm 1 dòng `app.UseMiddleware<SecurityHeadersMiddleware>()` |

### Commit 2L: SEC-020 — npm audit fix

| File | Thay đổi |
|---|---|
| `eatfitai-mobile/package-lock.json` | Auto-upgrade vulnerable dev dependencies |

---

## 3. Telemetry (Giám sát)

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20)

| Thành phần | Trạng thái | File |
|---|---|---|
| Analytics | ❌ **STUB** — chỉ `console.log`, chưa gửi data | `services/analytics.ts` (20 dòng) |
| Error tracking | ❌ **STUB** — chỉ `console.error`, không ai nhận lỗi | `services/errorTracking.ts` (13 dòng) |
| Firebase SDK | ✅ User đã có | Cần cấu hình thêm |

### Commit 3A: Firebase Analytics

**Mục đích**: Biết user dùng tính năng nào, bao nhiêu người dùng, retention, v.v.

**Hướng dẫn implement**:

1. **Cài dependencies**:
```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```

2. **Cấu hình** (`app.json` hoặc `app.config.ts`):
```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app"
    ]
  }
}
```

3. **Đặt file config Firebase** (tải từ Firebase Console):
   - Android: `google-services.json` → đặt vào thư mục gốc project
   - iOS: `GoogleService-Info.plist` → đặt vào thư mục gốc project

4. **Sửa `analytics.ts`** — thay stub bằng Firebase thật:
```typescript
import analytics from '@react-native-firebase/analytics';

export const initAnalytics = async (): Promise<void> => {
  await analytics().setAnalyticsCollectionEnabled(true);
};

export const trackScreen = (screen: string, params?: Record<string, any>): void => {
  analytics().logScreenView({ screen_name: screen, screen_class: screen });
};

export const trackEvent = (event: string, params?: Record<string, any>): void => {
  analytics().logEvent(event, params);
};
```

5. **Các event nên track**:
   - `meal_logged` — user thêm bữa ăn
   - `food_scanned` — dùng AI scan
   - `voice_command` — dùng giọng nói
   - `recipe_viewed` — xem công thức
   - `water_logged` — ghi nước uống
   - `achievement_unlocked` — mở khóa thành tích

### Commit 3B: Firebase Crashlytics

**Mục đích**: Khi app crash trên điện thoại user → bạn tự động nhận báo cáo lỗi (stack trace, device info, OS version).

**Hướng dẫn implement**:

1. **Cài dependency**:
```bash
npx expo install @react-native-firebase/crashlytics
```

2. **Sửa `errorTracking.ts`** — thay stub bằng Crashlytics:
```typescript
import crashlytics from '@react-native-firebase/crashlytics';

export const initErrorTracking = async (): Promise<void> => {
  await crashlytics().setCrashlyticsCollectionEnabled(true);
};

export const captureError = (error: unknown, context?: string): void => {
  if (error instanceof Error) {
    crashlytics().recordError(error);
  }
  if (context) {
    crashlytics().log(context);
  }
};

// Gắn user ID để biết user nào gặp lỗi
export const setUser = (userId: string): void => {
  crashlytics().setUserId(userId);
};
```

3. **Gọi `setUser()` sau khi đăng nhập** (trong auth flow):
```typescript
// Sau khi login thành công:
import { setUser } from '../services/errorTracking';
setUser(user.userId);
```

### Lưu ý quan trọng

- **Firebase Analytics miễn phí** — unlimited events
- **Crashlytics miễn phí** — unlimited crash reports
- Cần **Expo Dev Build** (không dùng Expo Go) vì native modules
- Data hiển thị trên **Firebase Console** → Analytics / Crashlytics tabs

---

## 4. Auth (Xác thực)

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20) — KHÔNG CẦN LÀM GÌ

| Thành phần | Trạng thái | File |
|---|---|---|
| Email/Password login | ✅ Hoạt động | `AuthController.cs` |
| Google Sign-in | ✅ Hoạt động (416 dòng) | `GoogleAuthController.cs` |
| Refresh token | ✅ 30 ngày expiry | `AuthController.cs` |
| Token storage | ✅ `expo-secure-store` | `secureStore.ts` |
| JWT generation | ✅ HMAC-SHA256 | Cả 2 controller |
| Access control (ban/suspend) | ✅ Check `AccessState` | `GoogleAuthController.cs:166-174` |

### ⚠️ Ghi chú refactor (không cấp bách)

**Vấn đề**: `GenerateJwtToken()` bị **copy-paste** ở 2 file:
- `AuthController.cs` — bản gốc
- `GoogleAuthController.cs:327-352` — bản copy, comment ghi *"Copy từ AuthService để tránh circular dependency"*

**Rủi ro**: Sửa logic JWT ở 1 chỗ mà quên chỗ kia → token không nhất quán.

**Giải pháp tương lai**: Gom vào `Services/JwtService.cs` — inject vào cả 2 controller. Không làm bây giờ vì auth đang hoạt động ổn.

---

## 5. Chức năng AI

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20)

| Tính năng | Trạng thái | File |
|---|---|---|
| AI Food Scan (camera) | ✅ Hoạt động | `AIScanScreen.tsx` (50KB) |
| Voice input | ✅ Hoạt động (STT toggle) | `VoiceScreen.tsx` + `voiceService.ts` |
| NLP parse food text | ✅ Confidence scoring | `nutrition_llm.py` |
| Recipe suggestions | ✅ Hoạt động | `RecipeSuggestionsScreen.tsx` |
| Nutrition insights AI | ✅ Hoạt động | `NutritionInsightsScreen.tsx` |
| Vision history | ✅ Hoạt động | `VisionHistoryScreen.tsx` |
| YOLO object detection | ✅ Confidence thresholds | `app.py:294` |
| Dietary restrictions AI | ✅ Hoạt động | `DietaryRestrictionsScreen.tsx` |
| Cooking Instructions AI | ✅ Hoạt động | `nutrition_llm.py:366` |
| Adaptive Nutrition Target | ✅ Hoạt động | `NutritionInsightService.cs` |
| Teach Label (self-learning) | ✅ Hoạt động | `AIController.cs:756` |

### Còn lại từ Cloud (chuyển từ Mục 1)

| Task | Mô tả | Ưu tiên |
|---|---|---|
| **CLOUD-004** Lazy model load | AI model load khi cần thay vì khi start → giảm cold start | 🟡 Trung bình |
| **CLOUD-005** Gunicorn config | Tuning worker/thread cho AI provider | 🟡 Trung bình |

### 🔴 DEEP AUDIT — AI Logic Flaws (2026-04-20, phản biện đã xác nhận)

> **Phương pháp**: Mỗi finding đã được verify bằng code thực tế, tự phản biện, chỉ giữ lại findings đã confirmed.

#### Commit 5A: 🔴 Fix Activity Level bị ignore khi gọi AI Provider

**Vấn đề — CONFIRMED**: `AIController.cs:363` map `goal → activity` thay vì dùng `request.ActivityLevel` (có sẵn trong DTO line 9).

**Evidence**:
```csharp
// DTO có field ActivityLevel:
public double? ActivityLevel { get; set; }  // ← line 9

// Nhưng payload gửi AI Provider KHÔNG dùng nó:
activity = request.Goal?.ToLower() == "cut" ? "moderate" :   // ← SAI
          request.Goal?.ToLower() == "bulk" ? "active" : "moderate",
```

**Phản biện**: Offline fallback `BuildOfflineFallback()` (line 316) **CÓ** dùng đúng `request.ActivityLevel.Value`. Bug chỉ ở online path.

**Impact**: User sedentary chọn "bulk" → bị tính activity="active" → TDEE tăng ~11% → calories quá cao.

**Fix**:
```csharp
// Map double → string cho AI Provider
string MapActivityLevel(double? level) => level switch {
    <= 1.2  => "sedentary",
    <= 1.375 => "light",
    <= 1.55  => "moderate",
    <= 1.725 => "active",
    _        => "very_active"
};

var payload = new {
    // ...
    activity = MapActivityLevel(request.ActivityLevel),
    // ...
};
```

**Files sửa**: `eatfitai-backend/Controllers/AIController.cs` (lines 357-366)

---

#### Commit 5B: 🔴 Chuẩn hóa Goal Adjustment 3 tầng — CONFIRMED

**Vấn đề**: 3 nơi tính nutrition dùng **hệ số khác nhau** cho cùng 1 mục đích:

| Layer | File | Cut | Bulk | Macro Logic |
|-------|------|-----|------|-------------|
| AI Provider (Python) | `nutrition_llm.py:194-203` | ×0.85 (−15%) | ×1.15 (+15%) | Fixed 25%P / 50%C / 25%F |
| Backend Fallback (C#) | `NutritionCalcService.cs:45-68` | ×0.80 (−20%) | ×1.10 (+10%) | Protein 2.2g/kg cut; Fat 25%; Carbs=remainder |
| Gemini LLM | (được dạy formula trong prompt) | ×0.85 | ×1.15 | LLM tự quyết |

**Phản biện**: Mobile **KHÔNG** có local BMR formula (đã grep confirm — 0 kết quả). Discrepancy chỉ giữa AI Provider Python và Backend C# fallback.

**Impact ví dụ**: User 70kg, 170cm, 25t, nam, moderate, goal=cut:
- AI Provider trả: 2200 × 0.85 = **1870 kcal**, protein = 2200×0.85×0.25/4 = **117g**
- Backend Fallback trả: 2200 × 0.80 = **1760 kcal**, protein = 2.2×70 = **154g**
- **Chênh lệch: 110 kcal/ngày + 37g protein**

**Fix**: Lấy `NutritionCalcService.cs` làm chuẩn (tiên tiến hơn — dùng g/kg protein, hỗ trợ Katch-McArdle body fat %). Update `nutrition_llm.py:calculate_nutrition_mifflin()` cho khớp:

```python
# nutrition_llm.py — update goal adjustment:
goal_adj = {"lose": 0.80, "cut": 0.80, "gain": 1.10, "bulk": 1.10}
# Protein: 2.2g/kg khi cut, 1.8g/kg khi khác
protein_per_kg = 2.2 if goal in ["lose","cut"] else 1.8
protein = int(protein_per_kg * weight_kg)
fat = int(calories * 0.25 / 9)
carbs = max(0, int((calories - protein*4 - fat*9) / 4))
```

**Files sửa**: `ai-provider/nutrition_llm.py` (lines 161-222)

---

#### Commit 5C: 🟡 Xóa Dead Code AI Provider (3 chỗ) — CONFIRMED

**Chỗ 1** — `_init_gemini()` toàn hàm (line 91-110): Không có caller nào gọi, `return` ở line 93 → toàn bộ là dead code.

**Chỗ 2** — `get_nutrition_advice()` fallback unreachable (line 296-300): `return` ở line 294 → code fallback formula bên dưới KHÔNG BAO GIỜ chạy. **Hệ quả**: Khi Gemini down → `ensure_gemini_service_available()` raise exception → trả 503 thay vì fallback sang formula. (Backend đã bù bằng `BuildOfflineFallback()` nhưng AI Provider mất self-healing)

**Chỗ 3** — Voice parse `if False` (line 580-585): Dead code hiển nhiên.

**Fix**:
```python
# Chỗ 1: XÓA toàn bộ hàm _init_gemini()

# Chỗ 2: Sửa get_nutrition_advice() để fallback đúng:
def get_nutrition_advice(...):
    try:
        ensure_gemini_service_available()
        return get_nutrition_advice_gemini(...)
    except (GeminiQuotaExhaustedError, GeminiUnavailableError):
        logger.info("Gemini not available, using Mifflin-St Jeor formula")
        result = calculate_nutrition_mifflin(...)
        result["source"] = "formula"
        return result

# Chỗ 3: XÓA block `if False: ...` (line 580-585)
```

**Files sửa**: `ai-provider/nutrition_llm.py`

---

#### Commit 5D: 🟡 Thêm upper bound validation nutrition — CONFIRMED

**Vấn đề**: `nutrition_llm.py:262` chỉ check lower bound, KHÔNG check upper:
```python
if carbs < 50 or calories < 1000 or protein < 30:  # ← thiếu max
```

**Phản biện**: `carbs < 50` reject keto diet — nhưng hệ thống chưa hỗ trợ keto, nên OK tạm thời. Vấn đề chính là **thiếu upper bound** — Gemini output 50000 kcal vẫn pass validation.

**Fix**:
```python
if (calories < 1000 or calories > 5000 or
    protein < 30 or protein > 300 or
    carbs < 20 or carbs > 600 or
    fat < 10 or fat > 200):
    result = calculate_nutrition_mifflin(...)
```

**Files sửa**: `ai-provider/nutrition_llm.py` (line 262)

---

#### Commit 5E: 🟡 YOLO confidence → env var (thay hardcode)

**Vấn đề**: `app.py:294` hardcode `conf=0.50`.

**Phản biện**: 0.50 không quá thấp cho food detection recall-focused. Nhưng nên là config để tuning theo data thực tế.

**Fix**:
```python
YOLO_CONFIDENCE = float(os.environ.get("YOLO_CONFIDENCE", "0.50"))
# ...
res = model(path, conf=YOLO_CONFIDENCE)
```

**Files sửa**: `ai-provider/app.py` (line 294)

---

#### Commit 5F: 🟢 Gemini token optimization — formula tính, Gemini chỉ explain

**Vấn đề**: Prompt (line 233-245) chứa công thức Mifflin-St Jeor → bắt Gemini LÀM TÍNH. Python đã có `calculate_nutrition_mifflin()` tính chính xác 100%.

**Phản biện**: Cost thấp (~$0.0001/call), nhưng LLM arithmetic không guaranteed. Gemini value nằm ở **explanation tiếng Việt**, không phải arithmetic.

**Fix**: Tính formula trước → gửi KẾT QUẢ cho Gemini explain:
```python
def get_nutrition_advice_gemini(...):
    # Tính formula trước (chính xác 100%)
    base = calculate_nutrition_mifflin(gender, age, height_cm, weight_kg, activity_level, goal)
    
    # Gemini CHỈ giải thích kết quả
    prompt = f"""Giải thích ngắn gọn bằng tiếng Việt tại sao mục tiêu này phù hợp:
    {gender}, {age} tuổi, {height_cm}cm, {weight_kg}kg, {activity_level}, goal={goal}
    → Calories: {base['calories']}, Protein: {base['protein']}g, Carbs: {base['carbs']}g, Fat: {base['fat']}g
    CHỈ trả lời 1-2 câu giải thích."""
    
    explanation = query_gemini(prompt, cache_ttl=600)
    base["explanation"] = explanation or base["explanation"]
    base["source"] = "formula+gemini"
    return base
```

**Lợi ích**: Giảm ~50% tokens, numbers 100% chính xác, vẫn có AI explanation.

**Files sửa**: `ai-provider/nutrition_llm.py` (lines 227-281)

---

### 📊 Benchmark so sánh Competitors (2026)

| Feature | EatFitAI | MyFitnessPal | Yazio | Lose It! |
|---------|----------|-------------|-------|----------|
| Food scan (camera) | ✅ YOLO custom | ✅ Passio.ai | ✅ AI | ✅ Snap It |
| Portion estimation | ❌ Manual | ✅ AI | ✅ AI | ⚠️ Basic |
| Barcode scan | ❌ → Commit 6A | ✅ | ✅ | ✅ |
| AI meal insights | ✅ Gemini | ✅ | ✅ | ⚠️ |
| Recipe suggest | ✅ DB match | ✅ AI | ❌ | ❌ |
| Cooking instructions AI | ✅ **UNIQUE** | ❌ | ❌ | ❌ |
| Voice input (tiếng Việt) | ✅ **UNIQUE** | ❌ | ❌ | ❌ |
| Teach/correct AI | ✅ **UNIQUE** | ❌ | ❌ | ❌ |
| Nutrition label scan | ❌ Future | ✅ | ✅ | ✅ |
| DB size | Custom VN | 20M+ crowd | Curated EU | 60M+ crowd |

**EatFitAI có 3 features UNIQUE**: Cooking Instructions AI, Voice tiếng Việt, Self-learning Label.

> **📝 Kết luận**: AI features hoạt động nhưng có **2 logic bug nghiêm trọng** (5A, 5B) cần fix ngay. Dead code + optimization (5C-5F) nên fix sớm.

---

## 6. Features Mới

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20)

**Các tính năng tiêu chuẩn app nutrition ĐÃ CÓ:**

| Tính năng | File | Trạng thái |
|---|---|---|
| Meal logging | `MealDiaryScreen.tsx` (37KB) | ✅ |
| Food search | `FoodSearchScreen.tsx` | ✅ |
| Custom dish | `CustomDishScreen.tsx` | ✅ |
| Water tracking | `HomeScreen.tsx` | ✅ |
| Stats/biểu đồ | `StatsScreen.tsx` (82KB) + Week/Month | ✅ |
| Achievements | `AchievementsScreen.tsx` | ✅ |
| Notifications | `NotificationsScreen.tsx` + `notificationService.ts` | ✅ |
| Dietary restrictions | `DietaryRestrictionsScreen.tsx` | ✅ |
| Nutrition settings | `NutritionSettingsScreen.tsx` | ✅ |
| AI Scan food | `AIScanScreen.tsx` | ✅ |
| Voice input | `VoiceScreen.tsx` | ✅ |
| Recipe suggestions | `RecipeSuggestionsScreen.tsx` | ✅ |

**Các tính năng CHƯA CÓ — cần thêm:**

### Commit 6A: Barcode Scanner

**Mục đích**: Quét mã vạch trên bao bì → tự tra thông tin dinh dưỡng.

**Tại sao cần?** Hầu hết app nutrition (MyFitnessPal, Yazio, Lose It!) đều có. User quét mã vạch nhanh hơn gõ tay 10x.

**Hướng dẫn implement**:

1. **Database sẵn sàng**: DTO `FoodItemDto.cs` ĐÃ CÓ field `Barcode` → DB đã support

2. **API miễn phí**: [OpenFoodFacts API](https://wiki.openfoodfacts.org/API)
   - Endpoint: `https://world.openfoodfacts.org/api/v2/product/{barcode}`
   - Miễn phí, không cần API key
   - Database 3 triệu+ sản phẩm (Việt Nam có ~20,000)

3. **Mobile dependencies**:
```bash
npx expo install expo-camera expo-barcode-scanner
```

4. **Flow**:
```
User mở camera → quét barcode → gọi OpenFoodFacts API
→ Nhận tên + calories + protein + carbs + fat
→ Hiển thị → User xác nhận → Thêm vào meal diary
```

5. **Files cần tạo/sửa**:
   - `[NEW] screens/diary/BarcodeScanScreen.tsx` — UI quét
   - `[NEW] services/barcodeService.ts` — gọi OpenFoodFacts API
   - `[MODIFY] navigation` — thêm route

### Commit 6B: Data Export (PDF/CSV)

**Mục đích**: User tải dữ liệu ăn uống ra file để in, gửi bác sĩ/PT, hoặc backup.

**Tại sao cần?** Nhiều user muốn chia sẻ data với nutritionist/bác sĩ. MyFitnessPal, Cronometer đều có.

**Hướng dẫn implement**:

1. **Backend — API endpoint mới**:
```csharp
// [NEW] Controllers/ExportController.cs
[HttpGet("csv")]
[Authorize]
public async Task<IActionResult> ExportCsv(
    [FromQuery] DateTime startDate,
    [FromQuery] DateTime endDate)
{
    // Query meal diary entries trong khoảng thời gian
    // Tạo CSV: Date, Meal, Food, Calories, Protein, Carbs, Fat
    // Return file download
}

[HttpGet("pdf")]
[Authorize]
public async Task<IActionResult> ExportPdf(...)
{
    // Tương tự nhưng tạo PDF (dùng QuestPDF - free, open source)
}
```

2. **NuGet package cho PDF**:
```bash
dotnet add package QuestPDF  # Free cho non-commercial, $700/year commercial
# HOẶC miễn phí:
dotnet add package iTextSharp  # AGPL license
```

3. **Mobile — Nút Export trong màn hình Stats**:
```typescript
// Thêm nút "Export" trên StatsScreen
// Gọi API → nhận file → dùng expo-sharing để share/save
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
```

4. **Files cần tạo/sửa**:
   - `[NEW] eatfitai-backend/Controllers/ExportController.cs`
   - `[MODIFY] eatfitai-mobile/src/app/screens/stats/StatsScreen.tsx` — thêm nút Export

### Commit 6C: Offline Mode (Cơ bản)

**Mục đích**: Khi mất mạng, user vẫn xem được data cũ và ghi meal → sync khi có mạng.

**Tại sao cần?** Đặc biệt quan trọng ở Việt Nam — nhiều nơi WiFi/4G không ổn. App crash khi mất mạng = UX tệ.

**Hướng dẫn implement (phức tạp nhất, chia giai đoạn)**:

**Giai đoạn 1 — Read-only offline** (ưu tiên):
```typescript
// Dùng @tanstack/react-query persistor
// Data đã fetch sẽ được cache local
// Mất mạng → hiện data cũ thay vì lỗi

// 1. Cài dependencies:
npx expo install @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @react-native-async-storage/async-storage

// 2. Wrap QueryClient với persister:
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
```

**Giai đoạn 2 — Write offline + sync** (phức tạp hơn):
```typescript
// Dùng mutation queue + @react-native-community/netinfo
// Khi offline: lưu mutation vào queue local
// Khi online lại: replay queue → sync lên server
// Cần xử lý conflict resolution
```

**Files cần tạo/sửa**:
- `[MODIFY] src/services/queryClient.ts` — thêm persister
- `[NEW] src/services/offlineQueue.ts` — queue mutations
- `[NEW] src/hooks/useNetworkStatus.ts` — detect online/offline
- `[MODIFY] App.tsx` — wrap với PersistProvider

> **📝 Recommendation**: Làm giai đoạn 1 trước (read-only offline ~2-3 giờ). Giai đoạn 2 (write offline) phức tạp hơn nhiều, để sprint sau.

---

## 7. Hiệu năng (Performance)

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20)

#### 7A. Mobile — React Native Performance

| Hạng mục | Trạng thái | Chi tiết |
|---|---|---|
| `useMemo/useCallback` | ✅ **ĐÃ CÓ** | 50+ chỗ dùng đúng cách (Stats, Profile, Meals, Voice) |
| List virtualization | ⚠️ **HẦU HẾT DÙNG ScrollView** | Chỉ 2 screen dùng `FlatList` (Achievements, IntroCarousel). Các screen like `FoodSearchScreen`, `MealDiaryScreen` dùng `ScrollView` |
| Image optimization | ⚠️ **CHƯA CÓ** | Không dùng `expo-image` hay `FastImage` — ảnh load chậm + không cache |
| Query cache (staleTime) | ⚠️ **CHỈ 1 CHỖ** | Chỉ `useAiStatus.ts` có `staleTime: 15s`. Các query khác = 0 (refetch mỗi lần focus) |
| Bundle size | ⬜ Chưa kiểm tra | Cần chạy `npx expo export` để xem |

**Giải thích đơn giản**:

1. **ScrollView vs FlatList**:
   - `ScrollView` = load TẤT CẢ items cùng lúc, kể cả items ngoài màn hình → chậm khi nhiều data
   - `FlatList` = chỉ render items đang hiển thị → nhanh hơn 5-10x khi list dài
   - **Screens cần sửa**: `FoodSearchScreen` (kết quả tìm kiếm dài), `MealDiaryScreen` (danh sách bữa ăn)

2. **Image optimization**:
   - React Native `<Image>` mặc định không cache ảnh → mỗi lần mở app load lại
   - `expo-image` có cache tự động, progressive loading, blur placeholder
   - **Benefit**: App cảm giác nhanh hơn đáng kể

3. **Query staleTime**:
   - Hiện tại hầu hết query có `staleTime: 0` → mỗi lần focus screen = gọi API lại
   - Thêm `staleTime: 30000` (30s) cho data ít thay đổi → giảm API calls ~70%

### Commit 7A: ScrollView → FlatList cho list screens

**Files cần sửa:**

| File | Vấn đề | Giải pháp |
|---|---|---|
| `FoodSearchScreen.tsx` | ScrollView render toàn bộ kết quả tìm | Đổi sang FlatList |
| `MealDiaryScreen.tsx` | ScrollView render toàn bộ danh sách meal | Đổi sang FlatList/SectionList |

**Pattern sửa:**
```typescript
// TRƯỚC:
<ScrollView>
  {items.map(item => <FoodItem key={item.id} {...item} />)}
</ScrollView>

// SAU:
<FlatList
  data={items}
  renderItem={({ item }) => <FoodItem {...item} />}
  keyExtractor={item => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### Commit 7B: expo-image thay thế Image

**Hướng dẫn:**
```bash
npx expo install expo-image
```

```typescript
// TRƯỚC:
import { Image } from 'react-native';
<Image source={{ uri: foodImage }} />

// SAU:
import { Image } from 'expo-image';
<Image
  source={{ uri: foodImage }}
  placeholder={blurhash}        // Blur placeholder khi loading
  contentFit="cover"
  transition={200}               // Fade-in animation
  cachePolicy="memory-disk"      // Cache tự động
/>
```

### Commit 7C: Query staleTime optimization

**Pattern sửa cho các hooks/queries:**
```typescript
// Data ít thay đổi (profile, settings):
useQuery({ queryKey: ['profile'], queryFn: ..., staleTime: 5 * 60 * 1000 }) // 5 phút

// Data thay đổi vừa (meal diary hôm nay):
useQuery({ queryKey: ['meals'], queryFn: ..., staleTime: 30 * 1000 }) // 30 giây

// Data real-time (AI status):
useQuery({ queryKey: ['aiStatus'], queryFn: ..., staleTime: 15 * 1000 }) // 15 giây (đã có)
```

#### 7B. AI Provider — Python Performance

| Hạng mục | Trạng thái | Chi tiết |
|---|---|---|
| In-memory cache Gemini | ✅ **ĐÃ CÓ** | `SimpleCache` class, TTL 120-600s cho các loại query |
| Cache nutrition lookup | ✅ **ĐÃ CÓ** | `cache_ttl=600` (10 phút) cho nutrition data |
| Cache voice parse | ✅ **ĐÃ CÓ** | `use_cache=False` cho voice (đúng — mỗi lần khác nhau) |
| YOLO model load | ⚠️ Load khi startup | Xem CLOUD-004 ở Mục 5 |

> **📝 Kết luận**: AI Provider đã optimize tốt (cache Gemini). Chỉ cần lazy load YOLO model (CLOUD-004).

#### 7C. Backend — .NET Performance

| Hạng mục | Trạng thái | Chi tiết |
|---|---|---|
| DB connection pooling | ✅ **ĐÃ CÓ** | Supabase connection pool |
| Response compression | ⬜ Chưa kiểm tra | Có thể thêm `UseResponseCompression()` |
| EF Core AsNoTracking | ⚠️ Một số query thiếu | Queries read-only nên dùng `AsNoTracking()` để giảm memory |

### Commit 7D: Backend response compression

**Hướng dẫn:**
```csharp
// Program.cs — thêm 2 dòng:
builder.Services.AddResponseCompression(opts => {
    opts.EnableForHttps = true;
});

// Giữa middleware pipeline:
app.UseResponseCompression();  // Trước UseRouting
```

**Benefit**: JSON responses nhỏ hơn 60-80% → mobile load nhanh hơn, tiết kiệm data 3G/4G.

---

## 8. Documentation

### ✅ KẾT QUẢ AUDIT (2026-04-20)

**Docs hiện có trong `docs/`:**

| File | Nội dung | Trạng thái |
|---|---|---|
| `STABILIZATION_PLAN.md` | File này — plan ổn định | ✅ Đang cập nhật |
| Các docs khác | Cần rà soát | ⬜ Chưa kiểm tra hết |

### Commit 8A: API Documentation

**Mục đích**: Dev mới (hoặc tương lai bạn) mở project → biết ngay các API endpoint.

**Hướng dẫn:**
```csharp
// Đã có Swagger/OpenAPI → chỉ cần bật cho production
// Program.cs — bỏ if(isDevelopment) wrapper:
app.UseSwagger();
app.UseSwaggerUI();
```

Hoặc tạo file `docs/API_REFERENCE.md` tóm tắt các endpoint chính.

### Commit 8B: Deployment Guide

**Tạo `docs/DEPLOYMENT.md`** — hướng dẫn deploy lên Render:

```markdown
# EatFitAI Deployment Guide

## Prerequisites
- Render account
- Supabase project
- Brevo account (email)
- Firebase project (analytics)

## Environment Variables
| Variable | Service | Description |
|---|---|---|
| DATABASE_URL | Backend | Supabase connection string (port 5432) |
| JWT_KEY | Backend | Secret key cho JWT token |
| BREVO_API_KEY | Backend | API key cho gửi email |
| GEMINI_API_KEY | AI Provider | Google AI key |
| GOOGLE_WEB_CLIENT_ID | Backend | Google Sign-in |
...
```

### Commit 8C: Gom + cleanup docs cũ

**Mục đích**: Loại bỏ docs lỗi thời, dead, sai số. Gom vào 1 cấu trúc rõ ràng.

**Cấu trúc docs đề xuất:**
```
docs/
├── STABILIZATION_PLAN.md     # Plan ổn định (file này)
├── DEPLOYMENT.md             # Hướng dẫn deploy
├── API_REFERENCE.md          # API endpoints
├── ARCHITECTURE.md           # Kiến trúc tổng quan
└── CHANGELOG.md              # Lịch sử thay đổi
```

---

## 9. Data Integrity

### ✅ KẾT QUẢ AUDIT CODE (2026-04-20) — TIMEZONE BUG

**Vấn đề**: Backend trộn lẫn 3 cách xử lý thời gian. Render chạy **UTC** → user VN (UTC+7) bị ghi **sai ngày** khi dùng app từ 0:00-6:59 sáng.

| File | Code hiện tại | Vấn đề |
|---|---|---|
| `WaterIntakeController.cs:34,69,114` | `DateTime.UtcNow.AddHours(7)` | ✅ Đúng — nhưng hardcode rải rác |
| `VoiceController.cs:514` | `DateTime.Today` | ❌ SAI — Today = UTC trên Render |
| `VoiceController.cs:577,593` | `DateTime.Now` | ❌ SAI — Now = UTC trên Render |
| `VoiceProcessingService.cs:147,177,206` | `DateTime.Now.Date` | ❌ SAI — 3 chỗ |
| `UserService.cs:216` | `DateTime.Now` | ❌ SAI — cân nặng ghi nhầm ngày |
| `UserDto.cs:14` | `DateTime.Today` | ⚠️ Tuổi sai 1 ngày (minor) |

**Quyết định**: Hardcode UTC+7 (target user VN). Tạo helper method dùng thống nhất.

### Commit 9A: DateTimeHelper — Fix timezone toàn bộ

**File [NEW]** `Helpers/DateTimeHelper.cs`:
```csharp
namespace eatfitai_backend.Helpers
{
    public static class DateTimeHelper
    {
        private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

        /// <summary>Thời gian hiện tại theo giờ VN (UTC+7)</summary>
        public static DateTime VietnamNow() => DateTime.UtcNow.Add(VietnamOffset);

        /// <summary>Ngày hiện tại theo giờ VN</summary>
        public static DateOnly VietnamToday() => DateOnly.FromDateTime(VietnamNow());

        /// <summary>Ngày hiện tại theo giờ VN (DateTime, 00:00:00)</summary>
        public static DateTime VietnamTodayDateTime() => VietnamNow().Date;
    }
}
```

**Files cần sửa** (replace `DateTime.Now` / `DateTime.Today`):

| File | Sửa | Số chỗ |
|---|---|---|
| `VoiceController.cs` | `DateTime.Today` → `DateTimeHelper.VietnamTodayDateTime()`, `DateTime.Now` → `DateTimeHelper.VietnamNow()` | 3 |
| `VoiceProcessingService.cs` | `DateTime.Now.Date` → `DateTimeHelper.VietnamTodayDateTime()` | 3 |
| `UserService.cs` | `DateTime.Now` → `DateTimeHelper.VietnamNow()` | 1 |
| `UserDto.cs` | `DateTime.Today` → `DateTimeHelper.VietnamTodayDateTime()` | 1 |
| `WaterIntakeController.cs` | `DateTime.UtcNow.AddHours(7)` → `DateTimeHelper.VietnamToday()` | 3 |

**Tổng**: 11 chỗ sửa, 1 file mới.

### Commit 9B: Xóa Supabase Direct Bypass — waterService.ts

**Vấn đề**: `getMonthlyWaterIntake()` gọi **thẳng Supabase REST** bằng anon key, bypass toàn bộ JWT auth của backend. Backend endpoint `/api/water-intake/monthly` đã hoạt động đầy đủ.

**File sửa**: `eatfitai-mobile/src/services/waterService.ts`

| Hành động | Chi tiết |
|---|---|
| **XÓA** dòng 47-89 | Nhánh Supabase trực tiếp (anon key, không xác minh user) |
| **GIỮ** dòng 93-100 | Nhánh backend `/api/water-intake/monthly` (có JWT auth) |

**Sau khi sửa**, `getMonthlyWaterIntake()` chỉ còn:
```typescript
async getMonthlyWaterIntake(year: number, month: number): Promise<MonthlyWaterData> {
  const { data } = await apiClient.get<MonthlyWaterData>('/api/water-intake/monthly', {
    params: { year, month },
  });
  return data;
},
```

---

### Commit 9C → 9H: Console.log Cleanup — Production Logger

**Vấn đề**: 115+ `console.log/warn/error` trong `services/` — nhiều chỗ **không có `__DEV__` guard**, log ra token prefix, full API response ngay cả trên production build.

**Chiến lược production**:
- `logger.debug` / `logger.log` → **chỉ chạy khi `__DEV__`** (dev mode)
- `logger.warn` → **chỉ chạy khi `__DEV__`**
- `logger.error` → **LUÔN chạy** (production cần biết lỗi nghiêm trọng → feed vào Crashlytics)
- **XÓA hoàn toàn** log chứa token/sensitive data (không dùng logger, xóa hẳn)

#### Commit 9C: Tạo `logger.ts` utility [NEW]

**File [NEW]** `eatfitai-mobile/src/utils/logger.ts`:
```typescript
/**
 * Production-safe logger.
 * - debug/log/warn: chỉ chạy khi __DEV__ (dev build)
 * - error: LUÔN chạy (feed vào Crashlytics trên production)
 */
const logger = {
  debug: (...args: any[]) => { if (__DEV__) console.log('[DEBUG]', ...args); },
  log: (...args: any[]) => { if (__DEV__) console.log(...args); },
  warn: (...args: any[]) => { if (__DEV__) console.warn(...args); },
  error: (...args: any[]) => { console.error(...args); }, // Luôn chạy
};
export default logger;
```

#### Commit 9D: Auth & Token (nhạy cảm nhất)

| File | Số chỗ | Hành động |
|---|---|---|
| `secureStore.ts` | ~8 | **XÓA** log token prefix (dòng 90, 108, 130, 142). Các warn khác → `logger.warn` |
| `tokenService.ts` | ~4 | `console.log` → `logger.log` |
| `authSession.ts` | ~6 | `console.log` → `logger.log` |
| `apiClient.ts` | ~10 | **XÓA** log headers/token. Các log khác → `logger.log` |

#### Commit 9E: Google Auth

| File | Số chỗ | Hành động |
|---|---|---|
| `googleAuthService.ts` | ~8 | `console.log/warn/error` → `logger.*` |

#### Commit 9F: Core Services

| File | Số chỗ | Hành động |
|---|---|---|
| `diaryService.ts` | ~6 | **XÓA** `JSON.stringify(response.data)` (lag UI). Còn lại → `logger.log` |
| `waterService.ts` | ~1 | `console.warn` → `logger.warn` |
| `aiService.ts` | ~8 | `console.log/error` → `logger.*` |
| `voiceService.ts` | ~2 | `console.info` → `logger.log` |
| `shareService.ts` | ~1 | `console.error` → `logger.error` (giữ trên prod) |

#### Commit 9G: Infrastructure

| File | Số chỗ | Hành động |
|---|---|---|
| `ipScanner.ts` | ~18 | `console.log` → `logger.log` |
| `notificationService.ts` | ~15 | `console.log/error` → `logger.*` |

#### Commit 9H: Cleanup & verify

- Grep verify: `grep -r "console\.\(log\|warn\|info\)" src/services/` → phải = 0
- Chỉ còn `console.error` (qua `logger.error`) trên production

---

### Commit 9I: aiApiClient — Thêm 401 refresh interceptor

**Vấn đề**: `aiApiClient` (dùng cho AI scan, nutrition suggest) **thiếu response interceptor** xử lý 401. Khi token hết hạn, các tính năng AI báo lỗi trong khi các tính năng khác (qua `apiClient`) tự refresh bình thường.

**File sửa**: `eatfitai-mobile/src/services/apiClient.ts`

**Thêm sau dòng 388** (sau request interceptor của aiApiClient):
```typescript
// 401 refresh cho aiApiClient (giống apiClient)
aiApiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        const retryHeaders = AxiosHeaders.from(originalRequest.headers ?? {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        originalRequest.headers = retryHeaders;
        return aiApiClient(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  },
);
```

---

### Commit 9J: Water Target — Tính theo cân nặng user

**Vấn đề**: `WaterIntakeController.cs:73` hardcode `TargetMl = 2000` cho tất cả user. Thực tế target nước nên tuỳ thuộc cân nặng.

**Công thức**: `TargetMl = cân nặng (kg) × 30`

**Files sửa**:

| File | Thay đổi |
|---|---|
| `WaterIntakeController.cs` | Khi tạo record mới: query cân nặng user từ DB → tính `TargetMl = weight * 30`. Fallback 2000ml nếu chưa có cân nặng |

**Logic**:
```csharp
// Lấy cân nặng mới nhất của user
var latestWeight = await _db.WeightRecords
    .Where(w => w.UserId == userId)
    .OrderByDescending(w => w.MeasuredDate)
    .Select(w => w.Weight)
    .FirstOrDefaultAsync();

var targetMl = latestWeight > 0 ? (int)(latestWeight * 30) : 2000;
```

---

### ⏩ Backlog (để sau, không cấp bách)

| Vấn đề | Chi tiết | Lý do để sau |
|---|---|---|
| `GetUserIdFromToken()` copy-paste 12 controller | Tạo `BaseApiController` chứa hàm chung, 12 controller kế thừa | Không gây bug ngay, chỉ rủi ro khi sửa claim logic |
| Voice STT disabled (dead code) | `ENABLE_STT = False` cả 2 phía. Tích hợp Google Cloud Speech-to-Text sau | Tính năng chưa cần ngay, cần đánh giá chi phí API |

---

## Phụ lục A: Hướng dẫn UptimeRobot

### Bước 1: Tạo tài khoản

1. Truy cập [uptimerobot.com](https://uptimerobot.com)
2. Đăng ký free (50 monitors miễn phí)

### Bước 2: Tạo monitors

Tạo **2 monitors** với cấu hình:

**Monitor 1 — Backend**:

| Field | Giá trị |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | EatFitAI Backend |
| URL | `https://<backend-url>/health/live` |
| Monitoring Interval | 5 minutes (free tier min) |
| Alert Contacts | Email của bạn |

**Monitor 2 — AI Provider**:

| Field | Giá trị |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | EatFitAI AI Provider |
| URL | `https://<ai-provider-url>/healthz` |
| Monitoring Interval | 5 minutes |
| Alert Contacts | Email của bạn |

### Lưu ý

- Free tier UptimeRobot ping tối thiểu 5 phút (không phải 14 phút như plan gốc — thực ra 5 phút TỐT HƠN vì luôn dưới ngưỡng spin-down 15 phút)
- Nếu muốn nhận alert qua Telegram/Discord → thêm Alert Contact dạng webhook
- Free tier 50 monitors → chỉ dùng 2 = dư sức

---

## Cập nhật triển khai (2026-04-23)

### Tiến độ sprint hiện tại

- **~90%** scope code-only của sprint ổn định hóa + product wave đầu tiên đã được implement
- **~92%** phần code-applicable trong tài liệu này đã xong
- Phần còn lại chủ yếu là **manual ops** (keep-alive / cron) và **full release gate verification** trên môi trường thật

### Đã triển khai

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Security headers middleware | ✅ Xong | Thêm `SecurityHeadersMiddleware` và đăng ký trong `Program.cs` |
| ex.Message / raw 5xx cleanup | ✅ Xong phần trọng yếu | Sanitize các nhánh 500/503/504 chính ở backend auth / analytics / meal / user / nutrition / water / AI |
| DateTimeHelper cho VN timezone | ✅ Xong | Thêm helper và thay các điểm nhạy timezone liên quan profile / voice / water |
| Water target theo cân nặng | ✅ Xong | Dùng `weightKg * 30`, fallback `2000ml` |
| Direct Supabase water bypass | ✅ Xong | Mobile chỉ đi qua backend |
| aiApiClient 401 refresh parity | ✅ Xong | AI client có retry/refresh giống API client thường |
| Logger production-safe | ✅ Xong | Giảm `console.*` noise trong service chính, vẫn giữ error logging |
| Telemetry v1 (backend + mobile queue) | ✅ Xong | Có endpoint backend, queue local, flush retry, telemetry cho funnel chính |
| Weekly review API + mobile surface | ✅ Xong | Có API backend, StatsScreen, notification deep-link, telemetry open/complete |
| Barcode lookup + barcode mode | ✅ Xong | Có `/api/food/barcode/{barcode}` và barcode mode trên `AIScanScreen` |
| AI activity mapping fix | ✅ Xong | Online path dùng đúng `request.ActivityLevel` |
| AI formula parity / Gemini fallback | ✅ Xong | Python AI provider khớp backend hơn, fallback reachable, upper-bound validation |
| YOLO confidence env config | ✅ Xong | Không còn hardcode threshold |
| Offline readonly cache | ✅ Xong v1 | Cache profile / summary / diary / nutrition reads |
| Release metrics thresholds | ✅ Xong | Voice latency thresholds được ghi rõ trong smoke metrics |

### Đã verify

- `dotnet build` backend: ✅ pass
- Focused `dotnet test` cho auth / analytics / food / barcode / weekly-review: ✅ pass
- `npm run typecheck` mobile: ✅ pass
- Focused mobile Jest (telemetry / ai client retry / ai service / water / summary / food / logger): ✅ pass
- `python -m unittest` cho AI provider parity + runtime config: ✅ pass
- `node --check` cho release gate scripts: ✅ pass
- Android preview APK build: ✅ pass (2026-04-23)
- Android APK install lên emulator: ✅ pass (2026-04-23)

### Chưa hoàn tất

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Full device smoke gate (Appium) | 🟡 Partially done | Build + install APK ✅. Appium sanity khởi chạy được nhưng chưa chạy trọn flow do cloud cold-start |
| Full cloud smoke gate | ⬜ Chưa chạy | Cần backend/AI provider thật, secret thật, smoke account thật, artifact lane `_logs/production-smoke` |
| Manual ops cloud (keep-alive) | 🟡 Đang chọn phương án | 2 phương án: **UptimeRobot** (xem [Phụ lục A](#phụ-lục-a-hướng-dẫn-uptimerobot)) hoặc **Cron-job** (xem [Phụ lục B](#phụ-lục-b-cron-job-keep-alive)) |
| P2/P3 backlog | ⏩ Deferred | Meal planner, grocery, fasting, wearable sync, premium, micronutrients, coach dashboard |

### Ghi chú quan trọng

- 3 file store `useAuthStore.ts`, `useProfileStore.ts`, `useStatsStore.ts` đã được làm sạch trạng thái Git; trước đó chỉ dirty do line-ending/working-tree metadata, không phải thay đổi logic.

### Quyết định automation framework (2026-04-23)

- **Maestro**: Chuyển sang trạng thái **Legacy/Manual** — không còn trên critical path release gate
- **Appium (WebDriverIO + UiAutomator2)**: Trở thành **framework chính** cho Gate 2 (Android automation)
- Lý do: Appium mạnh hơn Maestro ở khả năng điều khiển device, fallback cascade (element click → mobile gesture → pointer actions → adb tap), và tích hợp artifact (screenshot + page source + logcat)
- Hạ tầng Appium đã sẵn sàng: `tools/appium/` với `sanity.android.js`, `cloud-proof.android.js`, `lib/common.js` (755 dòng helpers)

---

## Phụ lục B: Cron-job Keep-Alive

> Phương án thay thế UptimeRobot — sử dụng dịch vụ cron miễn phí bên ngoài để ping giữ server không ngủ.

### Tại sao dùng Cron-job?

| So sánh | UptimeRobot | Cron-job (cron-job.org / Easycron) |
|---|---|---|
| Chức năng chính | Monitoring + Alert khi server down | Lên lịch gọi HTTP theo thời gian cố định |
| Interval tối thiểu (free) | 5 phút | 1 phút (cron-job.org) |
| Alert khi fail | ✅ Email / Webhook | ✅ Email |
| Giao diện | Dashboard trực quan | Dashboard đơn giản |
| Giá | Free (50 monitors) | Free (5 jobs cron-job.org, 200 calls/tháng Easycron) |
| Ưu điểm | Monitoring chuyên nghiệp, uptime report | Ping chủ động, interval ngắn hơn, phù hợp keep-alive |
| Nhược điểm | Chỉ ping, không có scheduling logic | Không có uptime reporting chi tiết |

**Khuyến nghị**: Dùng **cả hai** — Cron-job để giữ server thức (keep-alive), UptimeRobot để giám sát uptime và nhận alert.

### Bước 1: Tạo tài khoản cron-job.org

1. Truy cập [cron-job.org](https://cron-job.org)
2. Đăng ký free (hỗ trợ 5 cron jobs miễn phí)

### Bước 2: Tạo cron jobs

**Job 1 — Backend Keep-Alive**:

| Field | Giá trị |
|---|---|
| Title | EatFitAI Backend Ping |
| URL | `https://<backend-url>/health/live` |
| Schedule | Every 5 minutes (`*/5 * * * *`) |
| Request Method | GET |
| Notification | On failure |

**Job 2 — AI Provider Keep-Alive**:

| Field | Giá trị |
|---|---|
| Title | EatFitAI AI Provider Ping |
| URL | `https://<ai-provider-url>/healthz` |
| Schedule | Every 5 minutes (`*/5 * * * *`) |
| Request Method | GET |
| Notification | On failure |

### Lưu ý quan trọng

- **Render Free Tier spin-down**: Sau 15 phút không có request → service ngủ. Cron ping 5 phút đảm bảo **luôn dưới ngưỡng 15 phút** → server không bao giờ ngủ.
- **Instance hours**: Render Free cấp 750 giờ/tháng/workspace. Nếu chạy **2 services always-on** → 2 × 720 giờ = **1440 giờ** → **VƯỢT budget**. Cần cân nhắc:
  - Chỉ keep-alive backend (critical), cho AI provider ngủ + dùng fallback formula
  - Hoặc nâng lên Render Starter ($7/service/tháng) cho 1 service
- **Alternatives miễn phí**: [Easycron](https://www.easycron.com/), [Google Cloud Scheduler](https://cloud.google.com/scheduler) (nếu có GCP project)
- Cron-job **không thay thế** monitoring — vẫn nên dùng UptimeRobot để biết khi nào server thật sự down.

---

## Lịch sử thảo luận

| Ngày | Mục | Quyết định |
|---|---|---|
| 2026-04-20 | CLOUD-006 | ❌ Loại bỏ — user có giải pháp warmup riêng |
| 2026-04-20 | CLOUD-007 | ✅ Đã chốt — đổi port 6543 → 5432 (user tự làm trên Render) |
| 2026-04-20 | Brevo | ✅ Xác nhận dùng Brevo API, không SMTP |
| 2026-04-20 | UptimeRobot | ✅ Viết hướng dẫn vào phụ lục |
| 2026-04-20 | SEC-009 | ✅ Chốt — chia commit theo controller (B) |
| 2026-04-20 | SEC-010 | ✅ Chốt — thêm security headers middleware |
| 2026-04-20 | SEC-017 | ❌ Loại bỏ — `expo-secure-store` đã an toàn |
| 2026-04-20 | SEC-020 | ✅ Chốt — dotnet sạch, npm audit fix |
| 2026-04-20 | TEL (Mục 3) | ✅ Chốt — Firebase Analytics + Crashlytics, ghi hướng dẫn |
| 2026-04-20 | AUTH (Mục 4) | ✅ Chốt — Đã hoạt động, không cần thay đổi |
| 2026-04-20 | AI (Mục 5) | ✅ Chốt — Tất cả features đã implement |
| 2026-04-20 | Features (Mục 6) | ✅ Chốt — Thêm Barcode, Export, Offline Mode |
| 2026-04-20 | PERF (Mục 7) | ✅ Chốt — FlatList, expo-image, staleTime, compression |
| 2026-04-20 | DOCS (Mục 8) | ✅ Chốt — API docs, Deployment guide, cleanup |
| 2026-04-20 | DATA (Mục 9) | ✅ Chốt — Timezone bug, hardcode UTC+7 cho VN, tạo DateTimeHelper |
| 2026-04-20 | 9B Supabase bypass | ✅ Chốt — Xóa nhánh Supabase direct trong waterService.ts |
| 2026-04-20 | 9C-9H Console.log | ✅ Chốt — Tạo logger.ts, chia 6 commit theo file group |
| 2026-04-20 | 9I aiApiClient | ✅ Chốt — Thêm 401 refresh interceptor cho AI client |
| 2026-04-20 | 9J Water target | ✅ Chốt — Tính theo cân nặng × 30ml |
| 2026-04-20 | #8+#9 NutritionCtrl | ✅ Gom vào commit 2H — validation + try-catch |
| 2026-04-20 | #4 GetUserIdFromToken | ⏩ Backlog — code duplication, không gây bug ngay |
| 2026-04-20 | #6 STT dead code | ⏩ Backlog — tích hợp Google Cloud STT sau |
| 2026-04-20 | **5A ActivityLevel** | 🔴 **BUG** — CONFIRMED. request.ActivityLevel bị ignore khi gọi AI Provider |
| 2026-04-20 | **5B GoalAdj 3 tầng** | 🔴 **BUG** — CONFIRMED. AI Provider −15% vs Backend −20%, chênh 110kcal/ngày |
| 2026-04-20 | **5C Dead code ×3** | 🟡 CONFIRMED — _init_gemini() + get_nutrition_advice() fallback + if False |
| 2026-04-20 | **5D Validation** | 🟡 CONFIRMED — thiếu upper bound (Gemini output 50000 kcal vẫn pass) |
| 2026-04-20 | **5E YOLO conf** | 🟡 Phản biện — 0.50 OK cho recall, chuyển env var thay hardcode |
| 2026-04-20 | **5F Token opt** | 🟢 Phản biện — cost thấp, optimization nice-to-have |
| 2026-04-20 | **Mobile BMR** | ❌ **SELF-CORRECTED** — Mobile KHÔNG có local BMR formula (claim sai) |
| 2026-04-20 | **Benchmark** | ✅ Thêm bảng so sánh MyFitnessPal/Yazio/LoseIt. EatFitAI có 3 UNIQUE features |

