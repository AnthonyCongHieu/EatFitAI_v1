# EatFitAI Production Control Plane Admin Checklist - 2026-05-13

## Mục tiêu

Tài liệu này mô tả hướng xây dựng admin production chuẩn doanh nghiệp cho EatFitAI sau khi runtime chính đã chuyển sang AWS Lightsail. Phạm vi hiện tại là nghiên cứu, định hướng và checklist triển khai nhiều phase. Chưa sửa code, chưa thay cấu hình production, chưa gọi credential thật.

Admin production không nên là màn hình keep-alive hoặc realtime polling liên tục. Admin nên là control plane đọc nhiều, ghi có kiểm soát, có bằng chứng trạng thái, có TTL dữ liệu, có audit trail và có guardrail chi phí/quota.

## Hiện trạng production từ repo

Nguồn nội bộ đã rà:

- `infra/lightsail/README.md`
- `docs/54_LIGHTSAIL_DUCKDNS_CUTOVER_RUNBOOK_2026-05-12.md`
- `eatfitai-backend/appsettings.Production.json`
- `eatfitai-mobile/eas.json`
- `render.yaml`
- `EatFitAI_Admin/src/app/api/keep-alive/route.ts`
- `EatFitAI_Admin/src/app/api/proxy/[...path]/route.ts`
- `EatFitAI_Admin/src/app/api/admin-runtime/snapshot/route.ts`

Production shape đang được tài liệu hóa:

- Backend chính: AWS Lightsail Singapore, public URL `https://eatfitai-api.duckdns.org`.
- AI provider chính: AWS Lightsail private endpoint `http://172.26.11.92:5050`, backend gọi qua private networking.
- AI provider public URL `https://eatfitai-ai.duckdns.org` chỉ nên dùng smoke tạm thời, không phải đường vận hành lâu dài.
- Render: cold backup/suspended, không phải runtime production chính.
- Mobile production/preview trỏ API về `https://eatfitai-api.duckdns.org`.
- Media production dùng Cloudflare R2 public base URL.
- Backend production dùng Supabase, R2, Brevo, Google OAuth/Gemini, Open Food Facts và Expo push.

## Nguồn chính sách/quota đã đối chiếu

- AWS Lightsail metrics/alarms: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-resource-health-metrics.html
- AWS Lightsail billing: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html
- Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 limits: https://developers.cloudflare.com/r2/platform/limits/
- Gemini API rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Brevo API rate limits: https://developers.brevo.com/docs/api-limits
- Expo Push sending guidance: https://docs.expo.dev/push-notifications/sending-notifications/
- FCM throttling and quotas: https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas
- Open Food Facts API guidance: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Vercel Observability usage/pricing: https://vercel.com/docs/pricing/observability

Ý nghĩa vận hành:

- Lightsail đã có metrics/alarms theo chu kỳ, không cần admin tự ping dày để thay thế monitoring.
- Lightsail instance vẫn có thể phát sinh phí khi stopped; muốn ngừng tính phí phải xóa tài nguyên không dùng, không chỉ stop.
- Supabase Auth có rate limits, nên admin không được spam login/auth probes.
- R2 tính phí theo storage và Class A/B operations; admin không nên list bucket hoặc probe object liên tục.
- Gemini rate limits phụ thuộc usage tier; admin chỉ nên hiển thị quota snapshot/cache từ backend, không gọi probe model liên tục.
- Brevo trả 429 khi vượt limit; admin campaign/email cần queue, backoff và hiển thị rate-limit headers khi có.
- Expo Push khuyến nghị giới hạn concurrent connections và rate-limit server-side; admin không gửi campaign không kiểm soát.
- FCM có quota/throttling; notification dashboard cần theo batch và retry/backoff.
- Open Food Facts yêu cầu custom User-Agent và có rate limits; barcode lookup không nên bị admin bulk-probe.
- Vercel Observability/Monitoring tính theo events/request; admin không nên tạo request nền quá nhiều.

## Mô hình admin chuẩn doanh nghiệp

### Nguyên tắc

