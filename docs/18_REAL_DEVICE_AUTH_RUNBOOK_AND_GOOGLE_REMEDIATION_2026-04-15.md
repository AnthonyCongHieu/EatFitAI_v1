# Real Device Auth Runbook + Google/Reset Remediation 2026-04-15

## Muc tieu

Tai lieu nay dung de:

- van hanh lai lane test auth tren thiet bi Android that qua USB ma khong phai do lai tu dau
- ghi ro cac bug da xac nhan tren may that
- huong dan lay Google credentials/files con thieu
- de ra ke hoach fix toan dien cho:
  - Google Sign-In
  - forgot password / reset password gui mail that
  - bug dieu huong sau login

Pham vi xac nhan thuc te cua tai lieu nay:

- repo: `E:\tool edit\eatfitai_v1`
- mobile app: `eatfitai-mobile`
- backend: `eatfitai-backend`
- thiet bi Android that qua USB
- thoi diem xac nhan: `2026-04-15`

## Ket luan nhanh da verify tren may that

1. App co the duoc dieu khien on dinh tren may that bang `Metro + Appium attach + adb`.
2. `adb uiautomator dump` tren may Xiaomi/MIUI nay khong dang tin cay, co luc tra ve UI cu.
3. Appium `getPageSource()` la nguon su that chinh de debug UI lane nay.
4. Warning debug luc cold start co de len CTA intro.
5. Forgot/reset tren local dev co the di het flow neu dung reset code tra ve tu backend dev.
6. Google login da duoc cau hinh thanh cong tren local real-device lane bang Google OAuth clients + `google-services.json` cua cung mot project.
7. Login thanh cong voi `needsOnboarding=true` truoc day dung o man Login; bug nay da duoc fix trong mobile UI.
8. Forgot/reset production da duoc verify bang mailbox that: gui mail, nhan ma, reset thanh cong, va dang nhap lai duoc bang mat khau moi.
9. Google sign-in production da duoc verify tren may that: login screen -> account picker -> consent -> backend exchange `/api/auth/google/signin` -> app quay lai `com.eatfitai.app`.
10. Tren may Xiaomi/MIUI nay, `UiAutomator2` co the crash sau mot so thao tac input/click; khi do `logcat` + `dumpsys` la fallback bat buoc.
11. Ca `eatfitai-backend` va `eatfitai-ai-provider` tren Render deu dang auto-deploy tu branch `hieu_deploy/production`.

## Hien trang bug

### Bug 1: warning debug de len nut `Bat dau ngay`

Trang thai:

- da xac nhan tren may that
- chua fix tan goc trong turn nay
- cach khac phuc tam thoi da ro va dung duoc

Workaround hien tai:

- cold start app
- viec dau tien sau restart la kiem tra warning debug
- neu thay warning `Open debugger to view warnings.` thi bam `x` truoc
- chi sau khi warning bien mat moi tap CTA intro/auth
- tren device 1080x2400 da test, nut close warning nam xap xi quanh `x=992 y=2223`

Ghi chu:

- bug nay duoc note lai de khi van hanh lane test thi xu ly warning truoc, khong tap mu vao CTA

### Bug 2: forgot/reset o local dev khong dung duoc neu chi bao nguoi dung "kiem tra email"

Trang thai:

- da xac nhan root cause
- da fix mobile de lane dev co the tiep tuc bang reset code backend tra ve
- can harden them de production/commercial chay dung voi mail that

Root cause da verify:

- backend dev co the tra `resetCode`
- mobile cu bo qua `resetCode`, van bat nguoi dung phai cho email

Code lien quan:

- mobile: [ForgotPasswordScreen.tsx](</E:/tool edit/eatfitai_v1/eatfitai-mobile/src/app/screens/auth/ForgotPasswordScreen.tsx:82>)
- backend response DTO: [ForgotPasswordResponse.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/DTOs/Auth/ForgotPasswordResponse.cs:3>)
- backend auth service: [AuthService.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/Services/AuthService.cs:438>)

### Bug 3: login thanh cong nhung dung o man Login khi `needsOnboarding=true`

