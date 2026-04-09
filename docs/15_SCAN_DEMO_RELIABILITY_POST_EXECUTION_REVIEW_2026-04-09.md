# Scan Demo Reliability Post-Execution Review

Updated: `2026-04-09`

## Mục tiêu của bundle

Bundle này chốt 5 task đầu tiên cho lane `scan-to-demo reliability` theo vòng đầy đủ:

- dev trong repo
- chạy cloud E2E thật trên emulator
- sửa theo evidence thật
- cập nhật Notion theo trạng thái thật

5 task đã thực hiện:

- `P5-03` AI Regression Test Set
- `P5-09` Critical Product Metrics
- `P5-05` Seed Data Demo cố định
- `P5-02` Test Cases + UAT
- `P5-04` Rehearsal Demo 3 kịch bản rủi ro

## Đánh giá sau khi thực hiện 5 task

### Kết quả tổng quan

- `2/5` task đã đủ điều kiện để mark `Hoàn thành`
- `3/5` task vẫn phải giữ `Đang thực hiện`
- Lane cloud/emulator hiện đã chạy mượt cho:
  - `demo seed -> login -> diary -> reopen`
  - `register disposable -> verify mail -> onboarding -> home -> reopen`
- Lane này chưa đạt trạng thái `rehearsal-ready`

### Trạng thái từng task

#### `P5-05` Seed Data Demo cố định

- Trạng thái: `Hoàn thành`
- Đánh giá:
  - Đã có seed deterministic cho demo account cloud
  - Đã verify trên emulator bằng flow thật
  - Có evidence cho `home`, `diary`, `reopen`
- Artifact chính:
  - `E:\tool edit\eatfitai_v1\_logs\production-smoke\2026-04-09T12-49-24-085Z\demo-seed.json`
  - `E:\tool edit\eatfitai_v1\_logs\production-smoke\2026-04-09T12-49-24-085Z\auth-e2e-report.json`

#### `P5-09` Critical Product Metrics

- Trạng thái: `Hoàn thành`
- Đánh giá:
  - Đã có baseline sinh từ cloud session thật
  - Metrics đã đủ để đo chất lượng lane, không còn chạy theo cảm giác
- Baseline chính:
  - search success: `100%`
  - search empty: `100%`
  - scan primary: `100%`
  - voice parse: `66.7%`
  - voice execute: `100%`
  - nutrition suggest/apply: `100%`
- Artifact chính:
  - `E:\tool edit\eatfitai_v1\_logs\production-smoke\2026-04-09T12-49-24-085Z\metrics-baseline.json`

#### `P5-03` AI Regression Test Set

- Trạng thái: `Đang thực hiện`
- Đánh giá:
  - Regression runner, fixture manifest và artifact chain đã hoàn chỉnh
  - Search, scan và nutrition pass tốt trên cloud
  - Voice gate chưa pass hoàn toàn
- Blocker thật:
  - Cloud parser vẫn fail case `ADD_FOOD`
  - `scan-to-save` chưa có manual evidence trọn lane
- Artifact chính:
  - `E:\tool edit\eatfitai_v1\_logs\production-smoke\2026-04-09T12-49-24-085Z\regression-run.json`

#### `P5-02` Test Cases + UAT

- Trạng thái: `Đang thực hiện`
- Đánh giá:
  - Đã có template và evidence internal run thật trên emulator
  - Chưa đủ điều kiện đóng task vì chưa có `>=5 user thật`
- Artifact chính:
  - `E:\tool edit\eatfitai_v1\docs\templates\scan-demo-uat-cases.csv`
  - `E:\tool edit\eatfitai_v1\docs\templates\scan-demo-uat-report-template.md`
  - `E:\tool edit\eatfitai_v1\_logs\production-smoke\2026-04-09T13-10-00-000Z\auth-e2e-report.json`

#### `P5-04` Rehearsal Demo 3 kịch bản rủi ro

- Trạng thái: `Đang thực hiện`
- Đánh giá:
  - Đã có rehearsal runner và summary gate
  - Chưa thể pass vì chưa đủ 3 session metrics-backed pass liên tiếp
- Blocker thật:
  - chưa chạy 3 risk scenarios
  - chưa có `scan-to-save` evidence
  - evidence completeness chưa pass
  - voice `ADD_FOOD` còn fail trên cloud
- Artifact chính:
  - `E:\tool edit\eatfitai_v1\_logs\production-smoke\rehearsal-summary.json`

## Điểm mạnh sau bundle này

- Đã khóa được một lane cloud thật, không còn dựa vào local-only verification
- Đã có artifact chain nhất quán cho mỗi session:
  - `preflight-results.json`
  - `request-budget.json`
  - `fixture-manifest.json`
  - `session-observations.json`
  - `regression-run.json`
  - `metrics-baseline.json`
  - `auth-e2e-report.json`
- Có thể tái chạy flow auth thật trên emulator mà không cần thao tác tay với mailbox
- Có thể seed demo account lặp lại mà không lệch state

## Điểm yếu và nợ kỹ thuật còn lại

- Cloud backend hiện vẫn có route profile/preferences không ổn định
- Voice intent `ADD_FOOD` chưa đủ tin cậy để coi là release gate
- Rehearsal gate vẫn phụ thuộc manual evidence cho `scan-to-save` và risk scenarios
- UAT thật với người dùng ngoài team chưa bắt đầu

## Automation stack đã dùng

### 1. PowerShell orchestration

Dùng để bootstrap môi trường và giữ command line nhất quán:

- `_config/dev-env.ps1`
- `start-mobile-cloud-smoke.ps1`
- `seed-scan-demo.ps1`

Vai trò:

