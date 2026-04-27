# Tình trạng lỗi Supabase Egress và chiến lược tối ưu production

Ngày lập: 2026-04-27

Tài liệu này ghi lại sự cố cached egress vừa gặp, kết quả kiểm tra hạ tầng hiện tại, nghiên cứu các lựa chọn storage/CDN, và chiến lược production để EatFitAI vừa tối ưu chi phí vừa tránh lặp lại tình trạng vượt quota.

## Tóm tắt quyết định

Sự cố vừa rồi không phải do database lớn, auth nhiều user, hay Supabase yếu. Vấn đề chính là media egress: app đang tải ảnh public từ Supabase Storage, trong đó nhiều file nằm dưới `food-images/thumbnails` có kích thước khoảng 4-5 MB dù được dùng như thumbnail. Với kích thước này, chỉ một lượng user hoặc smoke test nhỏ cũng có thể vượt quota cached egress 5 GB.

Hướng đúng là không chuyển toàn bộ app sang nền tảng khác ngay. Nên giữ kiến trúc Render + Supabase hiện tại, sửa pipeline ảnh triệt để, rồi thêm lớp `MediaStorageProvider` để sau này có thể chuyển riêng media sang Cloudflare R2 nếu usage tăng.

Quyết định đề xuất:

1. Sửa gốc vấn đề media trước: tạo ảnh `thumb` và `medium` đúng kích thước, backend bắt buộc resize ảnh upload, set cache header dài.
2. Giữ Supabase cho Postgres/Auth/metadata.
3. Giữ Firebase cho Crashlytics/Google mobile integration, không dùng Firebase Storage làm media store mặc định.
4. Chuẩn bị Cloudflare R2 làm đích offload media khi public traffic tăng.
5. Xem Render Free và Gemini free quota hiện tại là beta-only, không phải production bền vững.

## Tình trạng lỗi vừa gặp

Số liệu từ Supabase dashboard:

| Hạng mục | Số liệu ghi nhận |
| --- | ---: |
| Chu kỳ billing | 2026-03-31 đến 2026-04-30 |
| Cached Egress | 7.42 GB / 5 GB |
| Vượt Cached Egress | 2.42 GB |
| Uncached Egress | 1.99 GB / 5 GB |
| Storage Size | 0.301 GB / 1 GB |
| Database Size | 0.031 GB / 0.5 GB |
| Monthly Active Users | 9 |
| Grace period | đến 2026-05-26 |

Diễn giải:

- Quota bị vượt là lưu lượng tải ra từ Supabase Storage/CDN, chủ yếu liên quan ảnh.
- Storage size chưa phải vấn đề, vì mới khoảng 0.301 GB.
- Database size chưa phải vấn đề, vì mới khoảng 0.031 GB.
- MAU chỉ có 9 nên đây không phải lỗi do quá nhiều user thật.

Kết quả kiểm tra trước đó:

- Mobile app tạo public Supabase Storage URL từ `EXPO_PUBLIC_SUPABASE_URL`.
- Preview và production build đang dùng cùng Supabase project URL.
- Bucket `food-images` và `user-food` được cấu hình public.
- Nhiều file `food-images/thumbnails/*.png` nặng khoảng 4-5 MB.
- Một số object trả về `Cache-Control: no-cache`, làm tăng rủi ro revalidate/download lại.
- Luồng upload ảnh user hiện chưa bắt buộc backend resize/nén trước khi public.
- Smoke/dev flow có thể vô tình tải production media nhiều lần.

## Hạ tầng và dịch vụ hiện có

Kết quả rà soát repo cho thấy ngoài Render và Supabase, app còn dùng hoặc chuẩn bị dùng các dịch vụ sau:

| Dịch vụ | Vai trò hiện tại | Khuyến nghị |
| --- | --- | --- |
| Render | Host `.NET` backend và Python AI provider | Giữ, nhưng không dùng Free cho public production |
| Supabase | Postgres, Storage, service-role storage access | Giữ DB/Auth/metadata; tối ưu hoặc offload media |
| Firebase | Crashlytics, Android config, Google mobile integration | Giữ Crashlytics; không thêm Firebase Storage mặc định |
| Google Sign-In | Đăng nhập Google | Giữ |
| Expo/EAS | Build/release mobile app | Giữ |
| Gemini API | AI nutrition, meal insight, cooking, voice parsing | Giữ, nhưng cần quota/budget production rõ ràng |
| Brevo | Gửi email backend | Giữ nếu deliverability ổn |
| Vercel | Admin/ops target | Tách khỏi đường tải media của mobile |