- Production-only by default: admin production không tự động gọi dev/Render/preview trừ khi bật chế độ rollback có chủ đích.
- Read model tập trung: frontend gọi backend admin API; browser không gọi trực tiếp Supabase, R2, Brevo, Gemini hoặc provider bên thứ ba.
- Snapshot có TTL: mỗi khối dữ liệu ghi rõ `checkedAt`, `freshUntil`, `source`, `confidence`, `staleReason`.
- Manual refresh trước realtime: mặc định dùng cache 60 giây, 5 phút hoặc 1 giờ tùy loại dữ liệu; realtime chỉ bật trong incident mode.
- Mutations có guardrail: thao tác ghi phải có quyền, xác nhận, lý do, idempotency key, audit log và rollback note.
- Không fake trạng thái: trạng thái không có bằng chứng phải hiển thị `unknown` hoặc `not_configured`, không tự suy diễn thành healthy.
- Cost-aware: mọi integration tốn quota/tiền phải có TTL, backoff, rate-limit và nút refresh thủ công.

### Information architecture đề xuất

1. Overview
   - Service status rollup.
   - Incident banner.
   - Last verified release.
   - Quota/cost warnings.
   - Pending operator actions.

2. Infrastructure
   - Lightsail backend.
   - Lightsail AI provider.
   - DuckDNS/Caddy/TLS.
   - Render cold backup state.
   - Vercel admin hosting.

3. Runtime
   - Backend readiness.
   - AI provider readiness.
   - Gemini pool snapshot.
   - YOLO/model version.
   - Queue/concurrency/rate-limit status.

4. Data & Storage
   - Supabase DB/Auth status.
   - R2 media status.
   - Media URL leak checks.
   - Backup/export freshness.

5. Users & Business
   - Users/accounts.
   - Subscriptions/billing if later added.
   - Food diary/scan metrics.
   - Support/account recovery.

6. Messaging
   - Brevo transactional email.
   - Expo/FCM push.
   - Campaign queue.
   - Delivery errors.

7. Audit & Security
   - Admin login/session events.
   - Privileged mutations.
   - Secret rotation checklist.
   - Capability/RBAC matrix.

8. Release & QA
   - Current mobile build channel.
   - Backend release SHA.
   - Smoke evidence.
   - Rollback plan.

## Phần nên bỏ/ẩn khỏi production admin

- [ ] Bỏ keep-alive route/UI khỏi production admin. Lý do: đã chuyển sang Lightsail, Render là cold backup; ping/wake liên tục làm nhiễu trạng thái và tăng request/quota.
- [ ] Ẩn nút “Đánh thức dev servers” ở login. Lý do: không phù hợp production operations.
- [ ] Bỏ fallback mặc định về `eatfitai-backend.onrender.com` trong production proxy/runtime snapshot. Lý do: production phải fail closed nếu thiếu API URL, không tự quay về Render.
- [ ] Ẩn nhãn “Render Backend/AI Provider” khỏi health production. Lý do: sai runtime chính sau cutover.
- [ ] Tắt SSE/realtime runtime mặc định. Lý do: tăng kết nối/request khi chưa cần; chỉ bật incident mode có TTL.
- [ ] Ẩn local round-robin preview khỏi production nav nếu không có API contract thật. Lý do: dễ gây hiểu nhầm đây là điều phối quota đang vận hành.
- [ ] Ẩn coming-soon modules khỏi nav chính; chuyển vào roadmap/internal. Lý do: admin business chuẩn ưu tiên chức năng đang vận hành thật.
- [ ] Đóng public AI provider smoke URL sau khi QA xong. Lý do: provider nên chỉ nhận traffic nội bộ backend.
- [ ] Không dùng direct browser probes tới Supabase/R2/Brevo/Gemini. Lý do: leak risk, quota risk, thiếu audit.

## Checklist nhiều phase

### Phase 0 - Freeze và xác nhận phạm vi

- [ ] Không deploy, không sửa code, không gọi credential production trong giai đoạn khảo sát.
- [ ] Chốt admin production chỉ quản lý runtime Lightsail + dịch vụ thật đang dùng.
- [ ] Ghi nhận Render là cold backup/suspended, không phải health target mặc định.
- [ ] Lập danh sách endpoint production được phép dùng.
- [ ] Lập danh sách endpoint legacy cần loại bỏ khỏi admin.
- [ ] Chốt quy tắc “không realtime nếu không có incident”.

### Phase 1 - Service inventory

