# 📚 EatFitAI Documentation

Thư mục này chứa các tài liệu thiết kế hệ thống và luồng hoạt động chính của EatFitAI. Nhằm duy trì tính gọn gàng và tránh phân mảnh thông tin, tài liệu được tổ chức theo cấu trúc Canonical dưới đây.

Lưu ý: Kế hoạch thực thi đồ án (Master Plan / Tasks) hiện được quản lý tập trung trên **Notion** (và các file `.md` trong thư mục `brain/` của AI Assistant), không còn đặt trong repo source code.

## 🌟 Core System Documents

1. `01_ARCHITECTURE_OVERVIEW.md`
   - **Nội dung:** Hiện trạng toàn bộ app EatFitAI (Snapshot).
   - **Vai trò:** Bản đồ tổng quan về công nghệ hiện tại (.NET, React Native, Python, SQL), module chức năng, luồng network và danh sách API endpoints.

2. `02_USERFLOW.md`
   - **Nội dung:** Bản đồ luồng người dùng (User flows) & UI/UX Navigation.
   - **Vai trò:** Hướng dẫn luồng đi của User từ Auth, Onboarding, Meal Diary đến AI Features. Hỗ trợ việc mapping màn hình và API calls.

3. `03_AI_FLOW.md`
   - **Nội dung:** Tài liệu luồng tích hợp LLM & AI Vision.
   - **Vai trò:** Chi tiết hóa luồng hoạt động của AI (YOLOv8 + Ollama + Whisper), sơ đồ sequence hoạt động và cách fallback.

## 📂 Subdirectories

1. `analysis_reports/`
   - Chứa các báo cáo phân tích tĩnh, dùng để tra cứu lịch sử quyết định (Ví dụ: báo cáo đánh giá hiện trạng, đánh giá thị trường, phân tích sâu flow nhập liệu...).
   - Các file trong này là dạng "point-in-time" và ít khi cần cập nhật.

## 📝 Nguyên tắc duy trì tài liệu

1. **Code is Truth**: Tránh viết tài liệu thiết kế lặp lại logic code. Document chỉ tập trung vào Architecture, Integration boundaries và User Flows.
2. **Không lưu kế hoạch trong Repo**: Kế hoạch đồ án, tracking task (Todo, Progress) được đặt ở Notion. Nơi đây chỉ lưu "How the system works".
3. **Keep it minimal**: Xóa các file cũ, lỗi thời. Sửa trực tiếp vào 3 file Core thay vì sinh thêm file con rác.
