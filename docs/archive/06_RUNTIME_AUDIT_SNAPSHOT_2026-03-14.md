# Runtime Audit Snapshot 2026-03-14

## Tong quan

Tai thoi diem `2026-03-14`, EatFitAI da duoc chay that tren `Android emulator` voi day du:

- `backend`
- `AI provider`
- `SQL Server local`
- `native Android development build + Metro`
- `Appium` de chup UI tree va evidence

`Expo Go` khong con duoc xem la lane audit chinh. Tu cuoi ngay `2026-03-14`, lane uu tien la
`com.eatfitai.app` tren emulator native build.

Muc tieu cua snapshot nay la chot `tinh trang runtime that`, khong dua vao cam giac demo hoac doc code don le.

## Muc do tien do hien tai

- Overall technical audit progress: `69%`
- Danh gia nhanh:
  - app da co nhieu flow chay that qua backend/DB
  - lane native build da giam ro nhieu nhieu runtime noise so voi Expo Go
  - da co them bang chung cho AI gallery lane, voice backend contract, va stats/profile tren native build
  - nhung audit coverage chua du de goi la stable/deterministic
  - van con blocker business flow, model quality, va mot so debt cua tooling automation

## Tien do theo module

| Module | Planned flows | Evidence-backed flows | Working | Partial | Broken | Provisional progress |
|---|---:|---:|---:|---:|---:|---:|
| Auth | 9 | 8 | 5 | 1 | 2 | 75% |
| Shell | 5 | 4 | 2 | 1 | 1 | 72% |
| Diary | 10 | 7 | 4 | 1 | 2 | 72% |
| AI | 10 | 5 | 1 | 4 | 0 | 56% |
| Voice | 5 | 4 | 2 | 0 | 1 | 52% |
| Stats | 3 | 3 | 1 | 1 | 1 | 60% |
| Profile | 8 | 8 | 4 | 4 | 0 | 78% |
| Gamification | 2 | 0 | 0 | 0 | 0 | 10% |
| Backend contract | 6 | 6 | 4 | 2 | 0 | 70% |

## Cac flow da co bang chung

### Working

- `AUTH-02` Login valid
- `AUTH-04` Register with verification (backend truth)
- `AUTH-06` Verify email happy path (backend truth)
- `AUTH-09` Mark onboarding completed + subsequent login `needsOnboarding=false`
- `AUTH-10` Refresh token rotation + DB persistence
- `AUTH-11` Change password + old password invalid / new password valid
- `DIARY-05` Custom dish create valid
- `DIARY-06` Meal diary empty state
- `DIARY-10` Search co dau -> create meal diary record -> GET diary thay record moi
- `AI-01` AI scan gallery no-food graceful result
- `VOICE-API-01` Voice `ASK_CALORIES` process + execute contract
- `VOICE-API-02` Voice `LOG_WEIGHT` process + execute + confirm-weight + DB persistence
- `VOICE-API-03` Voice `ADD_FOOD` process + execute + MealDiary DB persistence
- `API-01` Auth-protected endpoints
- `PROFILE-02` Profile update + read-back
- `PROFILE-03` Body metrics record + history
- `PROFILE-05` Preferences update + read-back
- `SHELL-05` Native development build: welcome -> login -> home
- `AI-02` Native AI tab + camera permission dialog -> granted
- `PROFILE-06` Native Profile tab entry/load
- `STATS-04` Native Stats tab entry/load

### Partially Working

- `SHELL-03` Tab navigation consistency
- `AUTH-05` Register invalid validation (UI form validation hien thi dung, nhung submit happy path UI chua khoa)
- `STATS-02` New-user summary/day render duoc response nhung van giu target mac dinh du profile da day hon
- `VOICE-01` Voice screen entry/load
- `STATS-01` Stats entry/load
- `PROFILE-01` den `PROFILE-05` read/load states
- `API-02` Food search contract
- `API-05` AI detect contract
- `AI-02` Gallery fixture `pork.jpg` di qua pipeline nhung tra `no detections`
- `AI-03` Gallery fixture `chicken.jpg` di qua pipeline nhung tra `no detections`
- `AI-04` Gallery fixture `beef.jpg` di qua pipeline nhung tra `no detections`
- `PROFILE-07` Native profile overview load duoc nhung card summary van hien `--`
- `STATS-03` Stats screen render shell/target duoc, nhung can doi chieu them voi API populated state

### Broken

- `AUTH-07` Resend verification khi SMTP loi
- `AUTH-08` Forgot password khi SMTP loi
- `SHELL-04` Expo Go reopen/reload
- `DIARY-02` Food search no-accent
- `DIARY-11` Delete meal diary tra `204` nhung record van con trong API va DB
- `VOICE-02` Native Voice parse bang text/chip tren app tra `Network Error` truoc khi vao backend execute

## Blocker hien tai

### P1

- Tim kiem mon an khong dau chua dung duoc theo ky vong tieng Viet.
- `Custom Dish` dang persist vao `UserFoodItem`, khong phai `UserDish`; business contract can khoa lai.
- `Register` UI tren Expo Go dang bi state contamination: field input bi dirty, relaunch/pm clear khong dua form ve trang thai sach, back/login navigation khong deterministic.
- `Resend verification` dang doi ma trong DB truoc khi gui email xong; neu SMTP fail thi user mat ma plaintext va bi ket o trang thai chua verify.
- `Meal diary delete` dang tra thanh cong gia; API `DELETE` tra `204` nhung GET diary va DB van giu record.
- `Voice` native UI dang fail o buoc parse text tren app voi toast `[VoiceService] Ollama parse error: Network Error`, trong khi voice backend contract van chay duoc bang token that.
- AI model quality hien rat yeu tren 3 fixture gallery moi `beef/chicken/pork`: pipeline chay end-to-end nhung deu ra `no detections`.

