# Voice và Gemini Live Research - 2026-05-22

Tài liệu này gom lại toàn bộ nghiên cứu và đánh giá kỹ thuật đã thực hiện cho hướng Voice của EatFitAI: từ logic voice hiện tại, phương án hỏi đáp đơn giản, TTS, Gemini Live API, APK production, đến khả năng triển khai trên hạ tầng Lightsail hiện có.

## 1. Kết luận điều hành

EatFitAI có thể triển khai trải nghiệm voice dạng hỏi đáp giống ChatGPT Voice, nhưng nên triển khai theo hướng an toàn theo từng tầng:

1. Sửa các lỗi voice hiện tại trước, đặc biệt encoding tiếng Việt, state race, quick command guard, stale reset.
2. Nếu cần nhanh và ít rủi ro: làm voice hỏi đáp theo lượt: record -> transcribe -> parse -> review -> app/backend hỏi lại -> user xác nhận -> commit.
3. Nếu muốn làm thẳng Live Voice: APK nên kết nối trực tiếp Gemini Live bằng ephemeral token do backend cấp.
4. Không nên để Lightsail backend $7 làm proxy truyền audio realtime cho production.
5. Gemini Live chỉ nên tạo draft/hỏi lại; việc ghi database phải đi qua backend và cần user confirm.

Kiến trúc khuyến nghị:

```text
APK production
  -> Backend Lightsail: login, quota, feature flag, xin ephemeral token
  -> Gemini Live API: stream audio realtime
  -> Backend Lightsail: review/commit món khi user xác nhận
  -> Supabase/Postgres: lưu dữ liệu
```

Không khuyến nghị:

```text
APK -> Lightsail backend WebSocket proxy -> Gemini Live -> Lightsail backend -> APK
```

Lý do: cách proxy audio qua backend làm server gánh stream hai chiều, tăng latency, tăng băng thông, khó scale trên instance 1 GB RAM.

## 2. Hiện trạng voice trong repo

Các phần voice chính:

- Mobile screen: `eatfitai-mobile/src/app/screens/VoiceScreen.tsx`
- Mobile store: `eatfitai-mobile/src/store/useVoiceStore.ts`
- Recording hook: `eatfitai-mobile/src/hooks/useVoiceRecognition.ts`
- Mobile API service: `eatfitai-mobile/src/services/voiceService.ts`
- Review UI: `eatfitai-mobile/src/components/voice/VoiceResultCard.tsx`
- Backend controller: `eatfitai-backend/Controllers/VoiceController.cs`
- Backend parser/rule NLU: `eatfitai-backend/Services/VoiceProcessingService.cs`

Flow hiện tại:

```text
User bấm mic
  -> expo-av record file
  -> upload media object
  -> /api/voice/transcribe
  -> /api/voice/parse
  -> /api/voice/review hoặc /api/voice/execute
  -> /api/voice/commit nếu là draft cần xác nhận
```

Điểm mạnh hiện có:

- Đã có auth và quota cho AI/voice.
- Đã có review draft trước khi lưu món.
- Đã có commit endpoint cho meal diary.
- Đã có smoke/test infrastructure cho mobile/backend/real device.
- Mobile production config đã trỏ về Lightsail backend.
- Backend có Gemini key pool/quota management qua AI provider.

Điểm yếu đã phát hiện:

1. Một số chuỗi tiếng Việt bị mojibake trong voice UI/service/backend. Đây là rủi ro UX và parsing, cần sửa bằng nội dung UTF-8 đúng thay vì giữ các chuỗi đã biến dạng.
2. UI nói người dùng có thể nhập bàn phím khi voice bị chặn, nhưng text submit vẫn bị disable theo guard AI availability.
3. Quick commands thiếu guard đầy đủ khi AI bị block hoặc đang busy.
4. `useVoiceRecognition.stopRecording` có nhánh lỗi chỉ set local hook error, store có thể không nhận error đúng.
5. `useVoiceStore.processText` có sequence guard nhưng một số nhánh execute tức thì chưa check stale request sau await.
6. Success `setTimeout(reset, 2000)` có thể reset nhầm lệnh mới nếu user thao tác nhanh.
7. `voiceService.executeCommand` default `mealType` về Lunch khi thiếu/không rõ, dễ làm sai dữ liệu.

