# Tài Liệu Master: Kiến trúc và Triển Khai EatFitAI Admin

> [!NOTE]
> Tài liệu này đóng vai trò là "Bản Lề" (Blueprint) và Hướng dẫn thực hành (Step-by-step) để bạn xây dựng hệ thống Quản trị (Admin) chuyên nghiệp, độc lập cho dự án EatFitAI.

---

## 💥 PHẦN 1: TẠI SAO PHẢI TÁCH RIÊNG MÃ NGUỒN (POLYREPO)?

Trong hệ sinh thái của EatFitAI hiện tại, bạn đang có:
1. **Model AI (Python):** Nặng về xử lý toán học, dùng `pip`, `venv`, tài nguyên GPU.
2. **Backend (.NET C#):** Quản lý API, Server logic, dùng `MSBuild`, cấu trúc OOP phức tạp.

**Lý do phải tạo 1 Repository Git mới hoàn toàn cho Web Admin:**
*   **Pipeline CI/CD Độc Lập:** Vercel được sinh ra để deploy Frontend. Nếu bạn trộn lẫn 3 hệ ngôn ngữ vào 1 cục, mỗi lần ấn nút "Git Push", Vercel sẽ phải mất thời gian dò tìm đâu là code web, và có nguy cơ bị lỗi build do các file Python/C# gây nhiễu. Bằng cách tách riêng, quá trình Deploy kéo dài chưa tới 1 phút.
*   **Bảo mật Tối Đa (Zero Trust):** Web Admin có thể cấp quyền cho các lập trình viên Frontend khác làm trong tương lai. Tách riêng giúp bạn bảo vệ an toàn 100% mã nguồn thuật toán AI và Backend cốt lõi.
*   **Sự Tinh Gọn (Clean Workspace):** Khi mở file IDE, bạn sẽ không bị hoa mắt bởi hàng chục nghìn file khác nhau từ `node_modules`, `obj/bin` của C#, và `.venv` của Python.

---

## 🛠 PHẦN 2: TECH STACK (CÔNG NGHỆ ÁP DỤNG)

Đây là Stack tối ưu nhất hiện tại trên thế giới, đáp ứng đủ 5 tiêu chí: **Nhẹ - Nhanh - Xịn - Realtime - Dễ Deploy**.

| Thành phần | Lựa chọn Đề xuất | Lý do Thực Tế (Pragmatic Reason) |
| :--- | :--- | :--- |
| **Lõi Framework** | **Next.js 14+ (App Router)** | Vercel tối ưu 100% cho Next.js, code có sẵn cơ chế giấu API Key ở Server. |
| **Ngôn ngữ** | **TypeScript** | Giúp tránh 99% lỗi vặt (như undefined data) khi tương tác với dữ liệu từ Supabase. |
| **Giao diện (UI)** | **Tailwind CSS + Shadcn UI** | Cực nhẹ (không nạp toàn viện như Bootstrap), thiết kế sang trọng, chỉnh sửa mã nguồn UI tự do. |
| **Base Biểu đồ** | **Recharts / Tremor** | Dễ dàng vẽ biểu đồ lượng calo/ngày, tỷ lệ user đăng ký/bỏ đi bằng các React hooks. |
| **Kết nối Data & Auth** | **Supabase JS Client** | Tích hợp sâu, quản lý đăng nhập Admin cực an toàn, hỗ trợ đọc data realtime qua Websocket. |
| **State & Caching** | **TanStack Query (React Query)** | Tự động caching dữ liệu trên màn hình Admin, không phải code thủ công trạng thái Load/Lỗi. |
| **Hosting** | **Vercel** | Free, tự động lấy code từ Github, gắn Domain cá nhân miễn phí và tự lấy SSL. |

---

## 🏗 PHẦN 3: CÁC THÀNH PHẦN (COMPONENTS) CẦN XÂY DỰNG

Hệ thống điều khiển (Control Panel) sẽ được chia làm 4 Phân Khu chức năng (Modules):

### 1. 📊 Phân khu Dashboard (Tổng Quan)
- Các con số thống kê nóng "Realtime": Tổng lượt User đăng nhập hôm nay, số API nhận diện đồ ăn được gọi, Lượng bộ nhớ Supabase đã chiếm.
- Biểu đồ khuynh hướng 7 ngày / 30 ngày.

### 2. 👥 Phân khu Quản Lý Dữ Liệu Khách Hàng (User Manager)
- Bảng Grid danh sách User.
- Tính năng phân quyền (Chuyển User lên cấp VIP - Premium nếu có thu phí).
- Tính năng Khóa (Ban) các tài khoản lợi dụng API.

### 3. 🍱 Phân khu Master Data: Nguồn Thực Phẩm (Food Database)
- Giao diện CRUD (Thêm, Sửa, Xóa) kho dữ liệu các món ăn chuẩn để ứng dụng đối chiếu (Tên món, Calories, Protein, Fat, Carbs).
- Cơ chế duyệt (Approve) nếu có cho phép User đóng góp món ăn mới.

### 4. 🤖 Phân khu Trinh Sát Model AI (AI Monitoring - Rất Quan Trọng)
- Hiển thị rành mạch Log phiên làm việc của User: Họ upload ảnh gì $\rightarrow$ Model AI (YOLO/Gemini) nhận diện kết quả là món gì $\rightarrow$ Tỷ lệ cấu trúc chính xác.
- Tính năng Export (Xuất Data) cho hình ảnh nhận diện SAI để lưu trữ làm data re-train (huấn luyện lại YOLO) cho quy trình tương lai.

---

## 🚀 PHẦN 4: HƯỚNG DẪN THỰC CHIẾN (STEP-BY-STEP)

> [!WARNING]
> Những lệnh này thao tác vào ổ đĩa trên máy tính của bạn và hệ thống Github nên **tôi không thể click thay bạn**. Bạn hãy copy cẩn thận theo thứ tự và paste vào Terminal/PowerShell (Mở quyền Admin nếu cần).

### Bước 1: Yêu cầu cài đặt bắt buộc trên máy (Prerequisites)
1. Đã cài đặt **Node.js** (Bản LTS 20.x).
2. Đã cài đặt **Git**.
3. Đã có tài khoản **Github** (Và đã login Git ở máy).

### Bước 2: Tạo Khung xương Dự Án ở Ổ đĩa D (Generate Source Code)
Mở PowerShell, gõ từng dòng sau:
```powershell
d:
cd \
# Cài đặt Base Next.js chuẩn (kèm TypeScript, Tailwind) trong thư mục tên EatFitAI_Admin
npx -y create-next-app@latest EatFitAI_Admin --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
*Đợi khoảng 1-2 phút cho đến khi có thông báo màu xanh "Success! Created EatFitAI_Admin...".*

### Bước 3: Đẩy Code Ban Đầu lên Private Repository (Github)
Kế tiếp, di chuyển vào folder vừa tạo và link nó lên tài khoản Github riêng tư của bạn. Mở GitHub trên Web (https://github.com/new).
1. Create a matching repository. Tên (Repository Name): `EatFitAI_Admin`. 
2. Đánh dấu tích vào ô **"Private"**. (Không tích tạo README). Bấm Create.

Quay lại PowerShell (đang ở trạng thái sau Bước 2) và gõ:
```powershell
cd EatFitAI_Admin

# Add tất cả file vừa được generate
git add .
git commit -m "feat: first commit - setup NextJS boilerplate"

# Trỏ hệ thống Git local lên Github của bạn (Thay "LINK_CUA_BAN" = URL repository Github bạn vừa tạo)
# VD: https://github.com/ToiLaAi/EatFitAI_Admin.git
git remote add origin https://github.com/LINK_CUA_BAN/EatFitAI_Admin.git

# Đẩy code lên nhánh chính
git branch -M main
git push -u origin main
```

### Bước 4: Deploy Mồi Lên Vercel (Setup CI/CD Pipeline)
1. Truy cập [Vercel.com](https://vercel.com) và đăng nhập bằng tài khoản Github.
2. Bấm nút **"Add New Project"**.
3. Tại giao diện nhập (Import), bạn sẽ thấy repo `EatFitAI_Admin` báo hình ổ khoá (Private Repo). Bấm nút **"Import"**.
4. Các thiết lập cứ để nguyên mặc định (Framework Preset: Next.js).
5. Bấm **"Deploy"**. Đợi 1 phút.
6. Boom! Hệ thống của bạn đã lên mạng Online (với mã nguồn được cô lập hoàn toàn khỏi hệ thống AI). Bất kỳ khi code mới đẩy lên Github, trang Web sẽ tự động đổi mới.

---

## Mở Rộng Tiếp Theo Chuyên Sâu

Khi bạn làm xong 4 Bước trên, việc setup System đã hoàn thành. Lúc đó:
1. Bạn mở VS Code lên, bấm *File $\rightarrow$ Open Folder $\rightarrow$ chọn `D:\EatFitAI_Admin`*. 
2. Quay lại thông báo cho tôi (AI). Vì khi bạn mở Folder đó ra làm Workspace, tôi mới có quyền cấp phép nhảy vào trong viết code giao diện Dashboard, cấu hình kết nối file Database Supabase và Setup các UI Shadcn.
