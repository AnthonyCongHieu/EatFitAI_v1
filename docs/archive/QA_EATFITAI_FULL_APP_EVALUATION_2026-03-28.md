# Bao cao QA tong hop EatFitAI

Ngay lap bao cao: 2026-03-29  
Ky test: 2026-03-28 -> 2026-03-29  
Moi truong: Windows host + Android Emulator `EatFitAI_API_34` + backend local + AI provider local

## 1. Tom tat dieu hanh

Trong ky test nay, app da duoc chay va thao tac that tren may, khong mo phong bang mock UI. Sau khi ap dung mot so fix mobile toi thieu de vuot blocker startup va verify-email, EatFitAI da dat duoc muc do su dung duoc cho cac flow cot loi sau:

- Dang ky, verify email, dang nhap, vao Home, logout
- Home dashboard, Meal Diary, Stats
- AI Scan bang gallery voi it nhat 1 anh thanh cong
- Nutrition Settings, Nutrition Insights
- Nhieu man Profile/Settings: Edit Profile, Body Metrics, Goal Settings, Dietary Restrictions, Weight History, Notifications, About, Privacy Policy, Change Password validation

Nhung van con 4 cum van de lon anh huong den danh gia tong the:

1. Manual food logging qua Search dang bi chan vi catalog tra rong cho cac tu khoa thong dung.
2. Voice text path that bai rong, do tre rat cao, parse tra `confidence: 0` cho cac intent co ban.
3. RecipeSuggestions va VisionHistory chua dat duoc user flow on dinh/ro rang trong app hien tai.
4. Startup/session va mot so luong AI/gallery van co dau hieu flakiness, nhat la sau cold restart.

Danh gia tong quan:

- Tinh hoan chinh chuc nang: `6/10`
- Do tin cay khi su dung that: `4.5/10`
- Hieu nang cam nhan: `5.5/10`
- Hieu suat thao tac/UX: `6/10`

## 2. Pham vi va phuong phap

Phuong phap test:

- Test theo user flow tren emulator Android that.
- Khong dung camera that; scan anh dung gallery voi cac file da tai vao emulator:
  - `scan-chicken.png`
  - `scan-beef.webp`
  - `scan-pork.jpg`
- Du lieu auth dung tai khoan disposable tao trong run:
  - Email: `qa_1774710866605@example.com`
  - Password: `QaFlow123`
  - Full name: `QA User`
- Chi dung response dev mode de lay verification code khi can, khong seed DB thu cong.

Luu y moi truong:

- `ai-provider/.env` dang dat `ENABLE_STT=false`
- Nhanh voice recording/transcribe vi vay duoc danh gia la `Blocked by environment`

## 3. Fix toi thieu da ap dung truoc khi tiep tuc QA

Khong thay doi backend contract. Chi ap dung fix mobile nho de app co the tiep tuc test:

- `eatfitai-mobile/src/services/apiClient.ts`
  - Uu tien validate va dung ngay API URL da cau hinh sau `preloadCachedUrl()`.
- `eatfitai-mobile/src/app/navigation/AppNavigator.tsx`
  - Hien loading indicator khi auth init thay vi de blank fragment.
- `eatfitai-mobile/src/app/screens/auth/VerifyEmailScreen.tsx`
  - Sua mismatch truong token (`accessToken`/`accessTokenExpiresAt` vs `token`/`expiresAt`) de luu session dung sau verify.

Sau cac fix nay, `npm run typecheck` da pass.

## 4. Ma tran coverage theo chuc nang