### P2

- Mot so Home quick action co dau hieu route lech y dinh.
- Selector coverage hien moi du cho smoke lane, chua du cho full audit automation.
- `Forgot password` tra `500` rong khi SMTP fail, trong khi service dang cache reset code truoc do; UX va contract dev mode hien khong ho tro tiep tuc reset neu gui mail loi.
- `Summary/day` chua phan anh meal moi tao cho new-user, va target macro/calories van giu default du profile da du thong tin.
- `Expo Go` reopen/reload van roi vao `ErrorActivity`, nhung day khong con la blocker chinh neu audit/demo chay tren native development build.
- `AIScan` tren Android/Expo Go fallback vi `ImageManipulator.manipulateAsync` khong available; van de nay can ghi nhan la Expo lane noise, khong phai ket luan cho native build.
- Native `Profile` overview dang giu cac placeholder `--` du backend `/api/profile` da co `currentWeightKg=74.30`.
- Native `Stats` vao duoc man hinh populated state, nhung text searchable moi cho thay target shell `2,000 / 0%`; can tiep tuc doi chieu phan render chi tiet voi `summary/day=276`.

## Ket luan ky thuat

- App da vuot muc prototype tinh.
- Core shell va mot so flow chinh da song that qua backend/DB.
- Auth backend da duoc audit sau hon va cho thay vong doi tai khoan co the chay that: `register -> verify -> login -> onboarding complete -> refresh -> change password`.
- Native development build tren emulator da duoc xac nhan chay that qua UI: `welcome -> login -> home -> profile -> ai scan -> camera permission`.
- Native AI gallery lane da duoc retest voi 3 anh album thuc te `pork/chicken/beef`; picker va preview hoat dong, nhung model hien bo sot ca 3.
- Voice can duoc tach thanh 2 su that:
  - `voice backend contract` chay duoc cho `ASK_CALORIES`, `LOG_WEIGHT`, va `ADD_FOOD`
  - `voice native UI` tren emulator hien fail o parse step voi `Network Error`
- Tuy nhien runtime hien tai chua dat muc "one-shot stable" cho audit sau hoac demo khong co fallback.

## Flow manh nhat hien tai

- `register-with-verification` o tang backend
- `verify email` o tang backend
- `login`
- `refresh token`
- `change password`
- `manual custom dish`
- `profile update/preferences/body metrics`
- `meal diary create + read-back`
- `meal diary empty state`
- `AI no-food graceful path`
- `voice backend ask-calories`
- `voice backend log-weight + confirm`
- `voice backend add-food`
- `native build login -> home`
- `native build profile tab`
- `native build stats tab`
- `native build ai scan permission path`

## Flow de tao ao giac "app on" neu chi nhin UI

- `Profile`
- `Stats`
- `Voice`

`Profile` hien khong con nam hoan toan o muc "ao giac UI" vi write path da co bang chung, nhung overview card van sai so lieu tom tat.
`Stats` va `Voice` deu da tang them evidence, nhung van chua dat muc deterministic cho populated-state tren UI.

## Viec can audit tiep theo

1. Tiep tuc audit `auth UI runtime` tren native development build: register clean state, login transition, onboarding UI
2. Audit/fix diary mutation flows: delete, summary refresh, UI add-from-search
3. Khoa positive AI path tren native build: detect, quick add, add-to-diary
4. Audit voice native UI path de xac dinh chinh xac vi sao parse call tu app fail du AI provider song
5. Retest stats/profile voi active-user profile va doi chieu populated-state render voi API

## Native build validation moi nhat

Lane native duoc xac nhan bang evidence runtime that:

- welcome screen cua `com.eatfitai.app`
- login form native
- login thanh cong bang account test local da verify + completed onboarding
- home screen render duoc sau login
- profile tab vao duoc va load du lieu user
- AI Scan tab vao duoc
- system camera permission dialog hien dung va grant thanh cong

Evidence hinh anh local:

- `artifacts/runtime/2026-03-14/shell/native-now.png`
- `artifacts/runtime/2026-03-14/shell/native-login-screen.png`
- `artifacts/runtime/2026-03-14/shell/native-login-filled.png`
- `artifacts/runtime/2026-03-14/shell/native-login-success-attempt.png`
- `artifacts/runtime/2026-03-14/shell/native-profile-tab-2.png`
- `artifacts/runtime/2026-03-14/shell/native-camera-system-dialog.png`
- `artifacts/runtime/2026-03-14/shell/native-ai-camera-allowed.png`

## Evidence local

Ban full evidence dang nam o thu muc local-only:

- `artifacts/runtime/2026-03-14/`

Trong do co:

- `progress-scorecard.md`
- `runtime-audit-master.md`
- `flow-matrix.md`
- `blocker-ledger.md`
- `demo-risk-summary.md`
- `environment-baseline.md`
- `test-data-manifest.md`
