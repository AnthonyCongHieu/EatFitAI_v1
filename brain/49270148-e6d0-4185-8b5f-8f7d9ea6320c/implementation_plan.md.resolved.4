# Kế hoạch Thiết kế Giao diện Admin & Hệ thống Gemini Pool Manager (Cập nhật cực kỳ sát sao)

Dựa theo nhu cầu sát sườn của dự án **EatFitAI** và các bằng chứng (Screenshot) từ Google AI Studio đối với model `Gemini 2.5 Flash` bản Free (Niveau sans frais), dưới đây là cấu trúc thiết kế UI và luồng xử lý Backend được điều chỉnh lại chính xác 100%.

## 1. Cấu trúc Layout Giao Diện Web Admin 

Web Admin sẽ áp dụng thiết kế chia đôi cơ bản của hệ thống SaaS (Software as a Service):

### A. Sidebar (Menu Trái)
- **Dashboard:** Thống kê nhanh toàn bộ hệ thống.
- **Data Manager:** 
  - `Users:` Quản lý người dùng.
  - `Food Master:` Thêm/sửa món ăn cho thuật toán calo.
- **AI Operations:**
  - `Model Logs:` Xem chính xác từng ảnh User upload và máy trả kết quả gì.
  - `Gemini Core:` (Tính năng cốt lõi mới) - Trung tâm điều lệnh các API Keys.
- **Settings:** Đổi mật khẩu/cài đặt môi trường.

### B. Màn Hình Gemini Core (API Key Manager)
Đây là màn hình quan trọng nhất, thiết kế riêng để trị vấn đề "Quota Limit" siêu ngặt nghèo của AI Studio bản hiện tại.

#### Giao diện danh sách Key (Card Grid / Table)
Mỗi API Key sẽ được đại diện bởi 1 thẻ (Card), hiển thị các vạch màu (Progress Bar) giống hệt trang dashboard của Google:
1. **RPM (Request Per Minute)**: Số yêu cầu trên 1 phút (Max = **5**).
2. **RPD (Request Per Day)**: Số yêu cầu trên 1 ngày (Max = **20**).
3. **TPM (Tokens Per Minute)**: Lượng Token tối đa / phút (Max = **250K tokens**).

#### Tiện ích ở Gemini Core:
- Nút **[+ Thêm API Key mới]**: Trình giả lập thêm N keys vào Pool (Vì 1 account chỉ cho 20 RPD, nếu app có 200 lượt chụp đồ ăn 1 ngày thì phải cần tối thiểu 10 Keys miễn phí cắm sẵn).
- Trạng thái màu sắc của từng Key:
  - 🟢 **Khỏe mạnh** (Còn nhiều Quota).
  - 🟡 **Cảnh báo RPM** (Call nhanh quá 5 lần/phút $\rightarrow$ Phải chờ sập 60 giây).
  - 🔴 **Kiệt sức - Exhausted** (Đã xài hết 20 requests dứt điểm trong ngày).

---

## 2. Kế Hoạch Hệ Thống Backend cho Gemini Pool

Web chỉ là nơi hiển thị, việc **"Rotate" (Xoay tua)** và **"Đếm" (Count)** phải đặt ở Database/Backend.

### Thay đổi Cấu trúc Database (Data Structure Changes)
Tạo bảng mới `GeminiKeys`:
- `KeyId` (Guid, PK)
- `ApiKey` (String) - Có thể mã hóa bề mặt.
- `Alias` (String) - Ví dụ: "Acc Clone Số 1".
- `TierLevel` (Enum) - `Free` / `Level1` / `Level2` / `Level3` (Như trên ảnh).
- `Status` (Enum) - `Active`, `Cooldown`, `Exhausted`, `Banned`.
- `RpmUsed` (Int) - Số hit gọi trong phút hiện tại.
- `RpdUsed` (Int) - Số hit gọi trong ngày.
- `TpmUsed` (Int) - Số Token gọi trong phút.
- `LastRequestAt` (DateTime) - Thời điểm xả API cuối cùng để Backend tự phán đoán khi nào Reset 1 phút.

### Kịch Bản Reset & Cooldown
- **Reset Phút / Timeout**: Khi frontend Mobile yêu cầu API quét ảnh, backend lấy 1 Key ra. Nó đếm `LastRequestAt`. Nếu khác phút hiện tại (chênh lệch > 60 giây), tự động Reset 2 biến `RpmUsed` = 0 và `TpmUsed` = 0.
- **Reset Ngày**: Vào 00:00 (Giờ UTC), tự động Reset biến `RpdUsed` = 0 của mọi Key về 0. Trạng thái `Exhausted` sẽ nhảy về `Active`. 

### Thuật toán Xoay Tua (Round Robin / Pool Routing Cực Đoan)
# Frontend Admin Dashboard Implementation Plan

Tài liệu này vạch ra kế hoạch triển khai Frontend Admin Dashboard bằng Next.js, tập trung vào việc hiện thực hóa các tính năng thiết yếu (Quản lý User, Quản lý Gemini Pool, Dashboard Thống kê).

## User Review Required

> [!IMPORTANT]
> **Quyết định thiết kế giao diện:**
> Chúng ta sẽ thiết kế một Dashboard mang tính chất dark-mode, hiển thị rõ ràng với Shadcn UI và Recharts để vẽ biểu đồ thống kê. User vui lòng xác nhận chúng ta sẽ bắt đầu khởi tạo dự án Next.js tại `D:\EatFitAI_Admin` như đã lên kế hoạch và cài đặt các thư viện cần thiết.

