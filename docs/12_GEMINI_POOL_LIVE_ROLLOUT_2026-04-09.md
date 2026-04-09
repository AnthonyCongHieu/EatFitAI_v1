# Gemini Pool Live Rollout

Cập nhật: `2026-04-09`

Tài liệu này ghi lại lần rollout live cho `ai-provider` khi chuyển từ `1 Gemini key` sang `Gemini key pool` trên Render production.

## Mục tiêu

- đổi model mặc định sang `gemini-2.5-flash`
- bật `GEMINI_KEY_POOL_JSON` trên cloud
- chỉ coi `project` khác nhau là nguồn quota độc lập
- xác nhận bằng `/healthz` rằng runtime live đang dùng model và pool mới

## Thay đổi code đã deploy

Commit đã lên production:

- `fe774d0` `feat: add gemini key pool failover`

Các file chính:

- `ai-provider/gemini_pool.py`
- `ai-provider/nutrition_llm.py`
- `ai-provider/app.py`
- `ai-provider/tests/test_gemini_pool.py`
- `ai-provider/.env.example`
- `ai-provider/README.md`
- `render.yaml`

Nội dung thay đổi chính:

- model mặc định đổi sang `gemini-2.5-flash`
- thêm hỗ trợ `GEMINI_KEY_POOL_JSON`
- dedupe key theo `projectId`
- failover khi gặp `429`
- disable project entry khi gặp `401/403`
- trả trạng thái runtime Gemini qua `/healthz`

## Cấu hình live đã áp vào Render

Service:

- `eatfitai-ai-provider`

Biến chính:

- `GEMINI_MODEL=gemini-2.5-flash`
- `GEMINI_KEY_POOL_JSON=<json secret>`

Pool thực tế gồm `4` project độc lập:

1. `gemini-backup-3` -> `gen-lang-client-0687045123`
2. `gemini-backup-1` -> `gen-lang-client-0004409885`
3. `gemini-default` -> `gen-lang-client-0804899652`
4. `gemini-backup-2` -> `gen-lang-client-0219741631`

Lưu ý:

- các key đã xuất hiện trong chat và ảnh chụp màn hình, phải coi là `đã lộ`
- cần rotate toàn bộ key sau khi hoàn tất vòng test này

## Kết quả xác nhận live

`GET https://eatfitai-ai-provider.onrender.com/healthz`

Kết quả pass sau deploy env:

- `status = ok`
- `llm_provider = gemini`
- `gemini_model = gemini-2.5-flash`
- `gemini_configured = true`
- `gemini_pool_size = 4`
- `gemini_distinct_project_count = 4`
- `gemini_active_project = gemini-backup-3`

Điều này xác nhận:

- cloud đã chạy bản code mới
- cloud không còn ở mode `legacy-default`
- runtime đang dùng pool thật, không còn `1 key` đơn

## Test đã chạy

### Pass

- `GET /healthz`
- `POST /nutrition-advice`
  - route chạy ổn
  - response hiện trả `source = formula`
- `POST /voice/parse` với payload ASCII
  - route trả `200`
  - hiện rơi về `source = fallback`
- `POST /cooking-instructions` với payload ASCII
  - route trả `200`
  - hiện rơi về `source = fallback`

### Chưa chốt hoàn toàn

- `POST /voice/parse` với payload tiếng Việt trên cloud từng trả `500`
- `POST /cooking-instructions` với payload tiếng Việt trên cloud từng trả `500`

Tái hiện local với đúng pool hiện tại cho thấy nhánh Gemini vẫn có vấn đề ở tầng:

- parse JSON từ response Gemini
- xử lý text tiếng Việt / chuỗi bị lỗi encoding trong prompt cũ

Nghĩa là:

- `key pool` và `model selection` đã ổn
- `voice/cooking` chưa thể coi là production-ready cho tiếng Việt

## Trạng thái STT

`/voice/transcribe` vẫn đang tắt trên cloud:

- `ENABLE_STT=false`

Lý do:

- self-host Whisper quá nặng cho Render hiện tại
- chỉ `voice/parse` dùng Gemini text path

## Root cause đã xử lý

- trước rollout, live chỉ có `GEMINI_API_KEY`
- `/healthz` không chứng minh được model runtime
- chưa có failover khi chạm quota

Sau rollout:

- model runtime có thể xác nhận qua `/healthz`
- pool quota hoạt động theo `project` khác nhau
- service có khả năng failover khi quota ngắn hạn bị chạm

## Residual risk

1. `voice/parse` và `cooking-instructions` chưa ổn định với tiếng Việt thật.
2. Các prompt/chuỗi tiếng Việt trong `nutrition_llm.py` có dấu hiệu mojibake cũ.
3. Key đã lộ, bắt buộc rotate nếu tiếp tục dùng lâu dài.
4. Hiện mới xác nhận hạ tầng pool và route health; chưa chứng minh được nhánh Gemini JSON cho voice/cooking ổn định trên production.

## Bước tiếp theo khuyến nghị

1. Sửa prompt/response parsing cho `voice/parse` và `cooking-instructions`.
2. Dọn text mojibake trong `ai-provider/nutrition_llm.py`.
3. Rerun live với payload tiếng Việt thật.
4. Rotate toàn bộ `4` Gemini key đã lộ.