Chưa thấy các provider media này trong main code path:

- Cloudflare R2
- Cloudinary
- ImageKit
- Bunny Storage/CDN
- AWS S3/CloudFront
- Sentry
- PostHog/Mixpanel/Amplitude

## Nghiên cứu lựa chọn storage/CDN

### Supabase

Supabase tách quota cached egress và uncached egress. Free có 5 GB cached egress và 5 GB uncached egress. Pro có 250 GB cached egress và 250 GB uncached egress; overage được niêm yết là 0.03 USD/GB cached và 0.09 USD/GB uncached.

Supabase cũng khuyến nghị khi Storage egress cao thì cần resize ảnh, set `cache-control` cao, giới hạn upload size, và dùng Smart CDN.

Kết luận cho EatFitAI:

- Supabase vẫn phù hợp cho beta và early production nếu sửa ảnh đúng.
- Supabase Pro tăng quota nhưng không sửa được lỗi 5 MB thumbnail.
- Cần giảm byte/image trước, rồi mới quyết định mua thêm quota.

Nguồn:

- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/docs/guides/storage/production/scaling

### Cloudflare R2

Cloudflare R2 là object storage có chi phí tốt cho public media. Free tier hiện ghi nhận 10 GB-month storage, 1M Class A operations, 10M Class B operations và internet egress free. Paid Standard storage được niêm yết 0.015 USD/GB-month, cộng phí request theo Class A/Class B.

Kết luận cho EatFitAI:

- R2 là lựa chọn media offload hợp lý nhất nếu traffic public tăng.
- R2 không tự resize ảnh thông minh như Cloudinary/ImageKit, nên backend vẫn phải tạo `thumb`, `medium`, và `original-private`.
- R2 phù hợp hơn sau khi có media abstraction và domain/CDN path rõ ràng.

Nguồn:

- https://developers.cloudflare.com/r2/pricing/

### Firebase Storage

App đã tích hợp Firebase, nhưng hiện chủ yếu dùng Crashlytics, Android config và Google mobile integration. Firebase Cloud Storage có thể dùng được nhưng đi theo Blaze/pay-as-you-go và chi phí Storage/download của Google Cloud/Firebase. Firebase Crashlytics và Cloud Messaging là no-cost, nhưng điều đó không đồng nghĩa Firebase Storage là lựa chọn media rẻ nhất cho app này.

Kết luận cho EatFitAI:

- Giữ Firebase cho Crashlytics và mobile reliability.
- Không dùng Firebase Storage làm primary media store nếu không có lý do sản phẩm rõ ràng.
- Thêm Firebase Storage sẽ làm hạ tầng phân tán hơn mà không giải quyết sạch vấn đề Supabase/Render hiện tại.

Nguồn:

- https://firebase.google.com/pricing

### ImageKit

ImageKit dễ triển khai và có transformation/CDN delivery. Free plan ghi nhận 20 GB bandwidth và 3 GB DAM storage; Lite là 9 USD/tháng với 40 GB bandwidth và overage 0.5 USD/GB.

Kết luận cho EatFitAI:

- ImageKit phù hợp nếu muốn managed image transformation nhanh.
- Với bài toán chỉ cần phát ảnh public rẻ, R2 vẫn tối ưu chi phí hơn khi scale.

Nguồn:

- https://imagekit.io/plans

### Cloudinary

Cloudinary mạnh nhất về tính năng media: upload API, transformation, CDN delivery, video, DAM. Free plan có 25 monthly credits; paid plan thấp nhất được niêm yết cao hơn nhiều so với R2/ImageKit cơ bản.

Kết luận cho EatFitAI:

- Cloudinary tốt nếu sản phẩm cần workflow media nâng cao.
- Với lỗi hiện tại, Cloudinary có thể là overkill và chi phí cao hơn cần thiết.

Nguồn:

- https://cloudinary.com/pricing

### Bunny CDN/Storage

Bunny CDN có pricing đơn giản, Asia & Oceania khoảng 0.03 USD/GB và có monthly minimum 1 USD. Bunny hợp nếu muốn CDN dễ kiểm soát, nhưng bandwidth vẫn tính tiền theo GB và storage/CDN cần xét chung.

Kết luận cho EatFitAI:

- Bunny là lựa chọn hợp lý nếu muốn CDN đơn giản, có hard bandwidth limit.
- Với sự cố hiện tại, R2 hấp dẫn hơn vì vấn đề chính là egress.

Nguồn:

- https://bunny.net/pricing/

## Kiến trúc tối ưu đề xuất

### Giai đoạn 1: Sửa media tại nguồn