Voice test đã từng chạy pass với các suite liên quan:

```text
npm test -- --runInBand voiceStore.test.ts voiceService.test.ts VoiceResultCard.test.tsx voiceCommandReview.test.ts
```

## 3. Phương án voice hỏi đáp đơn giản

Mục tiêu của hướng này là làm cho user nói tự nhiên để thêm món nhanh, nhưng vẫn giữ kiểm soát:

```text
User: "Thêm một tô phở bò sáng nay"
App: "Mình lưu phở bò vào bữa sáng, khoảng bao nhiêu gram?"
User: "500 gram"
App: "Lưu phở bò 500g vào bữa sáng nhé?"
User: "Đúng"
App: commit meal diary
```

Có thể triển khai với API hiện tại bằng cách thêm state hội thoại ở mobile:

- `pendingDraft`
- `pendingQuestion`
- `conversationMode`
- parser cho câu trả lời ngắn: "đúng", "lưu đi", "hủy", "500 gram", "bữa tối"

Nếu muốn chắc hơn, thêm endpoint backend:

```text
POST /api/voice/clarify
```

Endpoint này nhận draft cũ + câu trả lời mới, rồi merge slot còn thiếu. Hướng này đơn giản, dễ test, ít tốn chi phí và tận dụng được `/review` + `/commit` hiện có.

## 4. App trả lời bằng giọng nói

Có hai cách:

### 4.1. On-device TTS

App sinh text trả lời rồi đọc bằng TTS trên máy. Ưu điểm là rẻ, dễ làm, latency thấp. Nhược điểm là giọng thường ít tự nhiên hơn.

Repo hiện có `expo-av` nhưng chưa có `expo-speech`. Nếu dùng Expo SDK managed/native build, có thể cân nhắc thêm TTS package, nhưng cần test trên APK thật.

### 4.2. Gemini TTS

Google có Speech Generation/TTS riêng, ví dụ model dạng `gemini-2.5-flash-preview-tts`.

Flow:

```text
Backend/app tạo câu trả lời text
  -> gọi Gemini TTS
  -> nhận audio
  -> app phát audio bằng audio player
```

Ưu điểm là giọng tự nhiên hơn. Nhược điểm là thêm API, cost, quota, xử lý audio response và caching.

TTS khác với Live API: TTS là request/response tạo audio; Live API là hội thoại realtime hai chiều.

## 5. Gemini Live API hỗ trợ gì

Google Live API là API realtime qua WebSocket cho audio/video/text. Theo tài liệu chính thức, Live API hỗ trợ:

- streaming audio realtime
- audio output từ model
- voice activity detection
- function calling/tool use
- session management
- ephemeral token cho client trực tiếp

Thông tin kỹ thuật quan trọng:

- Input audio khuyến nghị: PCM 16-bit, 16 kHz, mono.
- Output audio: raw PCM 24 kHz.
- Kết nối realtime qua WebSocket/session.
- Nên dùng ephemeral token khi mobile/web client kết nối trực tiếp.
- Model native audio hiện dùng trong docs/pricing: `gemini-2.5-flash-native-audio-preview-12-2025`.

Nguồn chính:

