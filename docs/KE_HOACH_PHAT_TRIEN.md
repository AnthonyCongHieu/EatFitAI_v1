# 📋 EatFitAI - Kế Hoạch Phát Triển Thực Tế

> **Ngày cập nhật**: 2025-12-13  
> **Phiên bản**: 1.0  
> **Tác giả**: Development Team

---

## 📊 Phần 1: Đánh Giá Hiện Trạng (Thực Tế)

### 1.1 Tổng Quan Điểm Số

| Component | Score | Nhận Xét Thực Tế |
|-----------|-------|------------------|
| Mobile UI/UX | **9.0/10** | Đẹp, production-ready. Không cần sửa nhiều. |
| AI Vision | **8.0/10** | Hoạt động tốt với model có sẵn. Cần train model VN để tăng accuracy. |
| AI Nutrition | **7.5/10** | Phụ thuộc Ollama. Cần backup strategy. |
| AI Recipe | **8.5/10** | Tốt. Cần xử lý edge case khi Ollama down. |
| Voice AI | **7.0/10** | Hoạt động (Whisper STT + Ollama parsing). Cần improve accuracy. |
| Backend | **7.5/10** | Chạy được. Thiếu bảo mật cơ bản. |
| Security | **3.0/10** | **YẾU** - Không có rate limit, CORS mở toang. |
| Testing | **1.0/10** | **GẦN NHƯ KHÔNG CÓ** - ~5% coverage. |
| DevOps | **1.0/10** | **KHÔNG CÓ** - Chưa có CI/CD, Docker prod. |

**Điểm tổng thực tế: 6.5/10**

---

### 1.2 Danh Sách Hạn Chế Chi Tiết

#### 🔴 CRITICAL - Phải Fix Ngay (Blocking Deployment)

| ID | Hạn Chế | Impact |
|----|---------|--------|
| SEC-01 | Không có Rate Limiting | Brute-force attack, spam API |
| SEC-02 | CORS mở toàn bộ origin | Bất kỳ website nào cũng gọi được API |

#### 🟡 HIGH - Cần Fix Sớm (Ảnh Hưởng Chất Lượng)

| ID | Hạn Chế | Impact |
|----|---------|--------|
| AI-02 | Model YOLOv8 chưa train cho món VN | Độ chính xác thấp (~60%) với thực phẩm Việt |
| AI-03 | Ollama local có thể fail | AI trả về lỗi "không khả dụng" |
| OPS-01 | Test coverage ~5% | Không dám refactor, bug quay lại |
| OPS-02 | Không có CI/CD | Push code lỗi thẳng lên production |
| SEC-03 | Không giới hạn upload size | DoS qua upload ảnh lớn |

#### 🟢 MEDIUM - Cải Thiện Dần

| ID | Hạn Chế | Impact |
|----|---------|--------|
| FN-01 | Không có push notification | Người dùng quên ghi nhật ký |
| FN-02 | Không có Apple Sign-In | Mất user iOS không muốn dùng Google |
| FN-03 | Không đồng bộ multi-device | Mất dữ liệu khi đổi máy |
| UI-01 | Bundle size chưa optimize | App load chậm hơn có thể |
| UI-02 | Offline mode không hoạt động | App chết khi mất mạng |

---

## 🎯 Phần 2: Kế Hoạch Fix Hạn Chế (Thực Tế)

### 2.1 Tuần 1-2: Security & AI Critical Fixes

**Mục tiêu**: App an toàn để demo, không bị hack.

#### Task List Chi Tiết:

