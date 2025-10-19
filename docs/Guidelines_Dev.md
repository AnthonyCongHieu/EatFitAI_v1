# Guidelines_Dev

## Quy trình Agile đề xuất
1. **Sprint Planning:** xác định mục tiêu sprint, phân rã user story thành task rõ ràng.
2. **Daily Standup:** tối đa 15 phút (Hôm qua – Hôm nay – Vướng mắc).
3. **Development:** mỗi task có branch riêng, code + test + tài liệu, tự review trước PR.
4. **Code Review & QA:** tối thiểu 1 reviewer, QA verify chức năng trên build thử.
5. **Review cuối Sprint:** demo, retrospective, cập nhật backlog & lesson learned.

## Vai trò
- **PM/Product Owner:** ưu tiên backlog, gom feedback, chốt acceptance criteria.
- **Tech Lead:** định hướng kiến trúc, code convention, review PR khó, mentoring.
- **Developer:** triển khai chức năng, viết test, cập nhật document, hỗ trợ demo.
- **QA:** lập test case, kiểm thử manual/automation, theo dõi bug.
- **AI Engineer (nếu có):** chuẩn bị mô hình, mock API, theo dõi chất lượng đề xuất.

## Nguyên tắc giao tiếp
- Ghi nhận task trên tracker (Jira/GitHub Project), status rõ ràng.
- Document ngắn gọn ngay khi phát hiện technical decision.
- Trả lời review trong 24h, tránh “merge vội” khi còn comment.

## Checklist trước khi tạo PR
- [ ] Lint + typecheck + test xanh.
- [ ] Update README/tài liệu nếu có thay đổi hành vi.
- [ ] Screenshot/video cho UI thay đổi.
- [ ] Mô tả PR nêu rõ “Làm gì – Kiểm tra thế nào – Liên quan ticket”.

Tuân thủ guideline giúp nhóm giữ tiến độ, giảm nợ kỹ thuật và dễ dàng bàn giao.