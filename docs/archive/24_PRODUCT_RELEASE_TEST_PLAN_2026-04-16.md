# Product Release Test Plan 2026-04-16

## Muc tieu

Tai lieu nay chot lane test `product-grade` cho EatFitAI theo thu tu:

`workspace -> code -> android automation -> real device evidence -> cloud verify`

Scope uu tien:

- end-user flow cho mobile + backend + ai-provider
- `real device first`
- secret dung lai duoc nhung khong commit
- evidence bundle thong nhat trong `_logs/production-smoke/<timestamp>`

## Secret contract

Bat buoc:

- `RENDER_API_KEY`
- `EATFITAI_DEMO_EMAIL`
- `EATFITAI_DEMO_PASSWORD`
- `EATFITAI_SMOKE_EMAIL`
- `EATFITAI_SMOKE_PASSWORD`

Optional cho lane onboarding rieng:

- `EATFITAI_ONBOARDING_EMAIL`
- `EATFITAI_ONBOARDING_PASSWORD`

Quy uoc:

- `RENDER_API_KEY` duoc doc tu shell env hoac Windows user env
- khong ghi key vao repo, `.env` tracked, markdown, JSON hay screenshot
- `start-mobile-cloud-smoke.ps1` se tu nap `RENDER_API_KEY` tu Windows user env neu shell hien tai chua co

## Gate commands

Gate 0 - Environment:

```powershell
npm --prefix .\eatfitai-mobile install
npm --prefix .\tools\appium install
npm --prefix .\eatfitai-mobile run automation:doctor
```

Neu app dang cai tren may Android la build `DEBUGGABLE`, `automation:doctor` phai thay Metro dang listen o `http://127.0.0.1:8081` truoc khi chay Maestro. Neu khong, app se dung o splash vi khong load duoc JS bundle.

Cho release gate Android, build dang cai tren may phai la `release-like` khong `DEBUGGABLE`. Build debug + Metro chi duoc xem la dev-smoke lane, khong du dieu kien pass `android` gate.

Gate 1 - Code:

```powershell
dotnet test .\EatFitAI_v1.sln
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile run guard:no-direct-ai-provider
```

Gate 2 - Android automation:

```powershell
npm --prefix .\eatfitai-mobile run build:android:preview
npm --prefix .\eatfitai-mobile run install:android:preview
npm --prefix .\eatfitai-mobile run maestro:smoke:android
npm --prefix .\eatfitai-mobile run maestro:regression:android
npm --prefix .\eatfitai-mobile run maestro:hero:android
npm --prefix .\eatfitai-mobile run appium:smoke
npm --prefix .\tools\appium run cloud-proof:android
```

Gate 3 - Real device certification:

- dung evidence bundle moi nhat trong `_logs/production-smoke/<timestamp>`
- can du:
  - `preflight-results.json`
  - `request-budget.json`
  - `session-observations.json`
  - `regression-run.json`
  - `metrics-baseline.json`
  - screenshot va logcat theo checklist
- `session-observations.json` phai chot:
  - `reopenHome.passed = true`
  - `scanToSave.passed = true`
  - `scanToSave.diaryReadbackPassed = true`
  - `nutritionApply.passed = true`
  - `stability.crashObserved = false`
  - `stability.freezeObserved = false`

Gate 4 - Cloud:

```powershell
npm --prefix .\eatfitai-mobile run smoke:render:verify
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:regression
npm --prefix .\eatfitai-mobile run smoke:metrics
npm --prefix .\eatfitai-mobile run smoke:rehearsal
```

Mot lenh gom gate:

```powershell
npm --prefix .\eatfitai-mobile run release:gate
```

Co the chay tung gate:

```powershell
node .\eatfitai-mobile\scripts\product-release-gate.js environment
node .\eatfitai-mobile\scripts\product-release-gate.js code
node .\eatfitai-mobile\scripts\product-release-gate.js android
node .\eatfitai-mobile\scripts\product-release-gate.js device
node .\eatfitai-mobile\scripts\product-release-gate.js cloud
```

## Maestro suites

Suite tong hop:

- `maestro:hero:android`

Suite rieng:

- `maestro:auth-full:android`
- `maestro:onboarding:android`
- `maestro:manual-diary:android`
- `maestro:ai-scan-save:android`
- `maestro:nutrition:android`
- `maestro:voice-text:android`
- `maestro:profile-stats:android`

Ghi chu quan trong:

- `auth-full` va `onboarding` clear app data truoc khi chay
- `manual-diary`, `nutrition`, `voice-text`, `profile-stats`, `ai-scan-save` dung lane authenticated bootstrap
- `ai-scan-save` trong Maestro hien la contract lane cho man hinh scan entry; release gate `scan -> result -> add meal -> diary` van duoc chung nhan boi real-device/cloud evidence
- voi may Android that, truoc khi chay Maestro can mo khoa may va bat cac tuy chon developer cho phep cai helper APK qua USB/ADB; neu khong, run se fail voi `INSTALL_FAILED_USER_RESTRICTED`
- Appium la lane phu cho diagnostics; chi la blocker khi server `http://127.0.0.1:4723` da duoc bat va release lane chu dong yeu cau Appium sanity
- `cloud-proof:android` la Appium lane uu tien neu can screenshot/page source/logcat de dong goi evidence cloud-grade
- voi build debug + Metro lan dau, cold bundle co the mat hon `30s`; lane nay chi de debug, khong duoc dung de pass release gate Android

## Cloud verify

Script:

- `eatfitai-mobile/scripts/production-smoke-render-verify.js`

Evidence:

- `render-verify.json`

Gate nay verify:

- Render service id/name
- branch deploy hien tai
- `autoDeploy = yes`
- `autoDeployTrigger = commit`
- service khong bi suspend
- latest deploy o state thanh cong

Expected branch mac dinh:

- uu tien `RENDER_EXPECTED_BRANCH`
- neu khong co, script dung branch git hien tai cua workspace

## Voice source of truth

Tu ngay `2026-04-16`, lane test va release gate phai bam code hien tai:

- mobile -> backend `/api/voice/transcribe`
- mobile -> backend `/api/voice/parse`

Khong test theo tai lieu cu mo ta mobile goi truc tiep AI provider cho voice parse/transcribe.

Code tham chieu:

- [voiceService.ts](/D:/EatFitAI_v1/eatfitai-mobile/src/services/voiceService.ts:129)
- [AppNavigator.tsx](/D:/EatFitAI_v1/eatfitai-mobile/src/app/navigation/AppNavigator.tsx:1)
- [start-mobile-cloud-smoke.ps1](/D:/EatFitAI_v1/start-mobile-cloud-smoke.ps1:1)

## Thu tu release khuyen nghi

1. Chay Gate 0 va Gate 1.
2. Chay Gate 2 tren Android automation.
3. Chay lane real-device va cap nhat evidence bundle.
4. Chay Gate 4 sau khi Render rollout xong.
5. Chi coi lane on dinh khi `smoke:rehearsal` xac nhan 3 session gan nhat deu pass.