```
[SEC-01] Thêm Rate Limiting
├── Cài NuGet: AspNetCoreRateLimit
├── Config trong Program.cs:
│   ├── Auth endpoints: 5 req/min
│   ├── AI endpoints: 10 req/min
│   └── General: 60 req/min
├── Test bằng tool bombardment
└── Effort: 4 giờ

[SEC-02] Fix CORS
├── Sửa Program.cs
├── Whitelist chỉ frontend domain (localhost dev, production domain)
├── Test cross-origin request bị block
└── Effort: 1 giờ

[SEC-03] Limit Upload Size
├── Thêm [RequestSizeLimit(5_000_000)] cho upload endpoints
├── Config trong Program.cs: services.Configure<FormOptions>
├── Test upload file >5MB bị reject
└── Effort: 2 giờ

[AI-04] Voice AI Improvement
├── Improve Whisper accuracy cho tiếng Việt
├── Add offline fallback với Vosk (optional)
├── Cải thiện UX: loading states, error handling
└── Effort: 8 giờ (optional, đã hoạt động cơ bản)

[AI-03] Ollama Fallback
├── Đổi priority: Gemini API làm primary
├── Ollama làm fallback khi Gemini fail
├── Fallback cuối: công thức Mifflin-St Jeor
├── Test khi tắt Ollama container
└── Effort: 4 giờ
```

**Tổng effort Tuần 1-2: ~15 giờ**

---

### 2.2 Tuần 3-4: Testing Foundation

**Mục tiêu**: Có 30% test coverage cho core services.

#### Task List Chi Tiết:

```
[OPS-01] Unit Tests - AuthService
├── Test Login: valid/invalid credentials
├── Test Register: validation, duplicate email
├── Test Password Reset: 4-step flow
├── Test Token Refresh: expired/valid token
└── Effort: 12 giờ

[OPS-01] Unit Tests - NutritionInsightService
├── Test BMR calculation
├── Test Calorie targets
├── Test Macro percentages
└── Effort: 8 giờ

[OPS-01] Integration Tests - Main Flow
├── Register → Login → Add Meal → View Stats
├── Mock database với InMemory provider
└── Effort: 8 giờ
```

**Tổng effort Tuần 3-4: 28 giờ**
**Target Coverage: 30%** (realistic, không phải 60%)

---

### 2.3 Tháng 2: DevOps & Notifications

**Mục tiêu**: CI/CD hoạt động, có push notification.

#### Task List Chi Tiết:

```
[OPS-02] GitHub Actions CI
├── File: .github/workflows/ci.yml
├── Trigger: on push to main/develop
├── Steps: restore → build → test → report
├── Fail fast nếu tests không pass
└── Effort: 4 giờ

[OPS-03] Dockerfile Production
├── Multi-stage build cho .NET
├── Separate Dockerfile cho Python AI
├── docker-compose.yml cho local dev
└── Effort: 6 giờ

[FN-01] Push Notifications
├── Cài expo-notifications
├── Backend: Add notification service
├── Trigger: 
│   ├── Nhắc ghi bữa ăn (8h, 12h, 18h)
│   ├── Nhắc cập nhật cân nặng (weekly)
│   └── Nhắc check-in streak
└── Effort: 16 giờ
```

**Tổng effort Tháng 2: 26 giờ**

---

### 2.4 Tháng 3: AI Enhancement

**Mục tiêu**: AI chính xác hơn với món Việt.

#### Task List Chi Tiết:

```
[AI-02] Train YOLOv8 cho món VN
├── Thu thập dataset:
│   ├── Nguồn: Google Images, Foody, Cookpad VN
│   ├── Target: 50 loại thực phẩm phổ biến
│   ├── Mỗi loại: 100-200 ảnh
│   └── Total: 5,000-10,000 ảnh
├── Label dataset bằng Label Studio hoặc Roboflow
├── Train model:
│   ├── Base: yolov8s (small, fast)
│   ├── Epochs: 100
│   ├── Augmentation: flip, rotate, color jitter
│   └── Validate với 20% holdout set
├── Deploy model mới lên AI Provider
├── So sánh accuracy trước/sau
└── Effort: 40 giờ (2 tuần part-time)

Target Accuracy:
- Hiện tại: ~60% (model generic)
- Mong đợi: 75-80% (model VN trained)
- Lý tưởng: 85%+ (cần nhiều data hơn)
```

**Tổng effort Tháng 3: 40 giờ**

---

## 📅 Phần 3: Roadmap Tổng Thể

