# EatFitAI - Danh gia hien trang so voi Notion Plan va de xuat co cau lai task cho 2 nguoi

Cap nhat: `2026-03-14`

## 1. Pham vi va nguon doi chieu

Tai lieu nay duoc tong hop tu 3 nguon su that:

1. Runtime audit tren `Android native development build` + `backend` + `AI provider` + `SQL Server local`.
2. Database Notion `EatFitAI - Task Management` hien tai.
3. So lieu va schema thuc te trong `SQL Server` local.

Tai lieu runtime gan nhat:

- `docs/06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md`
- `artifacts/runtime/2026-03-14/runtime-audit-master.md` (local-only)

Notion source chinh:

- Database task: `https://www.notion.so/edabb4deed21424f99f85cdb93968f3e`
- Cac task doi chieu da fetch truc tiep:
  - `P3-FE.03` Voice di qua Backend proxy
  - `P3-BE.05` DB Migration + Index Strategy
  - `P4-AI.01` Structured JSON Output cho LLM
  - `P4-AI.02` AI Health State Machine
  - `P4-FE.03` Ra soat UI/UX toan app & Fix loi
  - `P4-FE.06` Onboarding fallback formula khi AI down
  - `P5-07` Dietary Restrictions tich hop filter Food Search

## 2. Ket luan dieu hanh

EatFitAI hien tai da vuot muc `prototype tinh`. App da co core runtime that cho:

- login va session
- profile/preferences/body metrics
- meal diary create/read
- custom dish
- AI scan gallery no-food graceful path
- voice backend contracts
- native Android build tren emulator

Tuy nhien, app chua dat muc `stable product` va cung chua dat muc `thesis demo one-shot reliable`.

Nhan dinh quan trong nhat:

1. `Notion plan dang dung vai tro backlog/planning, khong phai truth source`. Rat nhieu task trong Notion van de `Chua bat dau` du code/runtime da co mot phan hoac da duoc sua xong.
2. `Database dang co du lieu song`, chung minh app khong phai mock, nhung DB dang lo ro `schema drift`, `read/write contract drift`, va mot so quy uoc du lieu chua duoc chot.
3. `Van de lon nhat khong phai thieu man hinh`, ma la `thieu do tin cay`, `thieu nhat quan UI/API/DB`, va `AI quality/trust chua du`.
4. Neu giu nguyen backlog hien tai va co gang lam het, 2 nguoi se dan trai va khong kip khoa chat chat luong. Can co cau lai thanh nhom `phai xong`, `nen co`, `de sau`.

Ket luan thuc dung:

- App du tam de bao ve tot nghiep neu `rut scope dung`.
- Khong nen tiep tuc quan ly cong viec theo kieu "tat ca task deu Chua bat dau".
- Can doi backlog sang `outcome-based execution`: on dinh runtime, khoa data truth, tang AI trust, roi moi them tinh nang hien dai.

## 3. Tinh trang app hien tai theo runtime that

Tong hop tu runtime audit hien tai:

| Module | Tien do tam tinh | Nhận xét ngắn |
|---|---:|---|
| Auth | 75% | Backend auth da kha on, nhung UI register/forgot password van co diem vo |
| Shell | 72% | Native build da tot hon Expo Go, nhung reload/reopen va route consistency chua khoa |
| Diary | 72% | Create/read da co that, search khong dau va delete chua dung |
| AI | 56% | Pipeline song, nhung model quality yeu va trust flow chua du |
| Voice | 52% | Backend contracts chay duoc, mobile UI voice dang vo |
| Stats | 60% | API co data, UI populated state chua phan anh du that |
| Profile | 78% | Write path va preferences/body metrics da co that, nhung summary card chua dung |
| Gamification | 10% | Gan nhu chua co evidence runtime du de tinh la on |
| Backend contract | 70% | Nhieu endpoint da chay duoc, nhung van con contract mismatch |

Nhung flow manh nhat hien tai:

- `register -> verify -> login -> refresh -> change password` o tang backend
- `login -> home -> profile -> stats -> AI Scan` tren native build
- `custom dish create`
- `meal diary create + read-back`
- `profile update + preferences + body metrics`
- `voice backend`: ask calories, log weight, add food

Nhung flow hien dang lam app "co ve on" nhung chua that su on:

- `Food Search` khong dau
- `Meal diary delete`
- `Voice UI` tren mobile
- `Stats populated state`
- `Profile overview cards`
- `AI positive path` voi anh gallery thuc te