- [Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
- [Live API capabilities](https://ai.google.dev/gemini-api/docs/live-guide)
- [Ephemeral tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- [Speech generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

## 6. Gemini free key có làm được không

Có thể dùng free key để POC, nhưng không nên xem là production-ready.

Lý do:

- Free tier có quota thấp hơn paid tier.
- Preview/Live/native-audio có rate limit chặt hơn.
- Tài liệu pricing ghi free tier có thể dùng dữ liệu để cải thiện sản phẩm, còn paid tier thì không theo bảng pricing hiện tại.
- Voice realtime tiêu tốn nhiều token/băng thông hơn text.
- Một app nutrition/health có dữ liệu nhạy cảm tương đối; production nên cân nhắc paid tier, privacy policy và consent rõ.

Trong repo hiện tại, AI provider có Gemini key pool và quota tracking, nhưng Live API ephemeral token là use case mới, chưa có endpoint riêng.

## 7. Kinh nghiệm cộng đồng khi triển khai Live API

Các ví dụ chính thức và cộng đồng cho thấy Live API làm được, nhưng mobile realtime audio là phần khó nhất.

Nguồn tham khảo:

- [google-gemini/gemini-live-api-examples](https://github.com/google-gemini/gemini-live-api-examples)
- [google-gemini/live-api-web-console](https://github.com/google-gemini/live-api-web-console)
- [React Native Expo bidirectional audio issue/sample](https://github.com/google-gemini/cookbook/issues/766)
- [Expo React Native 24 kHz PCM playback discussion](https://discuss.ai.google.dev/t/best-practices-for-playing-gemini-live-apis-24khz-pcm-audio-stream-in-expo-react-native/95569)
- [Pipecat Gemini Live docs](https://docs.pipecat.ai/api-reference/server/services/s2s/gemini-live)
- [LiveKit Gemini Live plugin](https://docs.livekit.io/agents/integrations/realtime/gemini)

Bài học rút ra:

1. Web/server examples trưởng thành hơn mobile examples.
2. React Native/Expo gặp khó ở phát raw PCM 24 kHz theo chunk realtime.
3. Các audio library kiểu file playback không đủ tốt cho gapless realtime PCM.
4. Muốn mượt thường cần native audio module hoặc dev client, không thể trông chờ Expo Go.
5. Cần xử lý echo cancellation, speaker routing, mute/barge-in, reconnect và session timeout.
6. Static noise thường đến từ decode sai base64/PCM hoặc sample rate không khớp.
7. Latency có thể không ổn định, nhất là khi route qua backend proxy.

## 8. APK production và phụ thuộc Expo

Repo đã có Android native project và build release bằng Gradle:

- `eatfitai-mobile/android/`
- `eatfitai-mobile/scripts/build-android-preview.ps1`
- `eatfitai-mobile/eas.json`

Điều này nghĩa là APK production không phụ thuộc Expo Go.

Tuy nhiên app vẫn đang có `expo-updates` trong `app.json`:

```text
updates.url = https://u.expo.dev/...
```

Nếu mục tiêu là không phụ thuộc Expo cloud hoàn toàn, cần một trong hai lựa chọn:

1. Tắt OTA update trong production native build.
2. Self-host EAS Update/Expo Updates hoặc thay bằng release APK/AAB truyền thống.

Live Voice không nhất thiết phụ thuộc Expo cloud. Nhưng nếu thêm native audio module, cần build APK/AAB native, không test bằng Expo Go.

## 9. Hạ tầng Lightsail hiện tại

Theo `infra/lightsail/README.md`, production shape hiện tại:

```text
Backend Lightsail: https://eatfitai-api.duckdns.org
AI provider Lightsail: private http://172.26.11.92:5050
Database: Supabase/Postgres
Media: Cloudflare R2
Reverse proxy: Caddy
Process manager: systemd
Render: backup/suspended/bridge, không phải runtime chính
```

Health check công khai đã kiểm tra ngày 2026-05-22:

- `https://eatfitai-api.duckdns.org/health/live`: 200
- `https://eatfitai-api.duckdns.org/health/ready`: 200
- `https://eatfitai-api.duckdns.org/api/mobile/config`: 200, `voice=true`
- `https://eatfitai-ai.duckdns.org/healthz`: 200

Điểm mạnh:

- Backend public HTTPS đang sống.
- Postgres health đang ok.
- Mobile config/feature flag đã có.
- AI provider/Gemini pool đang configured.
- Caddy hỗ trợ WebSocket reverse proxy theo docs, nếu cần.
- Backend đã có rate limiting, auth, quota, storage, review/commit.

Điểm yếu/rủi ro:

- Lightsail $7 1 GB RAM không phù hợp để proxy nhiều audio streams realtime.
- Public AI health hiện có thể lộ nhiều runtime/quota detail; nên chỉ để tạm cho smoke hoặc bảo vệ/redact.
- Audit trước đó từng ghi nhận user/API smoke có lỗi schema/master-data drift. Cần rerun smoke trước khi nối Live vào lưu dữ liệu thật.
- Backend readiness hiện chỉ chứng minh startup + Postgres, không chứng minh toàn bộ AI/R2/Brevo/Gemini/user-data flows.

## 10. Các cách triển khai Live Voice

### Cách A: APK kết nối Gemini Live trực tiếp bằng ephemeral token

Flow:

```text
APK
  -> POST /api/voice/live-token
Backend
  -> check JWT, quota, feature flag
  -> xin ephemeral token từ Gemini
  -> trả token ngắn hạn cho APK
APK
  -> WebSocket Gemini Live
  -> stream mic PCM
  -> phát audio Gemini
  -> gọi backend review/commit khi user xác nhận
```

Ưu điểm:

- Latency thấp hơn.
- Backend không phải gánh audio stream.
- Hợp khuyến nghị ephemeral token của Google.
- Phù hợp Lightsail hiện tại.

Nhược điểm:

- Mobile phải xử lý audio realtime khó hơn.
- Token/session/reconnect phải làm cẩn thận.
- Tool calling phải được thiết kế để model không ghi DB trực tiếp.

Đây là hướng khuyến nghị.

### Cách B: Backend WebSocket proxy tới Gemini Live

Flow:

```text
APK -> Backend WebSocket -> Gemini Live
Gemini Live -> Backend WebSocket -> APK
```

Ưu điểm:

- API key không bao giờ ra khỏi backend.
- Backend kiểm soát tool call tốt hơn.
- Dễ log/observe tập trung hơn.

Nhược điểm:

- Backend phải gánh audio realtime hai chiều.
- Tăng latency.
- Tốn băng thông và memory trên Lightsail.
- Cần viết WebSocket streaming layer mới trong ASP.NET hoặc thêm service riêng.

Không khuyến nghị cho production Lightsail $7 hiện tại.

### Cách C: Turn-based voice + TTS trước, Live sau

Flow:

```text
Record audio file
  -> transcribe
  -> parse/review
  -> app/backend hỏi lại bằng text/TTS
  -> user record câu trả lời
  -> confirm/commit
```

Ưu điểm:

- Ít rủi ro nhất.
- Tận dụng gần như toàn bộ hạ tầng hiện có.
- Dễ test với unit/integration/device smoke.
- Không cần native PCM streaming.

Nhược điểm:

- Không giống ChatGPT Voice thật.
- Không có barge-in realtime.
- Latency theo lượt cao hơn.

Đây là hướng tốt nếu ưu tiên release nhanh.

## 11. Tool calling và an toàn dữ liệu

Với EatFitAI, Gemini không nên có tool "save meal" trực tiếp. Nên chia tool thành các bước an toàn:

```text
searchFoodCandidates(query)
createVoiceDraft(food, grams, mealType, date)
updateVoiceDraft(slot, value)
summarizeDailyNutrition()
requestCommitConfirmation()
```

Commit thật chỉ xảy ra khi:

1. User xác nhận rõ ràng bằng voice hoặc nút UI.
2. App/backend đã có draft hợp lệ.
3. Backend gọi endpoint commit hiện có.

Không để model tự quyết định ghi DB vì nguy cơ:

- nghe nhầm món
- sai khẩu phần
- sai bữa/ngày
- user nói đùa hoặc đang hỏi thử
- tool call bị lặp khi reconnect/session retry

## 12. Database và frontend

Database:

- Nên giữ Supabase/Postgres hiện tại.
- Không cần chuyển database về Lightsail chỉ để làm Live Voice.
- Cần đảm bảo schema/master-data sạch trước khi bật commit voice production.
- Nên log source method rõ: `voice_live`, `voice_turn_based`, `voice_confirmed`.

Frontend/mobile:

- APK native có thể triển khai Live.
- Cần native audio pipeline nếu muốn Live mượt.
- Cần UI trạng thái rõ: connecting, listening, thinking, speaking, review, saving, error.
- Cần fallback sang text/turn-based khi Live lỗi.

Download/static frontend:

- Không ảnh hưởng trực tiếp đến Live Voice.
- Nếu trang download APK self-host, chỉ cần đảm bảo APK trỏ đúng `https://eatfitai-api.duckdns.org`.

Admin/frontend ngoài repo:

- Nếu có admin dashboard, nên thêm metrics/quota/feature flag cho Live Voice sau.

## 13. Roadmap đề xuất

### Phase 0: ổn định voice hiện tại

- Sửa mojibake tiếng Việt trong voice UI/service/backend.
- Fix quick command guard.
- Fix stale async request và delayed reset.
- Fix default meal type không rõ ràng.
- Rerun voice tests và smoke voice text.

### Phase 1: Live token backend

- Thêm config Gemini Live model.
- Thêm endpoint `POST /api/voice/live-token`.
- Endpoint check JWT, quota, mobile config feature flag.
- Token nên locked model/config nếu dùng client direct.
- Log usage event riêng cho `voice_live_session_start`.

### Phase 2: Android Live POC

- APK Android-only trước.
- Kết nối Gemini Live bằng ephemeral token.
- Mic PCM 16 kHz mono.
- Playback PCM 24 kHz.
- Không nối database.
- Đo latency, audio glitch, reconnect, app background/foreground.

### Phase 3: Voice draft tools

- Tool chỉ tạo/cập nhật draft.
- UI hiển thị draft.
- User confirm bằng voice hoặc nút.
- Commit qua backend hiện có.

### Phase 4: Production hardening

- Quota/budget guard.
- Consent/privacy copy.
- Error fallback sang turn-based/text.
- Observability: latency, session duration, reconnect count, failed tool calls.
- Real-device QA trên APK release.

## 14. Validation cần chạy trước release

Local/code:

```powershell
python scripts\cloud\check_mojibake.py
dotnet test .\eatfitai-backend\EatFitAI.API.Tests.csproj
npm --prefix .\eatfitai-mobile run typecheck
npm --prefix .\eatfitai-mobile run lint
npm --prefix .\eatfitai-mobile test
python -m pytest .\ai-provider\tests
```

Cloud:

```powershell
npm --prefix .\eatfitai-mobile run smoke:preflight
npm --prefix .\eatfitai-mobile run smoke:auth:api
npm --prefix .\eatfitai-mobile run smoke:user:api
npm --prefix .\eatfitai-mobile run smoke:ai:api
```

Device:

```powershell
npm --prefix .\eatfitai-mobile run device:voice-text-readback:android
npm --prefix .\eatfitai-mobile run device:backend-frontend-live-check:android
npm --prefix .\eatfitai-mobile run device:rc-proof:android
```

Live-specific:

- Session starts with ephemeral token.
- No long-lived Gemini API key in APK.
- Audio input/output works on Android APK release.
- Reconnect does not duplicate commit.
- Model cannot write DB without user confirmation.
- If Gemini quota exhausted, app falls back gracefully.
- If Live unavailable, old voice text flow still works.

## 15. Quyết định hiện tại

Nếu mục tiêu là làm voice hỏi đáp tự nhiên cho public APK:

1. Không dùng Expo Go.
2. Build APK/AAB native.
3. Không route audio realtime qua backend Lightsail.
4. Backend chỉ cấp token, quản lý quota, review/commit.
5. APK kết nối Gemini Live trực tiếp bằng ephemeral token.
6. Giữ flow xác nhận trước khi lưu món.
7. Làm Android POC trước, iOS sau.

Tóm lại: hạ tầng hiện tại đủ để bắt đầu Live Voice theo hướng client-direct. Điểm phải đầu tư thêm không nằm ở database hay Lightsail, mà nằm ở native audio realtime trong APK và guard an toàn khi model chuyển từ hội thoại sang hành động lưu dữ liệu.