### 3.1 Timeline Thực Tế

```
┌────────────────────────────────────────────────────────────────┐
│ TUẦN 1-2 (Tháng 12/2025)                                       │
│ ├── [x] Security Hardening (7 giờ)                             │
│ ├── [x] Voice AI Improvement (optional)                        │
│ └── [x] AI Fallback Strategy (4 giờ)                           │
│ Deliverable: App an toàn để demo                               │
├────────────────────────────────────────────────────────────────┤
│ TUẦN 3-4 (Tháng 1/2026)                                        │
│ ├── [ ] Unit Tests cho core services (20 giờ)                  │
│ └── [ ] Integration Tests cho main flow (8 giờ)                │
│ Deliverable: 30% test coverage                                 │
├────────────────────────────────────────────────────────────────┤
│ THÁNG 2 (2/2026)                                               │
│ ├── [ ] GitHub Actions CI (4 giờ)                              │
│ ├── [ ] Docker production (6 giờ)                              │
│ └── [ ] Push Notifications (16 giờ)                            │
│ Deliverable: CI/CD pipeline + notifications                    │
├────────────────────────────────────────────────────────────────┤
│ THÁNG 3 (3/2026)                                               │
│ ├── [ ] Thu thập dataset VN food (20 giờ)                      │
│ └── [ ] Train + Deploy YOLOv8 VN (20 giờ)                      │
│ Deliverable: AI accuracy 75-80%                                │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Effort Summary

| Phase | Duration | Effort (giờ) | Owner |
|-------|----------|--------------|-------|
| Security Fixes | 2 tuần | 13-19 | Backend Dev |
| Testing | 2 tuần | 28 | Full-stack |
| DevOps + Notifs | 1 tháng | 26 | Full-stack |
| AI Training | 1 tháng | 40 | AI/ML |
| **TOTAL** | 3 tháng | **107-113 giờ** | - |

**Thực tế**: ~110 giờ / 3 tháng = ~9 giờ/tuần

---

## 🚀 Phần 4: Hướng Phát Triển Tương Lai

### 4.1 Sau Khi Fix Xong Hạn Chế (Q2 2026) - Priority P0-P1

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | AI Auto Meal Plan 7 ngày | 32 giờ | Killer feature |
| P1 | Apple Sign-In | 8 giờ | Thêm iOS users |
| P1 | Gamification (Badges, Streaks, Levels) | 32 giờ | Retention |
| P1 | Xác thực 2FA | 12 giờ | Security nâng cao |
| P2 | Apple Health / Google Fit sync | 24 giờ | Data integration |
| P2 | Offline mode với sync | 20 giờ | UX improvement |

---

### 4.2 Nâng Cấp Mô-đun AI (Q2-Q3 2026)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Train YOLOv8 VN | Dataset 5,000+ ảnh món Việt | 40 giờ |
| AI Meal Plan 7 ngày | Tự động tạo thực đơn tuần | 32 giờ |
| ML Thói quen | Phân tích pattern ăn uống cá nhân | 48 giờ |
| LLM Phân tích ảnh | Nhận diện món ăn + ước tính calories trực tiếp | 40 giờ |

---

### 4.3 Mở Rộng Chức Năng Dinh Dưỡng (Q2-Q3 2026)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Thực đơn tự động tuần | Điều chỉnh linh hoạt theo sở thích | 24 giờ |
| Theo dõi nước uống | Nhắc nhở + tracking hằng ngày | 16 giờ |
| Blog dinh dưỡng | Nội dung từ chuyên gia, tips healthy | 24 giờ |
| Chế độ ăn đặc biệt | Keto, Low-carb, Vegetarian, Vegan | 20 giờ |

---

### 4.4 Hoàn Thiện Hệ Thống Người Dùng (Q2 2026)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Push Notifications | Nhắc ghi bữa ăn, uống nước, cập nhật cân nặng | 16 giờ |
| Apple Sign-In | Đăng nhập cho iOS users | 8 giờ |
| 2FA | Xác thực hai yếu tố (OTP/Authenticator) | 12 giờ |
| Đồng bộ multi-device | Cloud sync dữ liệu | 32 giờ |

---

### 4.5 Tích Hợp Thiết Bị & Dịch Vụ Bên Ngoài (Q3 2026)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Apple Health / Google Fit | Lấy dữ liệu hoạt động thể chất | 24 giờ |
| Smartwatch sync | Theo dõi calories tiêu hao real-time | 40 giờ |
| App giao đồ ăn | Gợi ý món healthy từ GrabFood, ShopeeFood | 32 giờ |

---

### 4.6 Xây Dựng Tính Năng Cộng Đồng (Q3-Q4 2026)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Chia sẻ công thức | Upload recipe + hình ảnh | 24 giờ |
| Journey tracking | Lộ trình giảm cân/tăng cân chia sẻ với bạn bè | 32 giờ |
| Social features | Follow, Like, Comment | 40 giờ |
| Leaderboard | Bảng xếp hạng tuần/tháng theo mục tiêu | 16 giờ |
| Nutrition Challenges | Thử thách cộng đồng (7 ngày healthy, etc.) | 24 giờ |

---

### 4.7 Gamification & Tăng Động Lực (Q2-Q3 2026)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Huy hiệu (Badges) | Thành tựu: giảm 5kg, 30 ngày liên tục, etc. | 16 giờ |
| Streak rewards | Thưởng điểm duy trì thói quen | 12 giờ |
| Level system | Avatar + level up khi hoàn thành mục tiêu | 20 giờ |

---

### 4.8 Chăm Sóc Sức Khỏe Toàn Diện (Q4 2026 - 2027)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Theo dõi giấc ngủ | Phân tích tác động đến cân nặng | 24 giờ |
| Stress & Mindfulness | Thiền định, hít thở, relaxation | 20 giờ |
| Chu kỳ kinh nguyệt | Điều chỉnh dinh dưỡng theo chu kỳ (nữ) | 16 giờ |
| Chỉ số sức khỏe | Huyết áp, đường huyết, cholesterol | 32 giờ |
| Tích hợp xét nghiệm máu | Cá nhân hóa khuyến nghị theo kết quả lab | 40 giờ |

---

### 4.9 Đa Ngôn Ngữ & Mở Rộng Thị Trường (2027)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Multi-language | Tiếng Anh, Nhật, Hàn | 40 giờ |
| USDA Food Database | Tích hợp cơ sở dữ liệu quốc tế | 24 giờ |
| Cộng đồng theo quốc gia | Regional communities | 32 giờ |
| Influencer partnerships | Marketing với fitness/health influencers | Marketing |

---

### 4.10 Công Nghệ & Trải Nghiệm Nâng Cao (2027)

| Feature | Mô Tả | Effort |
|---------|-------|--------|
| Home Screen Widgets | iOS & Android widgets xem tiến độ | 24 giờ |
| Azure/AWS Deployment | Auto-scaling backend | 40 giờ |
| App Store & Play Store | Phát hành chính thức | 16 giờ |

---

### 4.11 Monetization (Q3 2026)

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Basic tracking, AI scan (5/ngày) |
| Premium | $4.99/tháng | Unlimited AI, meal plans, no ads |
| Pro | $9.99/tháng | + 1-1 nutrition coaching, advanced reports |

**Mô hình kinh doanh bổ sung:**
- In-app purchases: Gói training/diet plan đặc biệt
- Partnership: Phòng gym, healthy food brands
- Affiliate marketing: Supplements, thực phẩm healthy

**Target Revenue (Year 1):**
- 1,000 users × 5% conversion × $4.99 = $2,500/tháng
- Realistic expectation: $1,000-3,000/tháng

---

### 4.12 Long-term Vision (2027+)

```
Phase 1: Nutrition App (Hiện tại - Q1 2026)
    └── Focus: Food tracking, AI suggestions