- [ ] Backend Lightsail: instance, public URL, private IP, systemd unit, health endpoints.
- [ ] AI provider Lightsail: private URL, model version, provider token, firewall source.
- [ ] Supabase: Postgres, Auth, service role usage, storage legacy usage còn lại.
- [ ] Cloudflare R2: bucket, public base URL, custom domain/caching plan.
- [ ] Brevo: transactional email sender, allowlist, rate-limit behavior.
- [ ] Gemini: key pool, model, RPM/TPM/RPD, cooldown state source.
- [ ] Expo/FCM/APNs: push token registration, campaign queue, receipt handling.
- [ ] Vercel: admin deployment, env vars, observability/log usage.
- [ ] DuckDNS/Caddy: DNS target, TLS renewal path.
- [ ] Open Food Facts: barcode template, User-Agent, rate-limit handling.

### Phase 2 - Admin service registry

- [ ] Thiết kế registry backend-side cho từng service: `serviceId`, `owner`, `environment`, `provider`, `criticality`.
- [ ] Thêm trạng thái chuẩn: `healthy`, `degraded`, `down`, `unknown`, `not_configured`, `legacy`.
- [ ] Thêm TTL mặc định theo loại service.
- [ ] Thêm `lastCheckedAt`, `nextAllowedRefreshAt`, `evidence`.
- [ ] Không để frontend tự dựng danh sách service từ env public.

### Phase 3 - Snapshot API

- [ ] Thiết kế một endpoint tổng hợp kiểu `/api/admin/control-plane/snapshot`.
- [ ] Endpoint trả dữ liệu cache, không gọi tất cả nhà cung cấp mỗi request.
- [ ] Snapshot gồm infrastructure, runtime, data/storage, messaging, quota, release, audit summary.
- [ ] Có `stale` flag riêng từng khối.
- [ ] Có `manualRefreshToken` hoặc action riêng cho refresh có kiểm soát.
- [ ] Nếu provider lỗi, trả trạng thái degraded/unknown kèm evidence thay vì 500 toàn trang.

### Phase 4 - Keep-alive removal

- [ ] Xóa/ẩn `/api/keep-alive` khỏi production admin.
- [ ] Xóa nút wake dev servers khỏi login production.
- [ ] Xóa nhãn và logic Render wake trong System Health.
- [ ] Xóa direct Supabase health probe từ keep-alive.
- [ ] Thay bằng manual production health check qua backend admin API.
- [ ] Test regression login, proxy, system health, runtime snapshot.

### Phase 5 - No accidental Render fallback

- [ ] Proxy admin phải yêu cầu `API_BASE_URL` production rõ ràng.
- [ ] Runtime snapshot route không fallback về Render nếu thiếu env.
- [ ] Auth/session route không fallback về Render.
- [ ] Render targets chỉ xuất hiện trong Cold Backup panel.
- [ ] Mọi cold backup action phải cần confirmation và audit reason.

### Phase 6 - Quota/cost controls

- [ ] Gemini quota dùng snapshot từ backend/provider state, không gọi model để probe.
- [ ] R2 dashboard chỉ đọc aggregate từ backend, không list object mỗi page load.
- [ ] Supabase Auth không bị ping định kỳ từ admin.
- [ ] Brevo campaign gửi theo batch, backoff khi 429.
- [ ] Expo Push giới hạn batch/concurrency và lưu receipt/error.
- [ ] Open Food Facts lookup có cache và User-Agent chuẩn.
- [ ] Vercel admin tránh background polling dày để giảm request/observability events.

### Phase 7 - Observability nhẹ

- [ ] Lightsail: dùng metrics/alarms chính thức cho CPU/network/status.
- [ ] Backend: health live/ready và summary metrics nhẹ.
- [ ] AI provider: healthz/model/gemini state cache.
- [ ] DB: readiness query timeout ngắn, không chạy query nặng.
- [ ] Media: sampled URL policy, không crawl toàn bucket.
- [ ] Notifications: delivery summary theo batch.
- [ ] Incident timeline lưu ở DB hoặc audit table, không dựa vào console log.

### Phase 8 - RBAC và audit