- nạp `adb`, Android SDK, Java, Maestro vào `PATH`
- ép mobile dùng cloud backend đúng target
- chuẩn hóa cách chạy giữa các session

### 2. ADB

ADB là lớp automation nền cho emulator:

- clear app data
- cold launch app
- swipe/scroll
- chụp và đọc logcat
- kiểm tra thiết bị đang online

ADB giúp loại bỏ nhiều flaky behavior mà UI runner đơn lẻ không xử lý tốt, nhất là:

- `process death`
- `reopen`
- `keyboard/back`
- `log capture`

### 3. Appium + WebdriverIO

Dùng cho các flow cần điều khiển UI chi tiết và có state chuyển nhanh:

- intro
- welcome
- login/register
- verify email
- onboarding
- reopen

Lý do dùng Appium ở đây:

- thao tác chính xác theo `testID`
- dễ thêm fallback selector và keyboard handling
- phù hợp với flow auth nhiều step hơn Maestro

Runner chính:

- `eatfitai-mobile/scripts/production-smoke-auth-e2e.js`

### 4. Maestro

Dùng làm smoke gate chính cho lane authenticated/happy path đã ổn định:

- smoke authenticated flow
- regression contract cho quick actions / AI scan entry

Lý do dùng Maestro:

- flow YAML ngắn, dễ đọc
- chạy nhanh
- hợp với kiểm tra contract mức UI mà không cần điều khiển phức tạp

Files chính:

- `eatfitai-mobile/.maestro/subflows/start-authenticated.yaml`
- `eatfitai-mobile/.maestro/regression/01-ai-scan-entry.yaml`
- `eatfitai-mobile/.maestro/regression/02-home-actions-contract.yaml`

### 5. Node smoke runners

Đây là lớp orchestration quan trọng nhất để làm lane trơn tru.

Scripts:

- `eatfitai-mobile/scripts/production-smoke-preflight.js`
- `eatfitai-mobile/scripts/production-smoke-seed-cloud.js`
- `eatfitai-mobile/scripts/production-smoke-regression.js`
- `eatfitai-mobile/scripts/production-smoke-metrics.js`
- `eatfitai-mobile/scripts/production-smoke-rehearsal.js`
- `eatfitai-mobile/scripts/production-smoke-auth-e2e.js`

Vai trò:

- tạo session output dir
- sinh artifact chuẩn hóa
- quản lý request budget
- tổng hợp baseline
- tính rehearsal gate
- gom evidence về một chỗ

### 6. Disposable mailbox automation

Để làm flow `register -> verify` thật mà không phải ngồi mở inbox tay, bundle dùng:

- `mail.tm` API qua chính runner Node

Runner đã tự động:

- tạo mailbox tạm
- lấy token mailbox
- poll email verify
- trích mã 6 số
- bơm mã vào màn verify
- lưu JSON artifact của mailbox/message

Điểm quan trọng:

- flow này chạy trên cloud thật
- không fake verify code
- không bypass auth API

### 7. Notion MCP

Dùng để:

- đọc task source of truth
- cập nhật `Trạng thái`
- cập nhật `Sản phẩm bàn giao`
- ghi `Execution Notes`

Notion MCP không tham gia vào E2E app, nhưng giúp vòng triển khai khép kín:

- làm xong
- có evidence
- sync lại task ngay

## Những thứ làm cho automation “trơn tru”

### 1. Mỗi session có một output dir riêng

Không ghi đè artifact cũ. Việc này cực kỳ quan trọng khi debug cloud.

### 2. Có request budget

`request-budget.json` giúp biết một run thất bại vì logic app hay vì script lặp quá nhiều request.

### 3. Có fixture manifest cố định

Regression không chạy theo ảnh ngẫu nhiên. Fixture contract giúp kết quả so sánh được giữa các lần chạy.

### 4. Có dedicated demo account riêng

Demo seed và regression không phá flow của disposable auth run.

### 5. Có phân vai rõ giữa Maestro và Appium

- Maestro: smoke nhanh, contract ổn định
- Appium: auth flow, onboarding, reopen, edge interaction

Nếu chỉ dùng một tool cho tất cả, lane sẽ chậm hơn hoặc flaky hơn.

### 6. Có fallback ở runner thay vì để test chết cứng

Ví dụ:

- retry token mailbox
- dismiss keyboard trước khi bấm next
- fallback theo accessibility label nếu testID khó bấm
- giới hạn logcat để không nổ `maxBuffer`

### 7. Có fallback ở app cho cloud degradation

Ví dụ onboarding hiện có fallback lưu body metrics khi `/api/profile` cloud lỗi.

Điều này không che bug backend, nhưng giúp E2E không bị chặn hoàn toàn trong khi vẫn log rõ blocker thật.

## Khuyến nghị cho vòng tiếp theo

### Mục tiêu kỹ thuật

- fix cloud voice `ADD_FOOD`
- bổ sung manual evidence cho `scan-to-save`
- chạy đủ 3 risk scenarios
- tạo thêm ít nhất 3 session metrics-backed để thử chạm gate rehearsal

### Mục tiêu quy trình

- thực hiện UAT với user thật
- giữ nguyên artifact contract hiện tại
- tiếp tục update Notion ngay sau mỗi run có ý nghĩa

## Kết luận

Sau 5 task đầu, bundle đã đạt được điều quan trọng nhất:

- lane cloud thật đã chạy được end-to-end trên emulator
- mỗi lần chạy đều có evidence traceable
- task management trên Notion phản ánh đúng trạng thái thật

Bundle này chưa đủ để gọi là “ready for final demo rehearsal”, nhưng đã đủ để chuyển từ giai đoạn “làm theo cảm giác” sang giai đoạn “điều hành bằng evidence”.
