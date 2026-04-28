# 🔧 EatFitAI — Hướng Cải Thiện Toàn Diện

> Updated: `2026-04-28` | Dựa trên đánh giá đa chiều từ Implementation Plan

---

## Tổng quan điểm số hiện tại

| Mặt đánh giá | Điểm | Mục tiêu |
|--------------|-------|----------|
| Học thuật | 8.0 → **9.0** | Bổ sung UML + Test Case Matrix |
| Kỹ thuật | 8.5 → **9.0** | Caching + Rate limiting |
| Bảo mật | 5.0 → **8.0** | ✅ Đã rotate credentials |
| Logic | 8.0 → **8.5** | Edge case handling |
| UI/UX | 7.5 → **8.5** | Sync Emerald Nebula |
| User Flow | 8.0 → **8.5** | Offline mode + retry |
| Chịu tải | 5.0 → **7.0** | Caching + keep-alive |
| Thương mại | 6.5 → **7.5** | Cost documentation |
| Testing | 7.0 → **8.5** | E2E test cases |
| Documentation | 9.0 → **9.5** | ✅ UML diagrams added |

---

## 1. HỌC THUẬT (8.0 → 9.0)

### ✅ Đã hoàn thành
- [x] Tạo UML Diagrams (ERD, Use Case, Sequence, Activity, Component, Deployment)
- [x] 36+ tài liệu kỹ thuật trong `docs/`

### ⬜ Cần bổ sung
- [ ] **Test Case Matrix** — Bảng ma trận: Chức năng × Test Cases × Kết quả
- [ ] **Bảng So sánh** — So sánh EatFitAI với 3 app đối thủ (MyFitnessPal, Lose It!, Yazio)
- [ ] **Bảng khảo sát** — Kết quả khảo sát người dùng (Google Form, ≥20 responses)

### Cách thực hiện
```markdown
## Test Case Matrix (Mẫu)
| # | Chức năng | Test Case | Input | Expected | Actual | Pass/Fail |
|---|-----------|-----------|-------|----------|--------|-----------|
| 1 | Đăng ký | Email hợp lệ | test@gmail.com | 201 Created | 201 | ✅ |
| 2 | Đăng ký | Email trùng | existing@gmail.com | 409 Conflict | 409 | ✅ |
| 3 | AI Scan | Ảnh phở bò | photo.jpg | Phở bò detected | Phở bò | ✅ |
```

---

## 2. BẢO MẬT (5.0 → 8.0)

### ✅ Đã hoàn thành
- [x] Credential rotation hoàn tất (JWT, Encryption, Internal Token)
- [x] PII masking trong AuthService logs (13 statements)
- [x] `.env` files không tracked trong git
- [x] Fail-closed EncryptionService trong Production

### ⬜ Cần cải thiện thêm
- [ ] **Git history scrub** — Dùng `git filter-repo` xóa credentials cũ khỏi history
- [ ] **Rate limiting** — Thêm middleware giới hạn request `/api/ai/*` endpoints
- [ ] **CORS hardening** — Chỉ cho phép origins cụ thể (mobile app domain)
- [ ] **Helmet/Security headers** — CSP, X-Frame-Options cho admin dashboard

### Ưu tiên triển khai
```
P0: Git history scrub (30 phút, 1 lần duy nhất)
P1: Rate limiting middleware (1 giờ)
P2: CORS + Security headers (30 phút)
```

---

## 3. KỸ THUẬT (8.5 → 9.0)

### Kiến trúc hiện tại — Điểm mạnh
- 3-tier architecture rõ ràng (Mobile → Backend → AI Provider)
- ONNX Runtime optimization cho YOLO model
- Gemini pool rotation với 6 projects
- Fallback chain: AI → Formula → Default

### ⬜ Cải thiện
- [ ] **Response Caching** — `IMemoryCache` cho food search results (TTL 5 phút)
- [ ] **Connection pooling** — Verify Npgsql connection pool settings
- [ ] **Health check cải tiến** — Thêm check R2 connectivity + Gemini availability
- [ ] **Structured logging** — Chuyển sang Serilog structured format cho production logs

### Code mẫu — MemoryCache cho FoodSearch
```csharp
// FoodService.cs
public async Task<List<FoodItemDto>> SearchAsync(string query)
{
    var cacheKey = $"food_search_{query.ToLowerInvariant()}";
    if (_cache.TryGetValue(cacheKey, out List<FoodItemDto> cached))
        return cached;

    var results = await _dbContext.FoodItems
        .Where(f => f.FoodName.Contains(query))
        .ToListAsync();

    _cache.Set(cacheKey, results, TimeSpan.FromMinutes(5));
    return results;
}
```

---

## 4. UI/UX (7.5 → 8.5)

### Điểm mạnh
- Emerald Nebula theme premium, gradient đẹp
- Glassmorphism effects cho cards
- Consistent design cho Home, Scan, Profile

### ⬜ Cần đồng bộ
- [ ] **About Screen** — Chưa sync Emerald theme (vẫn dùng legacy blue)
- [ ] **Privacy Policy** — Font/spacing không match SubScreenLayout
- [ ] **AI Insights** — Badge colors chưa dùng emerald tokens
- [ ] **Loading states** — Thêm skeleton loading cho cold start (30-60s)
- [ ] **Error states** — Retry button + friendly error messages khi network fail

### Skeleton Loading cho Cold Start
```tsx
// components/SkeletonLoader.tsx
const SkeletonLoader = () => (
  <View style={styles.container}>
    <ShimmerPlaceholder style={styles.avatar} />
    <ShimmerPlaceholder style={styles.titleLine} />
    <ShimmerPlaceholder style={styles.bodyLine} />
  </View>
);
```