Việc cần làm trước khi migration storage:

- Tạo ảnh variant thật:
  - `thumb`: 256-320 px, WebP/JPEG, mục tiêu 30-80 KB.
  - `medium`: 768-1080 px, WebP/JPEG, mục tiêu 120-300 KB.
  - `original`: private, optional, chỉ giữ 7-30 ngày nếu cần reprocess/debug.
- Upload object mới vào immutable v2 path:
  - `food-images/v2/thumb/{id}.webp`
  - `food-images/v2/medium/{id}.webp`
  - `user-food/v2/{userId}/thumb/{id}.webp`
  - `user-food/v2/{userId}/medium/{id}.webp`
- Set cache header dài, ví dụ `public, max-age=31536000, immutable`.
- Không dùng full-size image cho list/search/favorites.
- Dùng `expo-image`/`AppImage` nhất quán cho remote images.
- Không dùng fallback media làm đường chạy production chính.

### Giai đoạn 2: Backend bắt buộc xử lý ảnh upload

Ảnh user upload phải đi qua backend trước khi public:

- Validate content type và max upload size.
- Strip metadata nếu có thể.
- Tạo `thumb` và `medium` server-side.
- Chỉ public optimized variants cho app display.
- Giữ `original` private nếu cần reprocess.
- Xóa hoặc retire media cũ khi avatar/user food bị update/delete.

### Giai đoạn 3: Thêm media provider boundary

App không nên tự hardcode Supabase Storage URL:

- Mobile nhận URL/variant từ DTO/helper ổn định.
- Backend sở hữu logic chọn media key và variant.
- Config hỗ trợ:
  - `MEDIA_STORAGE_PROVIDER=supabase`
  - `MEDIA_PUBLIC_BASE_URL=https://...`
  - tương lai: `MEDIA_STORAGE_PROVIDER=r2`
- App chọn variant theo màn hình: list dùng `thumb`, detail dùng `medium`.

### Giai đoạn 4: Monitoring và production gates

Ngưỡng vận hành đề xuất:

| Tín hiệu | Hành động |
| --- | --- |
| Cached egress > 60% monthly quota | Điều tra top media paths |
| Cached egress > 80% | Dừng smoke/media-heavy test trên production |
| Cached egress > 90% | Bật media budget mode hoặc chuyển media sang R2 |
| Thumbnail > 100 KB | Block release/migration |
| Detail image > 350 KB | Review compression |
| Dev/test build trỏ vào production media | Block release |

Sau khi chu kỳ billing mới bắt đầu sau 2026-04-30, cần theo dõi ít nhất 7 ngày trước khi quyết định migration trả phí.

## Mô hình chi phí và sức chịu tải

User count một mình không phản ánh đúng rủi ro. Cần nhìn theo media budget/user.

Mẫu xấu hiện tại:

- Một "thumbnail" khoảng 5 MB.
- 100 lượt xem/user/tháng có thể thành khoảng 500 MB/user/tháng.
- Chỉ 10 active user hoặc test lặp nhiều lần đã có thể chạm 5 GB.

Mục tiêu sau tối ưu:

- Thumbnail khoảng 50 KB.
- Medium image khoảng 200 KB.
- 100 thumbnail views + 20 medium views khoảng 9 MB/user/tháng trước khi tính device cache.
- Nếu cache tốt và nhiều object lặp lại, thực tế có thể thấp hơn.

Ước lượng media capacity:

| Setup | Media budget | MAU thực dụng |
| --- | ---: | ---: |
| Supabase Free sau tối ưu | 5 GB cached egress | 300-1,000 MAU |
| Supabase Pro sau tối ưu | 250 GB cached egress | 10,000-25,000+ MAU |
| R2 cho media | R2 không tính internet egress | giới hạn chuyển sang request/API/app behavior |

Các mốc này là planning range, không phải guarantee. Muốn chốt cần load test API và theo dõi dashboard thật.

## Mốc production đề xuất

### Internal beta

Chỉ dùng cho test nhỏ:

- Render Free có thể chấp nhận cho manual test, không phải public production.
- Supabase Free dùng được sau khi fix media.
- Gemini free quota pool chỉ đủ low-volume testing.
- Sức chịu tải hợp lý: 50-300 MAU, AI usage thấp.

### Public beta tiết kiệm

Mức tối thiểu nếu public nhẹ:

- Render Starter cho backend và AI provider, hoặc Render Standard cho backend nếu cần latency ổn hơn.
- Supabase Free chỉ dùng nếu usage sau fix thấp hơn quota rõ ràng.
- R2 optional, nhưng nên chuẩn bị nếu public media tăng.
- Sức chịu tải hợp lý: 300-1,000 MAU, 10-30 concurrent users, AI có quota kiểm soát.