- [ ] Định nghĩa capability theo business action, không theo route thô.
- [ ] Read-only role cho viewer/support.
- [ ] Operator role cho refresh/smoke nhẹ.
- [ ] Admin role cho config/mutation.
- [ ] Dangerous action cần re-auth hoặc confirm phrase.
- [ ] Audit log gồm actor, action, target, before/after summary, request id, reason.
- [ ] Không log secrets, token, password, API key.

### Phase 9 - Mutation safety

- [ ] Mọi mutation có loading/error/success state.
- [ ] Mọi mutation có backend contract thật.
- [ ] Không cho thao tác destructive khi thiếu capability.
- [ ] Bulk action cần preview số bản ghi bị ảnh hưởng.
- [ ] Campaign/send action cần dry-run audience preview.
- [ ] Config change cần rollback note.
- [ ] Restart/redeploy/suspend service không nằm trong UI mặc định nếu chưa có runbook.

### Phase 10 - Business admin cleanup

- [ ] Giữ chức năng quản lý user, support, audit, settings, notifications, analytics nếu có API thật.
- [ ] Đưa module placeholder sang roadmap.
- [ ] Đưa dev tooling sang trang internal/dev hoặc xóa khỏi production.
- [ ] Đánh dấu AI Review read-only nếu chưa có approve/reject API thật.
- [ ] Food Database chỉ cho mutation khi backend contract rõ.
- [ ] Tokens/API Keys chỉ hiển thị trạng thái/alias; không lộ secret.

### Phase 11 - Release evidence

- [ ] Mỗi release có backend SHA.
- [ ] Mỗi mobile build có EAS channel/version/build number.
- [ ] Smoke evidence gồm URL, timestamp, status code, screenshot/log link nếu có.
- [ ] Smoke tối thiểu: login, profile, R2 upload, scan, diary save/readback.
- [ ] Abuse smoke: auth spam/AI spam nhận 429, upload quá size bị reject.
- [ ] Rollback checklist được gắn cạnh release.

### Phase 12 - UI production console

- [ ] Header gọn: title, environment badge, last refreshed, manual refresh.
- [ ] Cards chỉ dùng cho KPI thật, không dùng card trang trí.
- [ ] Table/list là trọng tâm.
- [ ] Detail drawer cho service evidence.
- [ ] Empty/error/loading state rõ.
- [ ] Không dùng text lớn/gradient nặng cho ops console.
- [ ] Responsive mobile: overview đọc được, bảng chuyển sang list.

### Phase 13 - Verification

- [ ] Static: lint/typecheck/test/build.
- [ ] Browser QA: login admin, từng route không blank, không overlay.
- [ ] Console không có app error liên quan.
- [ ] Network không gọi keep-alive/Render ngoài Cold Backup panel.
- [ ] Manual refresh chỉ gọi snapshot/refresh endpoint được phép.
- [ ] Responsive QA desktop + mobile.
- [ ] Evidence report pass/fail từng route.

### Phase 14 - Runbook vận hành

- [ ] Viết runbook “Production Health Check”.
- [ ] Viết runbook “Incident Mode”.
- [ ] Viết runbook “Release/Rollback”.
- [ ] Viết runbook “Secret Rotation”.
- [ ] Viết runbook “Quota Spike”.
- [ ] Viết runbook “Notification Campaign Failure”.
- [ ] Viết runbook “AI Provider Degraded”.

### Phase 15 - Governance

- [ ] Review danh sách chức năng thừa với owner trước khi xóa.
- [ ] Mỗi removal có bằng chứng file/UI/API.
- [ ] Không xóa chức năng business đang dùng nếu chưa có replacement.
- [ ] Mỗi phase có PR riêng hoặc commit nhỏ.
- [ ] Sau mỗi phase chạy QA evidence.

## Quyết định đề xuất

Đề xuất chọn hướng A:

- Admin production là control plane read-mostly.
- Backend là nguồn sự thật cho snapshot.
- Không realtime mặc định.
- Bỏ keep-alive khỏi production.
- Render chỉ là cold backup panel, mặc định collapsed/hidden.
- Mọi dịch vụ tốn quota dùng cache, TTL và manual refresh.

Không đề xuất:

- Không dùng admin browser gọi thẳng API của nhà cung cấp.
- Không làm dashboard realtime liên tục.
- Không wake Render trong production.
- Không tự động probe Gemini/Brevo/R2/Supabase trên mỗi page load.
- Không xóa chức năng business trước khi có duyệt.

