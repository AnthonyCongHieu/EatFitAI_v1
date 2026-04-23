# Product Checklist - 2026-04-19

Muc tieu cua checklist nay:

- Chot lai cac nghien cuu benchmark app dinh duong / giam can / AI coach
- Xac dinh chuc nang dang co, chuc nang thieu, va muc uu tien
- Chot thu tu lam viec truoc khi ship them feature moi
- Tach ro viec "demo duoc" va viec "ship production on dinh"

## 1. Hien trang EatFitAI

### Da co san

- Mobile app Expo / React Native voi auth, onboarding, diary, profile, stats
- Backend ASP.NET Core + PostgreSQL / Supabase
- AI provider Python cho vision + Gemini nutrition / voice parsing
- Local notifications cho meal reminders, water, streak, AI tips
- Smoke / release scripts, health checks, readiness endpoint
- Google sign-in, email verification, forgot/reset password
- Voice flow text parse + execute
- AI scan, recipe suggestions, nutrition insight flows

### Da xac nhan tu code va logs

- Backend cloud va AI provider hien dang o `plan: free`
- AI provider chi chay `1 worker`, `2 threads`
- AI controller dang bi rate limit `20 req/phut`
- Search API nhanh va on dinh
- Voice parse va scan AI van co do tre cao
- Analytics san pham hien moi la stub, chua co SDK that

## 2. Benchmark app lon va bai hoc rut ra

### MyFitnessPal

- Manh ve breadth feature, subscription tiers, barcode, fasting, meal scan, meal planner
- Bai hoc:
  - Barcode scanner la baseline feature cua category
  - Meal planner + grocery flow phu hop de monetization
  - Phan cap Free / Premium / Premium+ rat ro

### Lifesum

- Manh ve meal plans, barcode, diets, weekly score, wearable integrations
- Bai hoc:
  - Meal plans + shopping list tang kha nang quay lai
  - Weekly score / weekly review tao retention tot
  - Health integrations la de phan biet o phase 2

### Cronometer

- Manh ve data quality, charts, micronutrients, verified food DB
- Bai hoc:
  - Neu muon phuc vu power users thi can do sau du lieu, khong chi calories
  - Charts va nutrient depth la loi the cao cap, khong phai MVP truoc mat

### YAZIO

- Manh ve food diary, barcode, fasting, buddies, recipes
- Bai hoc:
  - Buddies / social motivation co ich cho retention
  - Fasting la feature thuong mai hoa tot, nhung khong can lam truoc barcode

### Noom

- Manh ve coaching loop, body scan, habit content, photo/voice logging, rewards
- Bai hoc:
  - AI khong nen dung mot minh; can coach loop va content loop
  - Onboarding + daily habits + weekly review moi tao ra retention ben vung

## 3. Gap checklist

### P0 - Bat buoc truoc khi mo rong feature

- [ ] Chot cloud strategy:
  - Backend khong tiep tuc phu thuoc free plan cho production
  - Quy uoc ro service nao always-on, service nao co the sleep
- [ ] Them product analytics that:
  - screen views
  - onboarding funnel
  - register -> verify -> login -> onboarding complete
  - search -> food detail -> add diary
  - AI scan start -> result -> save
  - voice parse -> preview -> execute
- [ ] Them crash / error tracking that
  - mobile runtime errors
  - backend API failures
  - AI provider failures
- [ ] Dat release gates theo traffic that:
  - search pass
  - auth pass
  - scan pass
  - nutrition pass
  - voice latency budget
- [ ] Chot "AI fallback policy" ro rang:
  - app van dung duoc khi AI down
  - feature nao degrade gracefully
  - thong bao nao hien cho user

### P1 - Nen ship som nhat sau khi P0 dat

- [ ] Barcode scanner
- [ ] Cai thien manual logging speed:
  - favorites
  - recent foods
  - common meals
  - same as yesterday
- [ ] Cai thien AI scan reliability:
  - mapping loop
  - teach-label flow
  - scan -> review -> save flow pass trong smoke gate
- [ ] Weekly review / progress summary cho user
- [ ] Better nutrition targets UX:
  - ro nguon AI hay formula
  - retry / fallback UX

### P2 - Retention / Premium candidates

- [ ] Meal planner
- [ ] Grocery list
- [ ] Intermittent fasting
- [ ] Wearable / Apple Health / Health Connect sync
- [ ] Progress photos / body scan
- [ ] Buddies / accountability
- [ ] Premium tiering

### P3 - Power-user / Pro depth

- [ ] Micronutrients va charts sau hon
- [ ] Export / CSV / PDF
- [ ] Coach / expert dashboard
- [ ] Admin analytics / cohort retention dashboard

