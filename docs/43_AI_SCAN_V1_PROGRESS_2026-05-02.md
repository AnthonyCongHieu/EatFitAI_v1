# Tiến độ AI Scan V1 - 2026-05-02

## Tóm tắt trạng thái

Tiến độ hiện tại so với kế hoạch: khoảng **80-85%**.

Phần code chính, test tự động, build APK và deploy Render đã hoàn tất. Phần còn thiếu quan trọng nhất là **QA end-to-end trên APK thật sau deploy** bằng ảnh gà/bò trong thư viện máy.

## Nhánh và commit hiện tại

- Nhánh deploy: `hieu_deploy/production`
- Commit đã push: `e39b3ee feat(ai-scan): deploy vision scan v1 improvements`
- Trạng thái git sau push: sạch, đồng bộ với `origin/hieu_deploy/production`

## Đã hoàn thành

### 1. AI Vision Contract

- AI Provider đã trả thêm `bbox` cho detection.
- Backend đã parse và truyền tiếp `bbox` qua DTO vision.
- Mobile đã thêm optional `bbox` trong type AI scan.
- V1 dùng `bbox` như dữ liệu phụ trợ, không phụ thuộc `bbox` để lưu món.

### 2. Khẩu phần thông minh

- Không thêm cột mới vào `FoodItems`.
- Backend dùng bảng `FoodServing` hiện có.
- Backend trả thêm serving mặc định:
  - `defaultServingUnitId`
  - `defaultServingUnitName`
  - `defaultServingUnitSymbol`
  - `defaultPortionQuantity`
  - `defaultGrams`
- Rule mặc định:
  - ưu tiên serving không phải gram nếu có
  - fallback `100g` nếu không tìm được serving phù hợp
- Mobile đổi default từ `100g` cứng sang `defaultGrams`.
- Mobile có lựa chọn nhanh:
  - `Ít = 0.5x`
  - `Vừa = 1x`
  - `Nhiều = 1.5x`

### 3. Force Review có chọn lọc

Mobile đã có rule bắt review khi:

- ảnh có từ 2 món usable trở lên
- top confidence thấp
- top 1 và top 2 sát nhau
- có unmapped label
- item thiếu nutrition

Direct save chỉ phù hợp khi:

- chỉ có 1 món usable
- món có nutrition hợp lệ
- confidence đủ cao
- AI không phân vân giữa top 1 và top 2

### 4. Teach AI không re-run detection

- Đã bỏ luồng gọi lại AI scan sau khi user dạy AI.
- Khi user chọn món đúng, mobile cập nhật UI ngay theo hướng optimistic.
- API `/api/ai/labels/teach` chạy để lưu mapping.
- Nếu teach API lỗi, app báo lỗi thay vì gọi lại YOLO.

### 5. Bulk Save Meal Diary

- Backend đã thêm endpoint bulk cho meal diary.
- Backend lưu nhiều item bằng một lần xử lý, tránh loop POST từ mobile.
- Mobile:
  - 1 item: giữ endpoint cũ
  - nhiều item: gọi bulk
  - nếu bulk chưa sẵn sàng trong rollout: fallback loop cũ

### 6. Loading UX cho Gemini

- Không làm SSE ở V1.
- Mobile dùng trạng thái loading/progressive status text cho các luồng AI chờ lâu.
- Giữ hướng đi thực tế: đo latency trước, chỉ cân nhắc SSE sau.

### 7. Deploy và APK thật

- Code đã deploy lên Render dev services.
- Backend health ready trả `200`.
- AI Provider health trả `200`.
- APK thật đã build:
  - `eatfitai-mobile/android/app/build/outputs/apk/release/app-release.apk`
- APK thật đã được install lên thiết bị Android.
- APK build dùng `API_BASE_URL=https://eatfitai-backend-dev.onrender.com`.

## Đã verify bằng test tự động

- Backend:
  - `dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj --no-restore`
  - Kết quả: `224/224` tests pass
- Mobile:
  - `npm test -- --runTestsByPath src/utils/aiAvailability.test.ts src/utils/visionReview.test.ts src/services/mealService.test.ts src/services/__tests__/aiService.test.ts`
  - Kết quả: `16/16` tests pass
- Mobile typecheck:
  - `npm run typecheck`
  - Kết quả: pass
- ESLint các file mobile đã chạm:
  - pass
- AI Provider:
  - `python -m compileall ai-provider`
  - Kết quả: pass

## Chưa hoàn tất

### 1. QA end-to-end trên APK thật

Cần tiếp tục test trực tiếp trên APK thật, không dùng Expo:

1. Mở app đã cài trên thiết bị thật.
2. Vào AI Scan.
3. Chọn chế độ album/thư viện.
4. Scroll xuống ảnh gà/bò trong thư viện.
5. Chọn ảnh.
6. Xác nhận kết quả:
   - app không còn báo nhầm "AI tạm offline"
   - AI trả món nhận diện được
   - món có khẩu phần mặc định hợp lý
   - ảnh nhiều món bị đưa vào review
   - Teach AI không re-run detection
   - lưu nhiều món dùng bulk hoặc fallback ổn

### 2. Cloudflare R2 lifecycle

Kế hoạch yêu cầu cấu hình lifecycle ngoài code:

- Bucket: `eatfitai-media`
- Prefix: `vision/`
- Expire sau 24 giờ

Trạng thái hiện tại: **chưa xác nhận đã cấu hình xong**.

Điều kiện an toàn cần kiểm tra:

- `vision/` chỉ dùng cho ảnh scan tạm.
- Ảnh nhật ký cần lưu lâu dài phải dùng prefix khác, ví dụ `meal-photo/`.
- Chấp nhận rằng link ảnh scan/history cũ dưới `vision/` sẽ chết sau 24 giờ.

### 3. AI Provider pytest

- Chưa chạy được `python -m pytest ai-provider\tests`.
- Lý do: môi trường Python hiện tại thiếu `pytest`.
- Đã verify mức tối thiểu bằng `compileall`.

## Rủi ro còn lại

- Scan thật có thể vẫn chậm nếu Render cold start hoặc provider tải model chậm.
- Nếu ảnh trong thư viện quá lớn hoặc metadata xoay ảnh lạ, cần kiểm tra thêm portrait/landscape.
- Nếu mapping YOLO label sang database chưa đủ tốt, kết quả có thể nhận đúng object nhưng map sai món Việt.
- Nếu Cloudflare lifecycle chưa cấu hình, ảnh scan tạm vẫn có nguy cơ thành rác lưu trữ.
- MCP Render đã sửa config nhưng phiên Codex hiện tại có thể chưa reload env mới; direct Render API vẫn dùng được khi lấy key từ Windows User Env.

## Việc tiếp theo nên làm

Ưu tiên tiếp theo:

1. Hoàn tất QA APK thật với ảnh gà/bò trong thư viện.
2. Nếu scan còn lỗi, lấy logcat + Render logs để xác định lỗi nằm ở mobile, backend hay AI Provider.
3. Cấu hình và xác nhận R2 lifecycle cho `vision/`.
4. Cài `pytest` cho môi trường AI Provider nếu cần test sâu hơn.