## 4. So sanh voi Notion plan hien tai

## 4.1 Nhan xet tong quat ve Notion

Database task trong Notion rat day, co du cac phase:

- `P1 - Khao sat & Phan tich`
- `P2 - Thiet ke He thong`
- `P3 - On dinh Nen tang`
- `P4 - Nang cap AI & Pro`
- `P5 - Kiem thu & Danh gia`
- `P6 - Bao cao & Bao ve`

Nhung van de la:

1. Gan nhu tat ca task dang o trang thai `Chua bat dau`.
2. Notion chua phan biet ro:
   - task da lam mot phan
   - task da co runtime evidence
   - task chi moi co screen
   - task chua dung vao
3. Plan hien tai nghi ve `theo phase hoc thuat`, nhung chua du `theo lane thuc thi ky thuat`.

Vi vay, neu tiep tuc giao viec theo Notion hien tai, team se rat de:

- lam lai viec da co
- bo sot blocker thuc su
- xep uu tien sai
- danh gia tien do ao

## 4.2 Doi chieu mot so task quan trong

| Task Code | Notion hien tai | Su that runtime/code | Danh gia |
|---|---|---|---|
| `P3-BE.02` JWT chuan | Chua bat dau | Da sua issuer/audience, protected API da het `401` | Nen tach phan con lai va danh dau `Partially done` |
| `P3-FE.03` Voice qua backend proxy | Chua bat dau | Backend voice contracts da chay qua backend; UI mobile voice van loi | `Partially done`, van la P0 |
| `P3-BE.05` DB Migration + Index Strategy | Chua bat dau | DB da co mot so index, nhung schema drift va duplicate table van ton tai | `Partially done`, can uu tien cao |
| `P3-FE.05` Quick Add Hub | Chua bat dau | Home da co action sheet Search/Favorites/Custom/AI | `Partially done`, can chot UX va route |
| `P3-FE.06` Fallback UI khi AI offline | Chua bat dau | Chua thay AI status badge/fallback UX day du | Chua dat |
| `P3-FE.07` Error Boundary + Crash Recovery | Chua bat dau | Da tung gap `Expo Go ErrorActivity`, native lane tot hon nhung chua co evidence error recovery day du | Chua dat |
| `P4-AI.01` Structured JSON cho LLM | Chua bat dau | Chua du evidence cho JSON output 100%; voice UI van loi parse/network | Chua dat |
| `P4-AI.02` AI Health State Machine | Chua bat dau | Co `/healthz`, nhung chua co `GET /api/ai/status`, chua co mobile badge | Chua dat |
| `P4-AI.03` Benchmark YOLO anh Viet | Chua bat dau | Da co runtime evidence that model miss `beef/chicken/pork`, nhung chua co benchmark formal | Chua dat, rat can |
| `P4-AI.05` Active Learning Correction API | Chua bat dau | Chua thay evidence correction loop that | Chua dat |
| `P4-FE.01` Confidence-gated flow | Chua bat dau | Chua co confirm gate khi model confidence thap | Chua dat |
| `P4-FE.03` Rà soát UI/UX toàn app | Chua bat dau | Runtime audit da lo nhieu UI/data mismatch; audit thuc te da bat dau | Nen doi sang `In progress` |
| `P4-FE.06` Onboarding fallback khi AI down | Chua bat dau | Chua thay fallback formula va offline badge | Chua dat |
| `P4-FE.07` Barcode scanner | Chua bat dau | Chua thay runtime evidence | Chua dat, nen la add-on sau khi core on |
| `P4-FE.08` Water tracking | Chua bat dau | Chua co evidence | Add-on tot, khong nen chen vao truoc core |
| `P5-03` AI Regression Test Set | Chua bat dau | Da co runtime fixture ad-hoc, nhung chua co formal set + metrics | Nen doi sang `In progress` theo nghia ky thuat |
| `P5-05` Seed Data Demo | Chua bat dau | DB da co data song, nhung chua co bo seed demo co dinh de rehearsal | Chua dat |
| `P5-07` Dietary filter trong search | Chua bat dau | UserPreference da luu dietary restrictions, nhung search chua respect | `Partially done` o data layer |

## 4.3 Ket luan ve khoang cach giua app va Notion

Khoang cach lon nhat khong nam o cho "app khong co gi", ma nam o cho:

1. `Notion chua phan anh muc do hoan thanh that`.
2. `Task chua duoc tach theo data truth`.
3. `Nhieu task nen chuyen trang thai sang Partially done/In progress`.
4. `Nhieu task tang cuong tinh nang can day sau khi khoa core`.

Noi thang:

- Notion hien tai du de lam danh sach viec.
- Notion hien tai chua du tot de quan ly execution cua 2 nguoi.

## 5. Soi SQL database va danh gia

## 5.1 Snapshot du lieu hien tai

| Bang | So dong |
|---|---:|
| `Users` | 46 |
| `MealDiary` | 996 |
| `UserFoodItem` | 37 |
| `UserDish` | 21 |
| `BodyMetric` | 58 |
| `UserPreference` | 2 |
| `UserPreferences` | 0 |
| `UserFavoriteFood` | 32 |
| `AiLabelMap` | 26 |
| `ImageDetection` | 1 |
| `AISuggestion` | 1 |
| `NutritionTarget` | 68 |
| `WeeklyCheckIn` | 3 |

Ket luan tu snapshot nay:

- App co du lieu that va da duoc dung khong it.
- Diary, profile, body metrics da co dau vet su dung that.
- AI history/correction gan nhu chua duoc van hanh thuc te.
- User preference co ton tai, nhung muc do phu song con rat thap.

## 5.2 Van de schema/data dang lo ro

### 1. Duplicate schema

DB dang co ca:

- `UserPreference`
- `UserPreferences`

Hai bang nay co schema trung nhau, trong do:

- `UserPreference` co 2 dong
- `UserPreferences` co 0 dong

Day la dau hieu ro cua `schema drift / migration drift`.

### 2. No-accent search chua dung ngay tu tang du lieu

`FoodItem.FoodNameUnsigned` dang chua duoc chuan hoa dung:

- `73` dong co `FoodNameUnsigned = FoodName`
- `48` dong trong `FoodNameUnsigned` van con ky tu co dau

He qua:

- Task search khong dau khong the tot len neu chi sua UI.
- Can sua ca seed/import pipeline va query strategy.

### 3. Soft delete contract chua khoa

`MealDiary` co `IsDeleted`, hien co it nhat `2` dong soft-deleted.

Nhung runtime da xac nhan:

- API `DELETE` tra `204`
- record van con o read path/API/DB truth theo nghia business

Day la loi contract read/write, khong phai loi hien thi don thuan.

### 4. Index strategy chi o muc co ban

Key tables co index, nhung chua du cho scale va UX hien tai:

- `FoodItem`: moi co `IX_FoodItem_FoodName_IsDeleted`
- `MealDiary`: moi co `IX_MealDiary_UserId_EatenDate_IsDeleted`
- `UserFoodItem`, `UserPreference`, `Users`: co unique/index co ban

Nhan xet:

- Index hien tai du de chay local.
- Chua du de goi la "DB strategy" theo dung task `P3-BE.05`.
- Chua thay index phuc vu no-accent search, filter dietary, AI history, favorites/recent optimization.

### 5. AI data layer chua truong thanh

`ImageDetection = 1`, `AISuggestion = 1` cho thay:

- lane luu vet AI van chua duoc su dung nghiem tuc
- history/correction/auditability cua AI rat mong

### 6. UI/DB consistency chua du

DB da co:

- `NutritionTarget`
- `BodyMetric`
- `UserPreference`

Nhung runtime cho thay:

- `Profile` overview van hien `--` du API da co `currentWeightKg`
- `Stats` UI chua phan anh ro tong calories trong ngay du API/DB da co du lieu

Ket luan:

- DB co du lieu hon UI.
- Van de hien tai la `binding + query + mapping + refresh logic`, khong phai "chua co model du lieu".

## 6. Danh gia tong the hien tai

## 6.1 Muc do san sang cho demo tot nghiep

Neu danh gia theo logic thuc dung:

- `Demo duoc`: Co
- `Demo dep va tu tin`: Chua hon
- `Bao cao co the bao ve`: Co, neu co scope ro
- `Production-like`: Chua

Muc do tong quat:

- San pham demo: `70/100`
- Do tin cay ky thuat: `55/100`
- AI trust + explainability: `40/100`
- Do san sang cho audit/kiem thu lap lai: `60/100`

## 6.2 Nhan dinh manh va yeu

### Diem manh