Chi phí ước lượng:

- Render Starter backend + AI provider: khoảng 14 USD/tháng.
- Supabase Free: 0 USD.
- R2: có thể 0 USD ở scale hiện tại nếu trong free tier.

### Small production khuyến nghị

Mốc nên dùng khi app public thật:

- Render Standard cho backend.
- Render Starter hoặc Standard cho AI provider tùy RAM/latency.
- Supabase Pro để có quota và vận hành an toàn hơn.
- R2 cho public media nếu cached egress vẫn vượt 60-80% sau tối ưu.

Sức chịu tải hợp lý:

- 1,000-5,000 MAU.
- 30-150 concurrent users.
- AI capacity phụ thuộc quota Gemini/paid AI, không chỉ Render/Supabase.

Chi phí ước lượng:

- Render backend Standard: khoảng 25 USD/tháng.
- Render AI provider Starter/Standard: khoảng 7-25 USD/tháng.
- Supabase Pro: khoảng 25 USD/tháng.
- R2: thường 0 đến vài USD ở early scale.
- Tổng: khoảng 57-75 USD/tháng trước phần paid AI usage.

### Growth production

Chỉ lên khi số đo thật yêu cầu:

- Render Pro hoặc horizontal scaling.
- Supabase Pro + nâng compute nếu DB CPU/IO/connections chạm ngưỡng.
- R2/custom CDN domain cho media.
- Paid Gemini/API budget hoặc user-level AI quota.
- Sức chịu tải: 5,000-20,000+ MAU sau load test.

## Cảnh báo riêng về AI capacity

`render.yaml` hiện có `GEMINI_RPD_LIMIT=20` mỗi project. Nếu dùng 6 Gemini project độc lập, tổng vẫn chỉ khoảng 120 AI requests/ngày trước khi local quota gating chặn request.

Điều này có nghĩa AI có thể là bottleneck đầu tiên khi production.

Ví dụ:

- 100 DAU x 1 AI-heavy action/ngày = 100 AI calls/ngày.
- 500 DAU x 1 AI-heavy action/ngày = 500 AI calls/ngày.

Production policy cần có:

- Quota AI rõ ràng theo user/ngày.
- Cache cho nutrition/meal insight/cooking prompt lặp lại.
- UX rõ ràng khi AI quota bận.
- Paid Gemini/API budget khi vượt public beta.

## Khuyến nghị cuối cùng

Làm trước:

1. Fix Supabase media variants và cache behavior.
2. Chặn dev/smoke flow dùng production media mặc định.
3. Backend bắt buộc xử lý ảnh upload.
4. Thêm provider-neutral media layer.
5. Theo dõi chu kỳ mới sau 2026-04-30.

Chưa nên làm ngay:

- Không chuyển database/auth khỏi Supabase.
- Không thêm Firebase Storage chỉ vì app đã tích hợp Firebase.
- Không chỉ nâng Supabase Pro mà không giảm image size.
- Không dựa vào fallback image behavior làm đường chạy production chính.

Chọn R2 khi một trong các điều kiện sau đúng:

- Sau tối ưu, cached egress vẫn tăng nhanh hơn dự kiến.
- Public production đạt khoảng 1,000-2,000 MAU và media usage tăng rõ.
- Đã có custom domain cho CDN delivery.
- Cần chi phí media bandwidth dự đoán được và thấp.

## Ghi chú bảo mật

- Supabase personal access token đã chia sẻ trong quá trình điều tra cần được rotate/revoke sau khi dùng xong.
- Không commit Supabase service key, Firebase private config, Google OAuth secret, Render token, Brevo key, hoặc Gemini key.
- `google-services.json` chỉ nên được quản lý nếu đã restrict theo package name + SHA-1; mặc định cần tránh track nhầm secret/config nhạy cảm.

## Acceptance criteria cho implementation sau

Trước public production:

- Không dùng `food-images/thumbnails/*.png` làm primary thumbnail nếu object lớn hơn 100 KB.
- Tất cả user-uploaded images phải được backend xử lý trước khi public display.
- Tất cả remote image rendering dùng variant phù hợp với màn hình.
- Production và preview không chia sẻ dev/smoke media behavior nguy hiểm.
- Supabase usage dashboard dưới 60% cached egress sau 7 ngày đầu của chu kỳ mới.
- AI quota policy được document và enforce.
- Có v2 media path rollback-safe; old media chỉ là compatibility path, không phải primary path.
