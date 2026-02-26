# CODEx Skills Sync Guide

## Vì sao Git không thấy "skills đã cài"
- Skills được cài vào máy local tại `CODEX_HOME/skills` (mặc định `~/.codex/skills`), không nằm trong source code app.
- Vì vậy, bạn không commit "skills đã cài" trực tiếp được.
- Cách đúng là commit "manifest + script cài" để máy khác tự cài lại cùng bộ skills.

## File đã thêm vào repo
- `tools/codex/skills-manifest.txt`: danh sách skills chuẩn của dự án.
- `tools/codex/install-codex-skills.ps1`: script cài tự động theo manifest.

## Cách dùng trên máy khác
1. Clone/pull repo mới nhất.
2. Mở PowerShell tại root repo.
3. Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\codex\install-codex-skills.ps1
```

4. Restart Codex.

## Khi thêm/bớt skill
1. Sửa `tools/codex/skills-manifest.txt`.
2. Commit thay đổi manifest.
3. Máy khác pull và chạy lại script cài.

## Tác dụng bộ skills đang dùng cho EatFitAI
- `security-best-practices`: chuẩn hardening code/bảo mật ứng dụng.
- `security-threat-model`: mô hình hóa mối đe dọa theo luồng hệ thống.
- `security-ownership-map`: phân vai owner bảo mật theo module.
- `gh-fix-ci`: xử lý pipeline CI lỗi nhanh và có hệ thống.
- `doc`: chuẩn hóa viết/review tài liệu kỹ thuật.
- `sentry`: tích hợp tracking lỗi runtime/monitoring.
- `playwright`: test E2E UI/web flow tự động.
- `linear`: đồng bộ issue/task với Linear.
- `notion-spec-to-implementation`: chuyển spec Notion thành task kỹ thuật.
- `notion-knowledge-capture`: ghi nhận tri thức dự án vào Notion có cấu trúc.
- `render-deploy`: hỗ trợ deploy trên Render.
- `cloudflare-deploy`: hỗ trợ deploy trên Cloudflare stack.
- `vercel-deploy`: hỗ trợ deploy trên Vercel.
- `netlify-deploy`: hỗ trợ deploy trên Netlify.