Trang thai:

- da xac nhan tren may that
- da fix trong mobile UI
- da verify lai bang fresh session tren may that: sau login app chuyen sang `Onboarding`

Code lien quan:

- mobile login screen: [LoginScreen.tsx](</E:/tool edit/eatfitai_v1/eatfitai-mobile/src/app/screens/auth/LoginScreen.tsx:78>)

### Google Sign-In

Trang thai:

Cap nhat moi nhat 2026-04-15 12:25:

- blocker cau hinh ben duoi da duoc giai quyet tren local lane
- da verify end-to-end tren may that: chon tai khoan Google -> consent -> backend exchange token -> vao `home-screen`
- mobile khong con bao loi thieu `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- backend local da nhan va validate duoc Google sign-in request
- moi truong deploy/backend thuong mai van can duoc cap nhat env `Google__*`
- iOS van chua du thong tin client/file native

- chua the hoat dong tren may that vi thieu cau hinh that
- day la blocker cau hinh, khong phai bug tap/click thuần UI

Log thuc te tren may that:

- `Web Client ID chua duoc cau hinh. Hay set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID...`
- `Khong the khoi tao Google Sign-In. Kiem tra EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID va env mobile.`

Thong so local da verify sau khi fix:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `Google__WebClientId`

```text
304016580439-1d2v8u9jv0mmculcrrk1v1mhjl5gi9o4.apps.googleusercontent.com
```

- `Google__AndroidClientId`

```text
304016580439-bm43iucmt35egq4ctdolvv066v0p7ced.apps.googleusercontent.com
```

- Android native config file:

```text
eatfitai-mobile/android/app/google-services.json
```

- Android wiring da duoc verify o cac file:
  - [app.json](</E:/tool edit/eatfitai_v1/eatfitai-mobile/app.json:26>)
  - [android/build.gradle](</E:/tool edit/eatfitai_v1/eatfitai-mobile/android/build.gradle:12>)
  - [android/app/build.gradle](</E:/tool edit/eatfitai_v1/eatfitai-mobile/android/app/build.gradle:4>)

Log thanh cong da thay tren may that:

- mobile log co `GoogleAuth] Sign in success`
- app POST thanh cong toi `/api/auth/google/signin`
- token duoc luu vao secure storage
- app attach bearer token va vao `home-screen`

Code lien quan:

- mobile env validation: [google.config.ts](</E:/tool edit/eatfitai_v1/eatfitai-mobile/src/config/google.config.ts:23>)
- mobile auth store: [useAuthStore.ts](</E:/tool edit/eatfitai_v1/eatfitai-mobile/src/store/useAuthStore.ts:248>)
- backend Google auth: [GoogleAuthController.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/Controllers/GoogleAuthController.cs:72>)
- backend optional warning: [Program.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/Program.cs:382>)

## Runbook van hanh auth tren thiet bi that

## Trang thai cloud hien tai

Da verify bang Render API ngay trong workspace nay:

- `eatfitai-backend`
  - service id: `srv-d7arf2svjg8s73em138g`
  - branch deploy: `hieu_deploy/production`
  - auto deploy: `yes`
  - trigger: `commit`
- `eatfitai-ai-provider`
  - service id: `srv-d7arf2kvjg8s73em1360`
  - branch deploy: `hieu_deploy/production`
  - auto deploy: `yes`
  - trigger: `commit`

Y nghia van hanh:

- push branch `hieu_deploy/production` len `origin` se tu dong rollout cloud cho 2 service Render tren
- mobile native changes khong "deploy" len Render, nhung can duoc commit/push de dong bo source of truth
- sau khi push, can doi Render build xong roi moi ket luan rollout da hoan tat

### 1. Preflight

1. Cam thiet bi Android that qua USB.
2. Bat `USB debugging`.
3. Dam bao may tinh va dien thoai cung LAN neu dung Metro qua `--host lan`.
4. Dung Node `20.x`.

Lenh kiem tra:

```powershell
adb devices -l
```

### 2. Bat backend local

Backend auth flow khong can AI provider de test login/forgot/reset.

Lenh health check:

```powershell
Invoke-WebRequest http://127.0.0.1:5247/health -UseBasicParsing
```

Neu backend chua chay, bat backend theo lane hien co cua repo.

### 3. Bat Metro cho thiet bi that

Dung trong `E:\tool edit\eatfitai_v1\eatfitai-mobile`:

```powershell
npm run dev:device -- --clear --port 8081
```

Sau do reverse cong:

```powershell
adb reverse tcp:8081 tcp:8081
```

Kiem tra Metro:

```powershell
Invoke-WebRequest http://127.0.0.1:8081/status -UseBasicParsing
```

Ky vong:

- ket qua chua `packager-status:running`

### 4. Bat Appium lane attach

Dung Appium tren cong `4726` de tranh dung voi lane khac.

```powershell
$sdk = 'E:\tool edit\eatfitai_v1\_tooling\android-sdk'
$jdk = 'E:\tool edit\eatfitai_v1\_tooling\jdk-17'
$arg = "/c set ANDROID_SDK_ROOT=$sdk&& set ANDROID_HOME=$sdk&& set JAVA_HOME=$jdk&& set PATH=$jdk\bin;$sdk\platform-tools;$sdk\emulator;$sdk\cmdline-tools\latest\bin;%PATH%&& appium --port 4726"
Start-Process cmd.exe -ArgumentList $arg -WindowStyle Hidden
```

Health check:

```powershell
Invoke-WebRequest http://127.0.0.1:4726/status -UseBasicParsing
```

### 5. Launch app

```powershell
adb shell am start -S -W -n com.eatfitai.app/.MainActivity
```

### 5.1 Quy tac bat buoc sau moi lan restart

Khong bo qua buoc nay.

1. Restart/cold-launch app.
2. Inspect state ngay sau restart.
3. Neu thay warning `Open debugger to view warnings.`:
   - bam nut `x`
   - khong tap `Bat dau ngay` khi warning con hien
4. Chi sau khi warning bien mat moi di tiep vao intro/welcome/login.

Reason:

- warning debug dang de len CTA intro
- neu tap mu, rat de hit vao warning thay vi auth control
- day la nguyen nhan chinh gay click nham trong lane nay

### 6. Nguyen tac debug UI de tranh click nham

1. Uu tien Appium `getPageSource()` + screenshot.
2. Khong tin `adb uiautomator dump` tren may MIUI nay.
3. Khong dung `tools/appium/lib/common.connect()` de inspect state hien tai, vi ham nay cold-launch app.
4. Neu can attach vao app dang mo, dung WebdriverIO `remote()` voi:

```text
appium:autoLaunch=false
appium:noReset=true
```

5. Luon chup artifact vao:

```text
artifacts/ui-auth-check/
```

6. Neu `UiAutomator2` crash sau khi input/click:
   - reconnect session moi
   - khong ket luan la flow fail chi vi Appium crash
   - dung `adb logcat -d` de xem app co request/log success that hay khong
   - dung `adb shell dumpsys activity activities` va `adb shell dumpsys window windows` de xac dinh app/package dang foreground

7. Neu can so sanh man hinh ma khong OCR duoc:
   - chup screenshot qua `adb exec-out screencap -p`
   - doi chieu voi artifact pass truoc do
   - uu tien so sanh voi `welcome`, `login`, `home`, `onboarding`, `google consent`

### 7. Cach di qua warning debug an toan

1. Cold start app.
2. Chup screenshot/page source.
3. Neu thay warning `Open debugger to view warnings.`, bam `x`.
4. Xac nhan warning da bien mat trong source/screenshot.
5. Sau khi warning bien mat moi tap `Bat dau ngay`.

### 8. Checklist test UI auth tren may that

#### Intro -> Welcome -> Login

1. Dismiss warning neu co.
2. Tap `Bat dau ngay`.
3. Tap `Tiep tuc voi Email`.
4. Xac nhan man `auth-login-screen`.

#### Forgot password / reset password

1. Vao `Quen mat khau?`
2. Nhap email test
3. Tap gui ma
4. Dev lane:
   - neu backend tra `resetCode`, app se show `MA DEV` va prefill OTP
5. Production/commercial lane:
   - phai nhan mail that
   - khong duoc show reset code trong response/UI
6. Xac nhan OTP
7. Dat mat khau moi
8. Quay lai login
9. Dang nhap lai bang mat khau moi

#### Google login

1. O man `Login`, tap `Tiep tuc voi Google`
2. Neu loi xay ra ngay truoc khi mo account picker:
   - uu tien check mobile env/client IDs
3. Neu Google mo man consent `Dang nhap bang Google`:
   - chon tai khoan
   - bam `Tiep tuc`
4. Ky vong sau consent:
   - app quay lai `com.eatfitai.app`
   - co log `Google Sign-In successful`
   - vao `home-screen` hoac `Onboarding` tuy account
5. Neu vao duoc account picker nhung backend fail:
   - check backend `Google__*`

#### Fallback quan sat khi Google flow mat source

1. Bam `Tiep tuc voi Google`.
2. Neu Appium source khong doc duoc ngay:
   - check `logcat`
   - ky vong thay `[LoginScreen] Starting Google Sign-In...`
3. Neu da vao account picker:
   - `dumpsys window windows` thuong se show `AccountPickerActivity`
4. Sau khi chon account:
   - `dumpsys` thuong se show `ConsentActivity`
5. Sau khi bam `Tiep tuc`:
   - `logcat` ky vong thay:
     - request `/api/auth/google/signin`
     - `[useAuthStore] Google Sign-In successful, saving tokens...`
6. Cuoi cung xac nhan app tro lai `com.eatfitai.app`

## Huong dan lay Google credentials va file con thieu

## Thong tin co so cua app hien tai

- Android package: `com.eatfitai.app`
- iOS bundle identifier trong Expo config: `com.eatfitai.app`
- debug keystore hien tai: [android/app/debug.keystore](</E:/tool edit/eatfitai_v1/eatfitai-mobile/android/app/debug.keystore>)
- debug SHA-1 da lay duoc:

```text
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