| Khu vuc | Trang thai | Ket qua thuc te |
| --- | --- | --- |
| Startup / cold launch | Partial | App vao duoc sau fix, nhung cold start van cham va harness `uiautomator dump` khong on dinh ngay sau launch. |
| Warm launch / session restore | Pass | Sau relaunch, session duoc phuc hoi vao app chinh. |
| Welcome screen | Pass | Render dung, dieu huong auth co san. |
| Register + Verify Email | Pass | Flow chay duoc sau khi sua luu token tren mobile. |
| Resend verification | Fail | Backend fail hard khi SMTP loi, khong tra dev verification code nhu flow register. |
| Login valid | Partial | Dang nhap duoc, nhung co bug bo qua `needsOnboarding`. |
| Login invalid | Partial | Hien loi dung, nhung co warning overlay `Missing refresh token`. |
| Forgot Password / Reset Password | Not fully covered | Khong chay lai tron ven trong lan tiep tuc nay. |
| Onboarding | Partial | Co vao app sau verify, nhung login co the bo qua onboarding du backend bao can. |
| Home dashboard | Pass | Tai dashboard, sync target, vao nhanh cac luong chinh. |
| Food Search | Fail | Tra rong voi tu khoa thong dung, chan manual add qua search. |
| Food Detail / add manual | Blocked | Bi chan boi Search khong co ket qua. |
| Meal Diary | Pass | Xem, sua gram, xoa item, sync ve empty state va Stats. |
| Stats Today / Week / Month | Pass | Hien data, tap ngay mo Meal Diary dung. |
| AI Scan bang gallery | Partial | Scan ga thanh cong 1 lan, quick save va add diary pass; re-run bang gallery sau cold restart khong on dinh. |
| AI quick save | Pass with UX issue | Hoat dong, nhung ten nut/hieu ung xac nhan chua ro. |
| Add meal from vision detail | Pass | Add vao diary va dong bo Home/Diary. |
| Recipe Suggestions | Blocked | Route co ton tai, nhung khong tai lap duoc user flow on dinh tu ket qua scan trong ky nay. |
| Vision History | Blocked / unreachable | Route co trong navigator, nhung khong tim thay entry point user-facing on dinh tu UI hien tai. |
| Nutrition Settings | Pass | AI suggest pass, apply pass, Home sync pass. |
| Nutrition Insights | Pass | Tai du lieu that, co recommendation va diem adherence. |
| Voice text flow | Fail | 3 intent cot loi deu that bai, latency rat cao. |
| Voice recording / STT | Blocked | Bi khoa boi `ENABLE_STT=false`. |
| Edit Profile | Partial | Render va cap nhat profile co dau hieu luu duoc, nhung feedback save chua ro rang. |
| Body Metrics | Partial | Render dung, field duoc prefill; khong xac minh luu thanh cong trong lan nay. |
| Goal Settings | Partial | Render dung va hien current selection; khong xac minh luu thanh cong trong lan nay. |
| Dietary Restrictions | Partial | Render dung; khong xac minh luu thanh cong trong lan nay. |
| Weight History | Pass | Empty state dung va ro rang. |
| Achievements | Partial | Screen render, nhung progress co dau hieu sync sai. |
| Notifications | Pass | Bat/tat va save duoc. |
| Change Password | Partial | Validation screen pass; khong thuc hien doi mat khau that de tranh pha session test. |
| About | Pass | Render day du thong tin app/version/menu. |
| Privacy Policy | Pass | Render content, subtitle va section chinh dung. |
| Dark mode toggle | Pass | Toggle sang light va restore ve dark thanh cong. |
| Logout | Pass | Logout dua ve Welcome screen dung. |

## 5. Ket qua chi tiet theo user flow

### 5.1 Startup va phien lam viec

- Backend `http://127.0.0.1:5247/health` va AI provider `http://127.0.0.1:5050/healthz` deu healthy trong run.
- Metro va Appium deu hoat dong.
- Cold start sau fix khong con ket o man hinh den vo hanh, nhung vao first-interactive kha cham va dump accessibility co luc tra tree rong du screenshot da render.
- Session restore pass: sau relaunch, app vao lai session da dang nhap.
- Logout pass: app quay ve Welcome screen.

Danh gia:

- User van vao duoc app.
- Do on dinh automation/runtime sau cold restart chua cao.

### 5.2 Auth

Ket qua da xac minh:

- Register voi verification pass.
- Verify-email pass sau khi sua mismatch token contract tren mobile.
- Invalid login hien error, nhung co dev warning overlay ve refresh token.
- Valid login thanh cong.

Van de:

- Neu backend tra `needsOnboarding: true`, mobile van vao Home thay vi ep qua onboarding.
- `resend-verification` khong hanh xu dong nhat voi `register-with-verification` trong dev mode.

### 5.3 Home, Meal Diary, Stats

Ket qua:

- Home load dung target, macros va quick navigation.
- Sau khi AI quick save, item xuat hien trong Home/Diary.
- Meal Diary sua `100g -> 150g` thanh cong.
- Xoa item thanh cong va sync ve empty state.
- Stats Today/Week/Month pass.
- Tap ngay tren Week/Month mo Meal Diary dung ngay.

Van de UX:

- Save edit gram tren Android kha vuong neu EditText van focus; can Enter/Done de tranh thao tac hut.

### 5.4 Food Search va manual logging

Ket qua:

- Search voi cac term thong dung (`rice`, `chicken`, `com`...) deu tra empty state.
- Do do luong manual add qua search khong the hoan tat theo user flow thong thuong.

Tac dong:

- Day la blocker lon cho user khong dung AI scan.

### 5.5 AI Scan, Vision, Recipe

Ket qua tot:

- Gallery scan voi anh ga thanh cong.
- Ket qua top: `Ức gà (sống)`
- Confidence: `84%`
- Nutrition: `165 kcal`
- Quick save pass.
- Add-to-diary detail pass.

Van de:

- Re-run gallery scan sau cold restart khong on dinh; co lan UI quay ve preview/Home ma khong ra results sheet on dinh.
- `RecipeSuggestions` route co ton tai trong app, va theo source no duoc mo qua `IngredientBasketSheet`, nhung khong dat duoc user flow that on dinh de verify end-to-end trong ky nay.
- `VisionHistory` route co ton tai trong navigator, nhung khong tim thay entry point user-facing ro rang trong UI chinh.

### 5.6 Nutrition

`Nutrition Settings`:

- AI suggest pass.
- Gia tri de xuat da thay doi tu `2000 kcal` len `2468 kcal`.
- Macro de xuat:
  - Protein `154g`
  - Carbs `308g`
  - Fat `68g`
- Apply pass.
- Home sync pass sau apply.

`Nutrition Insights`:

- Tai duoc du lieu that.
- Adherence score: `13/100`
- Trend: `Ổn định`
- Recommendation hien du:
  - `TĂNG CALO`
  - `TĂNG PROTEIN`
  - `TĂNG CARBS`

Danh gia:

- Day la cum tinh nang AI hoat dong tot nhat trong ky test nay.

### 5.7 Voice

Da test 3 intent text co ban:

- `hôm nay ăn bao nhiêu calo`
- `Cân nặng 65 kg`
- `thêm 1 bát cơm vào bữa trưa`

Ket qua:

- Ca 3 deu that bai trong UI that.
- Proxy `/api/voice/parse` co latency quan sat khoang `11.2s`.
- Logcat cho thay parse tra `confidence: 0`.

Ket luan:

- Voice text path hien tai duoc xem la broken o muc san pham, khong phai loi du lieu mau don le.
- Voice recording/STT khong danh gia duoc vi environment tat STT.

### 5.8 Profile va Settings

`Edit Profile`

- Screen render dung.
- Co dau hieu save da cap nhat profile vi hero card sau do hien `25 tuổi`.
- Tuy nhien khong co feedback thanh cong ro rang ngay tren man save.

`Body Metrics`

- Render dung.
- Field prefill:
  - Height `170`
  - Weight `65`
  - Target weight `60`

`Goal Settings`

- Render dung.
- Hien current selected goal/activity, nhung chua verify save end-to-end.

`Dietary Restrictions`

- Render dung, co nhieu chip che do an va di ung.
- Chua verify save end-to-end.

`Achievements`