> [!NOTE]
> Giao diện sẽ gọi trực tiếp đến Backend .NET (dành cho quản lý Gemini) và có thể truy xuất trực tiếp Supabase để hiển thị một số dữ liệu thô (nếu cần thiết, tuỳ theo thiết kế hiện tại của EatFitAI). Vui lòng xác định quy chuẩn Call API (gọi qua Backend hay qua Supabase JS client). Tạm thời sẽ lên kế hoạch gọi qua Backend (REST API).

## Proposed Changes

Chúng ta sẽ thực hiện theo các bước sau trong dự án Next.js (`D:\EatFitAI_Admin`):

### Khởi tạo môi trường UI (Component Layer)
- Cài đặt và cấu hình Shadcn UI cùng các components cơ bản (Button, Card, Table, Form, Dialog, Input).
- Cài đặt Lucide React cho icon.
- Cài đặt Recharts cho biểu đồ thống kê.
- Cài đặt Zustand và TanStack Query để quản lý state & data fetching.

### Lớp Dịch vụ (Service Layer)
#### [NEW] `src/services/apiClient.ts`
- Khởi tạo Axios client hoặc fetch wrapper để tương tác với Backend `.NET`.
- Xử lý authentication token (JWT từ Supabase).

### Giao diện và Routing (App Router)
#### [NEW] `src/app/layout.tsx` (Update)
- Thiết lập Layout chung cho Admin với Sidebar điều hướng và Header.
#### [NEW] `src/app/page.tsx`
- Trang Dashboard Overview. Hiển thị Recharts về tổng số key đang dùng, số lượng quota đã gọi, v.v.
#### [NEW] `src/app/gemini-keys/page.tsx`
- Trang Quản lý Gemini Pool.
- Bảng hiển thị thông tin keys, status, số lượng request đã dùng.
- Form thêm/sửa/xóa key thủ công.
#### [NEW] `src/app/users/page.tsx`
- Trang Quản lý Người dùng (Danh sách, Tình trạng, và Logs nếu có).

## Open Questions

> [!WARNING]
> 1. Authentication cho Admin: Bạn đã có cơ chế Login nào cho Admin bên Next.js chưa? Chúng ta nên dùng Supabase Auth UI cho trang đăng nhập, sau đó lấy Access Token đó dùng để gọi qua API Backend của .NET đúng không?
> 2. Bạn có muốn dùng Stitch MCP để hỗ trợ generate một số màn hình thiết kế thông qua text prompt không? Tôi thấy bạn vừa connect vào Stitch MCP trước đó.

## Verification Plan

### Automated Tests
- Build & Lint bằng lệnh `npm run lint` và `npm run build` để đảm bảo code Next.js sạch sẽ, không lỗi type.

### Manual Verification
- Chạy local `npm run dev`.
- Đăng nhập (nếu xử lý Auth) và xem Sidebar thiết kế.
- Truy cập tính năng Quản trị Gemini API Key, thử Add một key ảo và xác nhận bảng hiện đúng.

---

## 3. Trạng thái Quyết định Kiến trúc (Đã Chốt & Chờ Chốt)

Dựa trên trao đổi với dự án, các thiết lập lõi được quyết định như sau:

1. **Bảo mật API Key:** **Đã chốt.** Các API Key sẽ được mã hóa (AES Encryption) phía Backend C# trước khi lưu vào chung Database. Đảm bảo an toàn cấp cao nhất.
2. **Kịch bản Bể Nồi (Exhausted Pool):** **Đã chốt.** Nếu cả Pool không còn Key nào sống, API trả về mã lỗi HTTP và thông báo Business Exception: `"Dịch vụ AI đang tạm ngừng hoặc quá tải, vui lòng thử lại sau"`.
3. **Phân phối Database:** **Đã chốt.** Gom chung xài duy nhất 1 cơ sở dữ liệu Supabase Postgres làm lõi (Single Source of Truth). Rẻ, tiện lợi, Join dữ liệu dễ dàng không gặp độ trễ mạng.
4. **Việc Thống Kê Tokens (Đang chờ bạn chọn):** 

**Giải thích chi tiết Câu số 4:** 
Mỗi lần AI phân tích 1 bức ảnh nó sẽ nuốt của bạn khoảng 600 Tokens (Đơn vị tính dung lượng của Google). Bạn có 2 cách chọn để kỹ thuật viên (tôi) lập trình Data:
*   **Cách A (Giữ Lịch sử - Ngốn Ổ cứng):** Mỗi lần user tải món ăn lên $\rightarrow$ Backend sẽ chèn thêm 1 dòng lịch sử vào cái bảng `GeminiTokenLogs` (Ghi rõ: Ngày nào, User nào chụp, Tốn bao nhiêu Tokens, Dài bao nhiêu chữ). Bảng này phình to rất nhanh (hàng trăm ngàn dòng). Khá vô dụng vì bạn xài đồ Free, chả bị Google thu tiền bao giờ nên không cần đem cái bảng này đi cãi nhau với Google.
*   **Cách B (Xóa Bỏ Gánh Nặng - Lấy Đếm Số):** Không thèm lập bảng Lịch sử, quét xong ảnh nó trả về tốn 600 Tokens $\rightarrow$ Lấy 600 cộng dồn vào Biến Giới Hạn `TpmUsed` (để biết đã đạt mốc cấm 250,000/phút chưa) $\rightarrow$ Rồi vứt thẳng. Cách này giúp Supabase của bạn cực kỳ nhẹ và sạch rác.

> [!CAUTION]
> Lời khuyên 100% Thực dụng: Do bạn dùng Free Keys (Bị khóa Request Per Day 20 nhát/ngày), Tokens của bạn ăn còn chưa sứt mẻ gì nên **Hãy chọn Cách B**. Bạn chốt Cách B là chúng ta lên Task và viết Code Backend ngay tắp lự!
