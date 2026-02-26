# Mục tiêu
Phân tích và dọn dẹp thư mục `docs` để loại bỏ TUYỆT ĐỐI các file trùng lặp, lỗi thời hoặc không còn giá trị (dead files), nhằm giữ lại một single source of truth cho dự án. (Xóa vĩnh viễn thay vì đưa vào archive theo yêu cầu của user).

# Các bước thực hiện (Specific Steps)
1. **Xóa vĩnh viễn (Delete) các file đã Deprecated và cũ:**
   - Xóa `docs/KE_HOACH_PHAT_TRIEN.md`
   - Xóa `docs/MASTER_WORKFLOW_PLAN_2026.md`
   - Xóa `docs/KE_HOACH_NANG_CAP_PHAT_TRIEN_APP_2026-02-26.md` (Đã có `PLAN-eatfitai-upgrade.md`).
   - Xóa `docs/PROJECT_REALITY_AUDIT.md`
   - Xóa `docs/DANH_GIA_VA_CAI_TIEN.md`
   - Xóa `docs/BAO_CAO_TONG_HOP.md`
   - Xóa toàn bộ thư mục `docs/archive/` vì chứa các file cực kỳ cũ từ 2025.

2. **Cập nhật File Canonical:**
   - Đổi tên file `docs/DOCS_CANONICAL_INDEX_2026-02-26.md` thành `docs/DOCS_CANONICAL_INDEX.md`.
   - Thiết lập các file gốc (Canonical) duy nhất:
     1. `BAO_CAO_DANH_GIA_CONG_NGHE_VA_CACH_LAM_HIEN_TAI_2026-02-26.md` (Phân tích, đánh giá, roadmap)
     2. `PLAN-eatfitai-upgrade.md` (Kế hoạch thực thi chi tiết)
     3. `LLM_FLOW.md`, `PHAN_TICH_FLOW_DAU_VAO.md`, `USERFLOW.md` (Các tài liệu flow thiết kế).
     4. `MARKET_RESEARCH_STRATEGY_2026.md` (Nghiên cứu thị trường).

# Thay đổi cấu trúc dữ liệu (Data Structure Changes)
- Thư mục `docs` sạch sẽ, chỉ chứa các file ACTIVE. Không có thư mục `archive`.

# Rủi ro (Risks)
- **Mất context:** Một số file lịch sử bị mất vĩnh viễn, nhưng vì project đã chốt sang phase mới với `PLAN-eatfitai-upgrade.md` nên rủi ro này được chấp nhận theo chỉ định thiết kế.
