# Checklist Chuyển Đổi Web Ôn Tập Tốt Nghiệp Sang SmartCare

Tài liệu này theo dõi tiến trình thực hiện chuyển đổi dự án web ôn tập từ EatFitAI sang SmartCare tại thư mục `C:\Users\PC\OneDrive\Desktop\smartcare-prep-web`.

---

- [x] **Bước 1: Cấu hình và đổi tên chung dự án**
  - [x] Đổi tên trong `package.json` thành `smartcare-prep-web`
  - [x] Đổi `<title>` trong `index.html` thành `SmartCare - Trợ Lý Ôn Tập Tốt Nghiệp`
  - [x] Đổi tên app hiển thị trong `src/App.tsx` thành `SmartCare Prep`
  - [x] Tạo file `PLAN.md` mới tại thư mục gốc dự án trên Desktop theo quy chuẩn lập trình

- [x] **Bước 2: Thay thế cơ sở dữ liệu ôn tập (src/data/)**
  - [x] Cập nhật `src/data/chapters.ts` (4 chương lý thuyết SmartCare)
  - [x] Cập nhật `src/data/flashcards.ts` (30 thẻ ghi nhớ SmartCare)
  - [x] Cập nhật `src/data/gitCommits.ts` (Lịch sử git commit SmartCare)
  - [x] Cập nhật `src/data/mockQA.ts` (25 câu hỏi phản biện SmartCare)
  - [x] Cập nhật `src/data/quizzes.ts` (25 câu trắc nghiệm SmartCare)
  - [x] Cập nhật `src/data/sourceCodes.ts` (Code mẫu thực tế SmartCare)

- [x] **Bước 3: Cập nhật các view giao diện (src/views/)**
  - [x] Cập nhật `src/views/Learn.tsx` (Sơ đồ SVG, Tooltips, Accordions, Câu hỏi phản biện, Đối sánh công nghệ)
  - [x] Cập nhật `src/views/AIChatbox.tsx` (Welcome message và System prompt SmartCare)
  - [x] Cập nhật `src/views/ChatDefense.tsx` (LocalStorage keys và text)
  - [x] Cập nhật `src/views/Dashboard.tsx` (Nhiệm vụ ôn tập và text)
  - [x] Cập nhật `src/views/Quiz.tsx` & `src/views/RubricView.tsx` (LocalStorage keys và text)
  - [x] Cập nhật `src/views/KnowledgeMap.tsx` (Bản đồ 25 nodes và 6 flows nghiệp vụ, sửa lỗi biên dịch hỏng & encoding)

- [x] **Bước 4: Xác minh và hoàn thiện**
  - [x] Chạy TypeScript type-checking (`npx tsc --noEmit --skipLibCheck`) để đảm bảo không có lỗi kiểu
  - [x] Chạy build thử nghiệm (`npm run build`) xem bundler có hoạt động trơn tru không
  - [x] Khởi chạy thử nghiệm local và kiểm tra thực tế