- Screen render dung.
- Van hien `0/4` du truoc do da tung co meal log trong run.
- Co kha nang progress dang sync theo state hien tai hoac logic unlock co van de.

`Weight History`

- Empty state dung.

`Notifications`

- Bat/tat master switch va save pass.
- Khong thay permission prompt OS trong run nay.

`Change Password`

- Validation pass.
- Khong thuc hien doi password that de giu session/disposable account on dinh.

`About`, `Privacy Policy`, `Dark mode`, `Logout`

- Deu pass.

## 6. Phat hien quan trong theo muc do uu tien

### P1 - Food Search tra rong, chan manual logging

Tac dong:

- Chan mot trong nhung flow cot loi nhat cua app: tim mon va ghi nhat ky thu cong.

Bang chung:

- `artifacts/qa/2026-03-28/food-search-empty-state.png`
- `artifacts/qa/2026-03-28/food-search-after-chip.png`

### P1 - Voice text flow gan nhu khong dung duoc

Tac dong:

- Ca 3 intent chinh deu that bai.
- Do tre cao lam user nghi app treo.

Bang chung:

- `artifacts/qa/2026-03-28/voice-ask-calories-final.png`
- `artifacts/qa/2026-03-28/voice-log-weight.png`
- `artifacts/qa/2026-03-28/voice-add-food-result.png`
- `artifacts/qa/2026-03-28/backend-restart.log`

### P1 - Login bo qua onboarding du backend yeu cau

Tac dong:

- User moi co the vao app voi profile thieu du lieu, gay sai target va cac AI flow phu thuoc profile.

### P1 - Resend verification khong dong nhat voi flow register trong dev mode

Tac dong:

- Kho debug/user test lai khi email service loi.

### P2 - AI gallery flow khong on dinh sau cold restart

Tac dong:

- Scan thanh cong duoc mot lan, nhung khi lap lai user flow co the khong ra ket qua on dinh.

### P2 - RecipeSuggestions chua dat duoc user flow that on dinh

Tac dong:

- Tinh nang ton tai trong source va navigator nhung chua duoc xem la san sang UX.

### P2 - VisionHistory route khong co entry point UI ro rang

Tac dong:

- Tinh nang ton tai nhung user co the khong vao duoc tu app.

### P2 - Save UX tren Meal Diary va Edit Profile thieu feedback ro rang

Tac dong:

- User de nghi nham la app khong luu.

### P2 - Achievements co dau hieu sync sai

Tac dong:

- Giam do tin cay cua gamification va retention loop.

### P3 - Overlay debug warning xuat hien trong run

Tac dong:

- Khong phai blocker nghiep vu, nhung lam nhieu thao tac UI kho hon va khong nen xuat hien trong build test nghiem tuc.

## 7. Hieu nang va do tre quan sat

Luu y: mot phan la timing tu log, mot phan la timing quan sat thu cong; day khong phai benchmark instrumented.

| Moc | Gia tri quan sat | Nhan xet |
| --- | --- | --- |
| Cold start Activity displayed | `~8.2s` | Cham doi voi mobile app consumer. |
| Home data hydration sau cold start | `~1-2s` sau khi activity hien | Chap nhan duoc. |
| `/api/user/preferences` backend | `~137ms` | Nhanh, backend profile khong phai nut that. |
| Voice parse | `~11.2s` | Qua cham, va ket qua van fail. |
| Nutrition Settings AI suggest | `~vai giay, chap nhan duoc` | UI cho ket qua that, khong bi tre bat thuong. |
| Nutrition Insights load | `~vai giay, chap nhan duoc` | Data va recommendation len duoc. |
| AI chicken detect | `Thanh cong 1 lan, khong co timing instrumented on dinh` | Can do lai bang logger co cau truc. |

## 8. Danh gia do tin cay va hieu suat thao tac

### Do tin cay

Diem manh:

- Home, Diary, Stats, Nutrition Settings, Nutrition Insights, Notifications, About/Privacy hoat dong on dinh.
- Logout va session restore da chay duoc.

Diem yeu:

- Search fail co he thong.
- Voice fail co he thong.
- AI/gallery flow co flakiness.
- Cold restart va accessibility tree khong on dinh ngay sau launch.

Danh gia: `4.5/10`

### Hieu suat thao tac va UX

Diem manh:

- Cac man settings co bo cuc ro, de nhin.
- Stats va Home co dieu huong kha nhanh.
- Nutrition Settings -> Home sync cho cam giac he thong co lien ket.

Diem yeu:

- Search empty lam UX bi dut mach.
- AI quick save chua ro rang thong diep.
- Meal Diary edit can them thao tac Android Enter/Done.
- Edit Profile co dau hieu save thanh cong nhung feedback chua ro.

Danh gia: `6/10`

## 9. Bang chung chinh

Thu muc artifact:

- `D:\EatFitAI_v1\artifacts\qa\2026-03-28\`

Mot so artifact high-signal:

- Startup / relaunch:
  - `after-relaunch-screen.png`
  - `cold-reopen-waited.png`
- Auth:
  - `register-verify-screen.png`
  - `after-invalid-login-screen.png`
  - `after-valid-login-screen.png`
  - `logout-confirm-3.png`
  - `logout-done.png`
- Food search:
  - `food-search-empty-state.png`
- AI scan:
  - `scan-chicken-result.png`
  - `after-scan-back-2.png`
- Meal diary:
  - `meal-diary-screen.png`
  - `meal-diary-after-edit-enter.png`
  - `meal-diary-after-delete.png`
- Stats:
  - `stats-screen.png`
  - `stats-month.png`
  - `stats-day-tap.png`
- Voice:
  - `voice-ask-calories-final.png`
  - `voice-log-weight.png`
  - `voice-add-food-result.png`
- Nutrition:
  - `nutrition-settings-after-ai-adb.png`
  - `nutrition-settings-after-apply-adb.png`
  - `home-after-target-apply.png`
  - `nutrition-insights.png`
- Profile/settings:
  - `edit-profile-screen-3.png`
  - `body-metrics-screen-3.png`
  - `goal-settings-screen-2.png`
  - `dietary-restrictions-screen.png`
  - `weight-history.png`
  - `achievements.png`
  - `notifications-after-save.png`
  - `about.png`
  - `privacy-policy.png`
  - `profile-light-mode.png`
  - `profile-dark-restored.png`

## 10. Ket luan va uu tien sua

Uu tien sua ngay:

1. Sua Food Search/catalog de mo lai manual logging.
2. Sua voice parse stack va giam latency; neu chua dat quality thi nen tam tat/gan nhan beta.
3. Sua onboarding redirect sau login khi `needsOnboarding = true`.
4. Dong nhat lai resend verification voi register dev flow.

Uu tien tiep theo:

1. Lam on dinh AI gallery -> results -> recipe flow.
2. Them entry point ro rang cho Vision History hoac bo route neu chua san sang.
3. Them success state/confirmation ro rang cho Edit Profile va Meal Diary update.
4. Rasoat logic sync Achievements.

Uu tien ky thuat:

1. Loai bo debug warning overlay khoi test build.
2. Do lai startup/AI detect/voice bang logger co cau truc thay vi quan sat thu cong.
3. Xu ly can than cac file co dau hieu mojibake trong source; khong nen mass-edit encoding khi chua co quy trinh an toan.

## 11. Ket luan cuoi

EatFitAI hien da co mot bo khung app kha day du va mot so cum tinh nang cho thay gia tri that, dac biet la `Home + Diary + Stats + Nutrition Settings + Nutrition Insights`. Tuy nhien app chua dat muc on dinh de xem la production-ready vi cac flow cot loi nhat cho user pho thong van gap van de he thong: `Search`, `Voice`, va mot phan `AI scan -> recipe`.

Neu sap uu tien phat hanh noi bo, khuyen nghi chi phat hanh sau khi 4 muc uu tien sua ngay o tren da duoc xu ly va chay lai regression tren cung bo user flow nay.