- Kien truc 3 lop mobile/backend/AI da co that.
- Native build va Appium lane da dung duoc.
- Core data entities da ton tai day du.
- Co nhieu flow runtime da co bang chung.
- Backend auth, profile, diary da co nen.

### Diem yeu

- Plan va runtime dang lech nhau.
- AI lane chua du tin cay.
- Search tieng Viet chua tot.
- Voice UI chua on.
- Stats/Profile summary chua trung backend truth.
- DB co schema drift va debt chua khoa.

## 7. Co cau lai task cho 2 nguoi

## 7.1 Nguyen tac co cau lai

Khong chia theo kieu:

- frontend mot dong
- backend mot dong
- ai mot dong

Vi kieu do se lam 2 nguoi bi dan trai va khong khoa duoc outcome.

Nen chia theo `2 lane ket qua`:

1. `Lane A - Frontend/Product Reliability`
2. `Lane B - Backend/AI/Data Truth`

Muc tieu la moi lane deu tao ra ket qua do duoc tren demo va trong report.

## 7.2 Phan cong de xuat

### Nguoi 1 - Frontend, UX, native runtime, demo polish

Chiu trach nhiem chinh cho:

- `P3-FE.03` Voice qua backend proxy o mobile layer
- `P3-FE.05` Quick Add Hub
- `P3-FE.06` Fallback UI khi AI offline
- `P3-FE.07` Error Boundary + Retry
- `P4-FE.01` Confidence-gated flow
- `P4-FE.02` Profile + avatar + summary card
- `P4-FE.03` UI/UX audit va fix loi
- `P4-FE.06` Onboarding fallback formula UX
- `P5-07` Dietary restrictions tich hop vao search UI/filter
- build `QA native lane` cho test va rehearsal

Deliverable phai nhin thay duoc:

- 7 flow smooth, khong tao ao giac UI
- search dung duoc cho user Viet
- profile/stats hien dung data
- AI va voice khong con thong bao loi mo ho

### Nguoi 2 - Backend, AI, DB, contract, benchmark

Chiu trach nhiem chinh cho:

- `P3-BE.03` Backend proxy cho voice
- `P3-BE.05` DB migration + index strategy
- `P3-BE.06` validate data bat thuong
- `P4-AI.01` Structured JSON cho LLM
- `P4-AI.02` AI Health State Machine
- `P4-AI.03` Benchmark YOLO voi anh Viet
- `P4-AI.04` Data pipeline + train/val/test split
- `P4-AI.05` Active learning correction API
- `P4-AI.06` Toi uu STT
- `P5-03` AI regression set
- `P5-05` seed data demo co dinh

Deliverable phai nhin thay duoc:

- AI co health state ro rang
- voice backend chay on va mobile goi dung lane
- DB khong con drift ro rang
- model duoc benchmark, co so lieu de bao cao
- AI response co trust layer tot hon

### Viec phai lam chung

- `P5-04` rehearsal demo
- `P5-02` test cases + UAT
- `P6-02`, `P6-03`, `P6-05`, `P6-08` cho phan bao cao/slide/Q&A
- snapshot evidence, screenshots, benchmark table

## 7.3 Cach doi trang thai task trong Notion

De Notion tro lai dung thuc te, nen doi theo quy tac:

- `Hoan thanh`: da co runtime evidence + DB/API truth
- `Dang thuc hien`: da co mot phan that, nhung chua dat DoD
- `Chua bat dau`: chua co bang chung

Task nen chuyen ngay sang `Dang thuc hien`:

- `P3-BE.02`
- `P3-FE.03`
- `P3-BE.05`
- `P3-FE.05`
- `P4-FE.03`
- `P5-03`
- `P5-07`

Task nen tach nho lai:

- `P4-FE.03` tach thanh:
  - search UX
  - stats/profile data truth
  - AI/voice error state
- `P3-BE.05` tach thanh:
  - schema drift cleanup
  - index strategy
  - read/write soft-delete fix
- `P4-AI.03` tach thanh:
  - benchmark current model
  - decide keep/retrain/replace

## 8. Uu tien lai backlog de "cai thien toan bo" ma khong vo scope

## 8.1 Nhung viec bat buoc truoc

Day la nhom phai khoa truoc khi nghi den them tinh nang:

1. Search tieng Viet khong dau + synonyms co dau/khong dau.
2. Delete/update diary dung theo business truth.
3. Voice chi di qua backend, mobile khong con `Network Error` mo ho.
4. Stats/Profile phan anh dung du lieu tu API.
5. AI co status ro rang va fallback khi down.
6. AI positive path voi gallery fixture phai detect duoc it nhat mot so mon co nghia.
7. Native QA build on dinh cho audit/demo.

Neu 7 muc nay chua xong, moi tinh nang moi deu la "them lop son tren nen chua kho".

## 8.2 Tinh nang nen bo sung de app hien dai hon

Sau khi khoa core, day la nhung tinh nang dung va hop xu huong app tracking/AI hien nay:

### Nhom nen lam som

- `Barcode Scanner`
  - rat thuc te
  - de demo
  - user hieu ngay gia tri

- `Water Tracking`
  - nhanh, de dung hang ngay
  - tao cam giac app day du hon

- `Confidence + Explainability`
  - cho user biet AI dang chac den dau
  - hien thi "Nhan dien -> Tra cuu -> Tinh toan"
  - tang trust

- `Dietary Restrictions integrated search`
  - khong chi luu preference
  - phai tac dong vao ket qua search/recipe

- `Recent/Favorite/Repeat meal`
  - day la xu huong rat quan trong trong app diary hien dai
  - giam friction nhap lieu

### Nhom nen co neu con thoi gian

- `Natural language quick add`
  - vi du: "them 2 trung va 1 chuoi"
  - hien dai va de trinh bay

- `AI correction flow`
  - sua label sai
  - gui correction ve backend
  - dung cho active learning

- `Modern home dashboard`
  - card hom nay
  - calories con lai
  - water
  - streak
  - quick add

## 8.3 Nhom nen de sau

De scope khong vo, nen day sau:

- `Export CSV`
- `Poster`
- `benchmark UI screen`
- mo rong `Achievements/Gamification`
- nhung tinh nang "dep de noi" nhung khong tac dong den reliability

## 9. Tang do tin cay va uy tin cho app

App thuoc nhom AI nutrition, nen trust quan trong hon viec "co nhieu tinh nang".

Can tap trung vao 5 viec:

1. Moi ket qua AI phai co `confidence`.
2. Moi goi y dinh duong phai co `nguon` hoac `formula`.
3. Neu confidence thap, app phai `hoi lai user` thay vi tu dong luu.
4. Neu AI down, app phai `van hoat dong` o che do fallback.
5. Mọi screen quan trong phai co `empty`, `loading`, `error`, `retry` state ro rang.

Noi gon:

- de user tin, app khong can "thong minh hon"
- app can `trung thuc hon`, `on dinh hon`, `giai thich duoc hon`

## 10. De xuat cau truc backlog moi

Notion nen duoc co cau lai thanh 4 nhom lon:

### A. Runtime va data truth

- auth
- voice proxy
- search no-accent
- diary CRUD dung
- stats/profile consistency
- DB migration/index/soft-delete

### B. AI trust va AI quality

- AI health state
- structured JSON
- benchmark model
- regression set
- confidence gate
- explainability
- correction flow

### C. Product value va modern UX

- quick add hub
- dietary filter
- barcode
- water tracking
- favorites/recent/repeat
- home dashboard polish

### D. Demo, testing, report

- seed data
- UAT
- rehearsal
- screenshots
- report chapters
- slides
- Q&A

Voi 2 nguoi, day la cach chia hop ly nhat de vua kip bao ve, vua khong mat huong.

## 11. Ket luan cuoi cung

EatFitAI hien tai la:

- `khong con la y tuong`
- `khong phai app gia`
- `nhung cung chua phai san pham da khoa chat`

No da du manh de tro thanh do an tot nghiep thuyet phuc neu team:

1. dung co gang lam het backlog
2. khoa lai task theo su that runtime
3. uu tien do tin cay, data truth, AI trust
4. chi them tinh nang moi sau khi core on

Ket luan thuc dung nhat:

- `Nen co cau lai Notion ngay`
- `Nen doi backlog tu phase-based sang outcome-based`
- `Nen giao 1 nguoi giu Frontend/Product Reliability`
- `Nen giao 1 nguoi giu Backend/AI/Data Truth`

Neu lam dung cach nay, app co kha nang len duoc muc:

- demo on
- bao cao co so lieu
- feature co gia tri thuc te
- AI biet giai thich va biet khiem ton khi khong chac

Do la cach thuc te nhat de EatFitAI vua "hien dai", vua "thuyet phuc", vua "kip deadline".