---

## 5. CHỊU TẢI (5.0 → 7.0)

### Vấn đề hiện tại
- Render Free Tier: cold start 30-60s, 750h/month
- Gemini Free Tier: ~1500 RPD per project × 6 = ~9000 RPD tổng
- Không có caching layer

### ⬜ Giải pháp
- [ ] **Cron-job keep-alive** — Ping `/health/ready` mỗi 14 phút để tránh cold start
- [ ] **Response caching** — MemoryCache cho food search, nutrition targets
- [ ] **Image compression** — Giảm size ảnh trước khi upload R2 (max 1MB)
- [ ] **Lazy model loading** — ONNX model load on first request thay vì startup

### Keep-Alive Script
```bash
# cron: */14 * * * *
curl -sf https://eatfitai-backend-dev.onrender.com/health/ready > /dev/null
curl -sf https://eatfitai-ai-provider-dev.onrender.com/healthz > /dev/null
```

---

## 6. THƯƠNG MẠI (6.5 → 7.5)

### Điểm mạnh
- Chi phí vận hành ≈ $0 (all free tiers)
- Architecture đã document cho scale-up

### ⬜ Cần bổ sung
- [ ] **Cost Model Document** — Chi tiết chi phí theo tier và user scale
- [ ] **Upgrade Path** — Lộ trình từ Free → $7 Render → $25 Pro
- [ ] **Revenue Model** — Freemium plan: Free (5 scans/ngày) → Premium ($2.99/tháng)
- [ ] **User Growth Projection** — Dự kiến scale: 50 → 500 → 5000 users

### Bảng Chi Phí Dự Kiến
| Users | Render | Supabase | Gemini | R2 | Total/tháng |
|-------|--------|----------|--------|------|-------------|
| 50 | $0 | $0 | $0 | $0 | **$0** |
| 500 | $14 | $25 | $0 | $0.50 | **$39.50** |
| 5000 | $50 | $75 | $50 | $5 | **$180** |

---

## 7. TESTING (7.0 → 8.5)

### Hiện trạng
- 197 backend unit tests ✅
- 83 mobile Jest tests ✅
- Smoke test scripts ✅
- Device automation scripts ✅

### ⬜ Cần bổ sung
- [ ] **Integration Test** — Test E2E flow: Register → Scan → Save → Stats
- [ ] **API Contract Test** — Verify request/response schemas
- [ ] **Load Test** — K6 hoặc Artillery cho `/api/ai/vision/detect`
- [ ] **Test Case Matrix document** — Bảng chính thức cho báo cáo

### Load Test Mẫu (K6)
```javascript
import http from 'k6/http';
export default function() {
  http.get('https://eatfitai-backend-dev.onrender.com/health/ready');
}
export let options = {
  vus: 10,
  duration: '30s',
};
```

---

## 8. USER FLOW & TRẢI NGHIỆM (8.0 → 8.5)

### ⬜ Cải thiện
- [ ] **Offline Mode** — Cache diary data local bằng AsyncStorage khi mất mạng
- [ ] **Retry Logic** — Auto-retry API calls khi timeout (max 3 lần, exponential backoff)
- [ ] **Pull-to-refresh** — Tất cả list screens hỗ trợ pull refresh
- [ ] **Empty states** — Design empty state illustrations cho mỗi screen
- [ ] **Haptic feedback** — Vibration khi scan thành công, streak tăng

---

## 9. LOGIC (8.0 → 8.5)

### ⬜ Edge Cases cần xử lý
- [ ] **Negative calories** — Validate `Calories >= 0` trước khi save MealDiary
- [ ] **Future dates** — Block diary entries cho ngày tương lai
- [ ] **Duplicate entries** — Warn khi user thêm cùng 1 món trong cùng bữa
- [ ] **NutritionTarget gap** — Tự tạo target mặc định nếu user chưa có
- [ ] **Streak timezone** — Đảm bảo streak tính theo timezone user, không UTC

---

## 10. ROADMAP ƯU TIÊN

### Tuần 1 (Trước bảo vệ)
| # | Task | Thời gian | Impact |
|---|------|-----------|--------|
| 1 | ✅ UML Diagrams | Done | Học thuật +1.0 |
| 2 | Test Case Matrix | 2 giờ | Học thuật +0.5 |
| 3 | Keep-alive cron | 30 phút | Chịu tải +1.0 |
| 4 | Real-device QA evidence | 1 giờ | Testing +0.5 |

### Tuần 2 (Post-defense polish)
| # | Task | Thời gian | Impact |
|---|------|-----------|--------|
| 5 | MemoryCache food search | 2 giờ | Kỹ thuật +0.5 |
| 6 | Rate limiting middleware | 1 giờ | Bảo mật +1.0 |
| 7 | Emerald theme sync | 3 giờ | UI/UX +0.5 |
| 8 | Loading/error states | 2 giờ | UX +0.5 |

### Tuần 3+ (Commercial polish)
| # | Task | Thời gian | Impact |
|---|------|-----------|--------|
| 9 | Offline mode | 8 giờ | UX +1.0 |
| 10 | Cost model document | 2 giờ | Thương mại +0.5 |
| 11 | Git history scrub | 1 giờ | Bảo mật +1.0 |
| 12 | Integration tests | 4 giờ | Testing +1.0 |

---

> **Điểm trung bình sau cải thiện dự kiến: 7.25 → 8.5/10** — Mức "Rất tốt, sẵn sàng cho production beta"