- debug SHA-256 da lay duoc:

```text
FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

- release keystore local da tao ngay `2026-04-15` tai:

```text
E:\tool edit\eatfitai_v1\_state\mobile-signing\eatfitai-release.keystore
```

- release alias:

```text
eatfitai-release
```

- release SHA-1:

```text
83:FF:A6:99:53:2E:D1:05:1A:38:53:5C:7B:01:E2:1D:5F:41:C5:1F
```

- release SHA-256:

```text
E3:C2:DB:A6:65:1F:99:65:D3:8A:49:6B:F2:F1:10:C2:9C:AC:F2:69:FE:B7:85:B6:99:F9:6E:E5:9A:AD:9C:94
```

Lenh tu lay lai fingerprint:

```powershell
& 'E:\tool edit\eatfitai_v1\_tooling\jdk-17\bin\keytool.exe' `
  -list -v `
  -alias androiddebugkey `
  -keystore 'E:\tool edit\eatfitai_v1\eatfitai-mobile\android\app\debug.keystore' `
  -storepass android `
  -keypass android
```

## A. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Day la OAuth Client ID loai `Web application`.

Cach lay:

1. Vao Google Cloud Console.
2. Chon dung project dung cho EatFitAI.
3. Vao `APIs & Services` -> `Credentials`.
4. `Create credentials` -> `OAuth client ID`.
5. Chon `Web application`.
6. Dat ten de phan biet, vi du `EatFitAI Web Client`.
7. Copy gia tri co dang:

```text
xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

Noi can dien:

- mobile local/dev: [eatfitai-mobile/.env.development.local](</E:/tool edit/eatfitai_v1/eatfitai-mobile/.env.development.local:6>)
- mobile cloud/prod env
- backend: `Google__WebClientId`

Tai lieu chinh thuc:

- Firebase Android setup: [Firebase Android setup](https://firebase.google.com/docs/android/setup)
- Google Cloud OAuth clients help: [Manage OAuth Clients](https://support.google.com/cloud/answer/15549257)

## B. `Google Android client ID`

Day la OAuth Client ID loai `Android`.

Cach lay:

1. Vao `APIs & Services` -> `Credentials`.
2. `Create credentials` -> `OAuth client ID`.
3. Chon `Android`.
4. Nhap:
   - package name: `com.eatfitai.app`
   - SHA-1: dung fingerprint cua debug keystore cho dev build
   - them SHA-1/SHA-256 cua release keystore cho production build
5. Luu lai Android client ID.

Noi can dien:

- backend: `Google__AndroidClientId`

Ghi chu quan trong:

- neu su dung dev build debug va release build production, phai dang ky ca 2 bo fingerprint
- neu dung EAS/Play App Signing, can lay fingerprint release that tu EAS credentials hoac Play Console

## C. `google-services.json` neu Android native chua cau hinh

Tinh hinh repo hien tai:

- Android native folder co ton tai: [eatfitai-mobile/android](</E:/tool edit/eatfitai_v1/eatfitai-mobile/android>)
- file `google-services.json` hien chua co
- `android/app/build.gradle` hien chua apply `com.google.gms.google-services`

Cach lay file:

1. Vao Firebase Console.
2. Chon project EatFitAI.
3. `Project settings` -> `Your apps`.
4. Neu chua co Android app, them Android app voi package `com.eatfitai.app`.
5. Download `google-services.json`.

Noi dat file:

```text
eatfitai-mobile/android/app/google-services.json
```

Neu quyet dinh standardize theo Firebase-native config, can them Google services plugin vao:

- [android/build.gradle](</E:/tool edit/eatfitai_v1/eatfitai-mobile/android/build.gradle>)
- [android/app/build.gradle](</E:/tool edit/eatfitai_v1/eatfitai-mobile/android/app/build.gradle>)

Tai lieu chinh thuc:

- [Add Firebase to Android](https://firebase.google.com/docs/android/setup)

## D. `GoogleService-Info.plist` neu iOS native chua cau hinh

Tinh hinh repo hien tai:

- hien chua co thu muc `eatfitai-mobile/ios`
- nghia la iOS native project co the se duoc tao sau bang Expo prebuild/EAS

Cach lay file:

1. Vao Firebase Console.
2. Trong cung project, them iOS app voi bundle identifier `com.eatfitai.app`.
3. Download `GoogleService-Info.plist`.

Noi dat file sau khi co iOS native project:

```text
eatfitai-mobile/ios/GoogleService-Info.plist
```

Neu chua prebuild iOS:

- luu file trong secret storage an toan
- inject vao build lane khi tao iOS native project/EAS build

Tai lieu chinh thuc:

- [Add Firebase to iOS](https://firebase.google.com/docs/ios/setup)

## E. `Google:IosClientId`

Day la OAuth Client ID loai `iOS`.

Cach lay:

1. Vao `APIs & Services` -> `Credentials`.
2. `Create credentials` -> `OAuth client ID`.
3. Chon `iOS`.
4. Nhap bundle identifier `com.eatfitai.app`.
5. Luu lai iOS client ID.

Noi can dien:

- mobile env: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- backend: `Google__IosClientId`

## F. Cac gia tri backend `Google:WebClientId`, `Google:AndroidClientId`, `Google:IosClientId`

Repo hien tai da co placeholder:

- [appsettings.json](</E:/tool edit/eatfitai_v1/eatfitai-backend/appsettings.json:27>)
- [appsettings.Production.json](</E:/tool edit/eatfitai_v1/eatfitai-backend/appsettings.Production.json:21>)

Noi set that khi deploy:

- Render env vars:
  - `Google__WebClientId`
  - `Google__AndroidClientId`
  - `Google__IosClientId`

Noi set that khi local backend:

- `dotnet user-secrets`
- hoac env vars cua shell/IDE

Luu y:

- production khong duoc de placeholder
- backend se tu canh bao `Google sign-in disabled` neu thieu bat ky gia tri nao

## Ke hoach fix toan dien

## A. Google Sign-In

### Phase 1: Hoan tat credentials va native wiring

1. Tao day du 3 OAuth client IDs:
   - Web
   - Android
   - iOS
2. Dang ky dung package/bundle ID `com.eatfitai.app`.
3. Add fingerprint cho Android:
   - debug SHA-1/SHA-256
   - release SHA-1/SHA-256
4. Lay `google-services.json` va `GoogleService-Info.plist`.
5. Dien env/mobile:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
6. Dien env/backend:
   - `Google__WebClientId`
   - `Google__AndroidClientId`
   - `Google__IosClientId`
7. Rebuild dev client/release build sau khi them credentials native.

### Phase 2: Fix contract backend/mobile cho Google

Can lam them de production on dinh:

1. Backend `GoogleAuthController` nen tra them:
   - `accessTokenExpiresAt`
   - `refreshTokenExpiresAt`
   - `needsOnboarding` o top-level
2. Mobile `useAuthStore.signInWithGoogle()` nen fallback doc:
   - `data.needsOnboarding`
   - hoac `data.user.needsOnboarding`
3. Mobile token save cho Google nen dung cung contract expiry nhu login thuong.
4. Them test cho 2 case:
   - Google user moi -> vao `Onboarding`
   - Google user cu -> vao app chinh

Ly do:

- hien backend Google response tra `User.NeedsOnboarding` ben trong `user`
- mobile store hien doc top-level `needsOnboarding` la chinh
- neu khong chinh contract, Google login co the dang nhap thanh cong nhung sai dieu huong

### Phase 3: Operator hardening

1. Tao staging credential set rieng cho Google.
2. Viet smoke test that tren real device:
   - tap Google
   - mo account picker
   - backend doi `idToken` thanh JWT
   - user moi vao onboarding
3. Log can theo doi:
   - mobile log `GoogleAuth`
   - backend log `GoogleAuthController`
   - 401/503 rate tren `/api/auth/google/signin`

## B. Forgot password / reset password gui mail that

### Hien trang dung cua backend

Da verify tu repo:

- backend gui mail qua Brevo HTTP API, khong phai SMTP thuần:
  - [EmailService.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/Services/EmailService.cs:40>)
- production se nem loi neu Brevo chua cau hinh
- password reset code duoc luu DB table `PasswordResetCode`, khong chi la memory:
  - [ApplicationDbContext.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/Data/ApplicationDbContext.cs:45>)
  - [AuthService.cs](</E:/tool edit/eatfitai_v1/eatfitai-backend/Services/AuthService.cs:552>)

### Muc tieu production/commercial

1. Nguoi dung nhan mail that.
2. UI khong bao gio show reset code trong production.
3. Reset code chi hop le trong thoi gian TTL, dung 1 lan.
4. Can do duoc email deliverability va loi gui mail.

### Phase 1: Chuan hoa mail provider va secrets

1. Chot Brevo la source of truth cho production.
2. Set secrets that tren Render:
   - `Brevo__ApiKey`
   - `Brevo__SenderEmail`
   - `Brevo__SenderName`
3. Xac minh sender/domain trong Brevo.
4. Cau hinh SPF/DKIM/DMARC cho domain gui mail.
5. Sua [render.yaml](</E:/tool edit/eatfitai_v1/render.yaml>) de bo `Smtp__*` stale config va thay bang `Brevo__*`.

### Phase 2: Chuan hoa behavior giua dev va production

1. Giu `resetCode` response chi cho lane dev/test ro rang.
2. Bao ve mobile dev banner `MA DEV` bang dieu kien moi truong ro rang:
   - `__DEV__`
   - hoac env flag nhu `EXPO_PUBLIC_AUTH_DEV_RESET_HELPER=1`
3. Them API/integration test khang dinh:
   - production env => `resetCode` rong
   - development env => co the tra `resetCode`

### Phase 3: UX + security + operability

1. Verify step phai luon goi backend de check ma hop le truoc khi sang man dat mat khau moi.
2. Them rate limit va resend throttle phia server, khong chi countdown o client.
3. Log cac event:
   - forgot requested
   - email sent
   - email send failed
   - code verified
   - password reset success
4. Them alert/metrics:
   - ti le 503 `smtp_unavailable`
   - ti le 401 `verify-reset-code`
5. Tao smoke test dung mailbox that:
   - local/staging
   - production rehearsal

### Phase 4: Lane test mail that de van hanh lau dai

De nghi tao 2 lane:

1. Dev helper lane:
   - cho phep `resetCode` dev de debug nhanh
2. Staging/production-like lane:
   - bat buoc mail that
   - dung mailbox quan ly duoc
   - khong duoc phu thuoc `resetCode` trong response

## C. Bug 3 - login sau auth thanh cong nhung dung o Login

Trang thai:

- da fix trong mobile UI

Fix da ap dung:

- neu `login()` tra `needsOnboarding=true`, `LoginScreen` se `navigation.reset()` sang `Onboarding`
- cung logic do da duoc ap cho nhanh Google login de tranh lap lai bug

Viec can bo sung:

1. Them UI test cho:
   - email login -> onboarding
   - Google login -> onboarding
2. Dam bao backend Google response tra dung `needsOnboarding` de mobile doc duoc on dinh

## Checklist truoc khi ket luan "Google + Forgot/Reset da san sang production"

1. Real device Android login email pass.
2. Real device Android forgot-password nhan mail that.
3. Verify code hop le.
4. Reset password xong login lai duoc.
5. Production response khong bao gio leak `resetCode`.
6. Google tap vao mo duoc account picker.
7. Google signin thanh cong tao/refresh JWT tren backend.
8. User moi vao onboarding, user cu vao app chinh.
9. Render secrets day du:
   - `Google__*`
   - `Brevo__*`
10. Tai lieu/runbook nay duoc cap nhat neu thay doi lane.

## Bang xac nhan thuc te tren may that ngay 2026-04-15

### Forgot/reset production

- da gui `forgot-password` toi backend production
- da nhan mail that trong Gmail
- da verify reset code hop le
- da reset thanh cong mat khau
- da dang nhap lai tren may that bang mat khau moi
- sau login, app vao `auth-onboarding-screen`

Artifact chinh:

- [after-login-success-source.xml](</E:/tool edit/eatfitai_v1/artifacts/device-inspect/after-login-success-source.xml>)
- [after-login-success-screen.png](</E:/tool edit/eatfitai_v1/artifacts/device-inspect/after-login-success-screen.png>)

### Google sign-in production

- da dong warning debug truoc khi vao auth
- da mo Google account picker
- da chon account that
- da qua consent
- app da nhan `idToken`
- backend production da nhan `/api/auth/google/signin`
- mobile log da ghi `Google Sign-In successful, saving tokens...`
- app tro lai `com.eatfitai.app`
- state sau callback khop voi artifact home da pass truoc do

Artifact/log chinh:

- [google-after-login-googletap.png](</E:/tool edit/eatfitai_v1/artifacts/device-inspect/google-after-login-googletap.png>)
- [google-consent-current.png](</E:/tool edit/eatfitai_v1/artifacts/device-inspect/google-consent-current.png>)
- [google-post-success-wait.png](</E:/tool edit/eatfitai_v1/artifacts/device-inspect/google-post-success-wait.png>)
- [after-continue.png](</E:/tool edit/eatfitai_v1/artifacts/device-inspect/after-continue.png>)

### Ghi chu van hanh sau verify

- `eatfitai-mobile/.env.development.local` da duoc tra ve local API sau buoi smoke
- khi can smoke production lai, chi doi env tam thoi trong session test, xong phai tra ve local nhu cu

## Nguon tham khao chinh thuc

- Firebase Android setup: [https://firebase.google.com/docs/android/setup](https://firebase.google.com/docs/android/setup)
- Firebase iOS setup: [https://firebase.google.com/docs/ios/setup](https://firebase.google.com/docs/ios/setup)
- Google Cloud OAuth clients help: [https://support.google.com/cloud/answer/15549257](https://support.google.com/cloud/answer/15549257)