Phase 2: Wellness Platform (Q2-Q4 2026)
    ├── Sleep tracking
    ├── Exercise integration (Health/Fit sync)
    ├── Stress/mindfulness
    └── Community features

Phase 3: Health Ecosystem (2027+)
    ├── Partnerships: gyms, restaurants, grocery
    ├── B2B API for health apps
    ├── International expansion (EN, JP, KR)
    └── AI health coach (GPT-powered)
```


---

## ⚠️ Phần 5: Rủi Ro và Mitigation

### 5.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Ollama không ổn định | HIGH | MEDIUM | Gemini API làm primary |
| YOLOv8 training không đạt target | MEDIUM | HIGH | Thuê thuê ngoài data labeling |
| Team thiếu người | HIGH | HIGH | Ưu tiên tasks, outsource |
| API costs cao bất ngờ | LOW | MEDIUM | Monitor usage, set limits |

### 5.2 Dependencies

```
Security Fixes
    └── Không dependency, làm ngay

Testing
    └── Depends: Security fixes done

DevOps
    └── Depends: Tests working

AI Training
    └── Depends: Dataset (có thể làm song song)

Notifications
    └── Depends: Backend stable
```

---

## 📝 Phần 6: Checklist Action Items

### Tuần 1 (Bắt đầu ngay)

- [ ] Install AspNetCoreRateLimit NuGet
- [ ] Config rate limits trong Program.cs
- [ ] Fix CORS whitelist
- [ ] Add RequestSizeLimit cho upload endpoints
- [ ] (Optional) Improve Voice AI accuracy
- [ ] Chuyển AI sang Gemini primary

### Tuần 2

- [ ] Test security changes
- [ ] Implement Voice decision
- [ ] Test AI fallback khi Ollama down
- [ ] Document changes

### Tuần 3-4

- [ ] Setup xUnit test project
- [ ] Write AuthService unit tests
- [ ] Write NutritionInsightService unit tests
- [ ] Write integration test cho main flow
- [ ] Setup test coverage reporting

### Tháng 2

- [ ] Create .github/workflows/ci.yml
- [ ] Create Dockerfile cho .NET
- [ ] Create Dockerfile cho Python
- [ ] Create docker-compose.yml
- [ ] Implement push notifications

### Tháng 3

- [ ] Thu thập VN food dataset (5,000+ images)
- [ ] Label dataset (50 categories)
- [ ] Train YOLOv8 model
- [ ] Validate accuracy
- [ ] Deploy model mới

---

## 📊 Phần 7: Success Metrics

### KPIs Thực Tế (Không Ảo)

| Metric | Hiện Tại | 1 Tháng | 3 Tháng |
|--------|----------|---------|---------|
| Security Score | 3/10 | 7/10 | 8/10 |
| Test Coverage | 5% | 15% | 30% |
| AI Accuracy (VN) | 60% | 65% | 75% |
| CI/CD | ❌ | ❌ | ✅ |
| Push Notifs | ❌ | ❌ | ✅ |
| Voice AI | 7.0/10 | 8.0/10 | Improve accuracy |

### Definition of Done

- **Security**: Thử brute-force login không được
- **Testing**: CI fails khi tests fail
- **AI**: Scan "phở" nhận đúng "phở" 8/10 lần
- **Notifications**: User nhận được nhắc nhở đúng giờ

---

## 🎓 Kết Luận

### Thực Tế là:

1. **App đẹp nhưng chưa production-ready** về security và testing
2. **AI hoạt động nhưng chưa tối ưu** cho thị trường VN
3. **Voice AI hoạt động** - cần improve accuracy cho tiếng Việt
4. **110 giờ effort** trong 3 tháng để fix các hạn chế chính
5. **Sau 3 tháng** mới nên nghĩ đến monetization

### Lời Khuyên:

> **"Làm ít, làm đúng"** - Tập trung fix security + 30% tests trước khi thêm feature mới.

---

**Document Location**: `docs/KE_HOACH_PHAT_TRIEN.md`  
**Last Updated**: 2025-12-13  
**Review Date**: Cuối mỗi tuần