## 4. Ship order de xuat

### Khong nen lam ngay

- Khong nen tiep tuc them nhieu feature AI moi truoc khi co analytics va cloud strategy
- Khong nen lam social/community truoc barcode + analytics + scan reliability
- Khong nen doi vao micronutrients sau truoc khi diary + scan + retention loop on

### Nen lam truoc

1. On dinh backend production lane
2. Them analytics + error tracking
3. Fix AI scan / nutrition gates dang fail
4. Ship barcode scanner
5. Ship weekly review / retention loop

## 5. Decision hien tai

### Nen ship feature truoc hay lam viec khac truoc?

Khuyen nghi:

- Khong ship them mot cum feature lon truoc
- Lam `1 stabilization sprint` truoc
- Sau sprint do, ship `Barcode Scanner` la feature moi dau tien

Ly do:

- Hien tai nut co chai lon nhat khong nam o UI ma nam o cloud + AI reliability + telemetry
- Neu ship them feature moi luc nay, team se khong biet user rot o dau va khong biet slowness den tu dau
- Barcode la feature baseline co gia tri thuc te va de user hieu ngay

## 6. Cloud / keep-alive checklist

### Dieu can nho

- Free Render khong duoc xem la production-ready
- Free web service spin down sau 15 phut khong co inbound traffic
- Wake-up co the mat khoang 1 phut
- Free instance hours chi co 750 gio / workspace / thang
- 2 web services free always-on se vuot budget gio thang

### Best-effort neu van con o free tier

- [ ] Ping backend rieng
- [ ] Ping AI provider rieng neu muon giam cold-start AI
- [ ] Dung endpoint nhe:
  - backend: `/health/live`
  - ai-provider: `/healthz`
- [ ] Interval ping 5 phut
- [ ] Khong ping endpoint nang / can DB neu muc tieu chi la keep-alive
- [ ] Chap nhan rang van khong co dam bao always-on

### Huong production dung

- [ ] Move backend sang paid instance
- [ ] Can nhac cho AI provider paid hoac chap nhan AI sleep + fallback
- [ ] Neu can always-on that su cho ca 2 services thi khong dung free plan

## 7. Nhan dinh chot

Uu tien kinh doanh hop ly nhat hien tai:

- Buoc 1: on dinh he thong va do duoc hanh vi user
- Buoc 2: ship barcode scanner
- Buoc 3: ship weekly review / retention loop
- Buoc 4: moi mo rong meal planner / fasting / wearable sync

## 8. Nguon tham khao chinh

- Render Free docs
- Render Scaling docs
- MyFitnessPal help center
- Lifesum features
- Cronometer product pages
- YAZIO food diary va AI calorie tracking pages
- Noom free features pages

## 9. Progress update - 2026-04-23

### Tien do sprint dang lam

- Khoang **85%** scope code-only cua stabilization sprint + first product wave da xong
- P0 trong checklist nay da dat muc **ship-ready ve code**, nhung **chua dong full release gate tren device/cloud that**

### Da xong theo checklist

- [x] Product analytics that:
  screen views, onboarding funnel, register -> verify -> login -> onboarding complete, search -> food detail -> add diary, AI scan start -> result -> save, voice parse -> preview -> execute
- [x] Crash / error tracking lane that:
  mobile runtime errors, backend API failures, AI provider failures
- [x] Barcode scanner
- [x] Weekly review / progress summary cho user
- [x] Better nutrition targets UX:
  ro nguon AI / fallback, co retry / fallback messaging
- [x] AI fallback policy da duoc codify trong response contract + mobile UX + smoke metrics
- [x] Release metrics da co auth/search/scan/nutrition/fallback/evidence gates va voice latency thresholds

### Da xong mot phan

- [~] Cloud strategy / production lane:
  code da harden, nhung paid plan / keep-alive / manual ops chua thuc hien
- [~] AI scan reliability:
  barcode flow, telemetry, fallback, smoke metrics da co; full device/cloud gate chua chay
- [~] Manual logging speed:
  chua lam favorites / recent foods / same as yesterday

### Chua xong / defer

- [ ] Full device/cloud smoke gate voi moi truong that
- [ ] Meal planner
- [ ] Grocery list
- [ ] Intermittent fasting
- [ ] Wearable / Apple Health / Health Connect sync
- [ ] Progress photos / body scan
- [ ] Buddies / accountability
- [ ] Premium tiering
- [ ] Micronutrients va charts sau hon
- [ ] Export / CSV / PDF
- [ ] Coach / expert dashboard
- [ ] Admin analytics / cohort retention dashboard
