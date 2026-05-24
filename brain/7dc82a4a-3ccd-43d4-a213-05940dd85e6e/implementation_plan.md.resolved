# Documentation Refresh Plan — EatFitAI

## Mục tiêu

Chuyển docs từ trạng thái "demo-heavy, audit-heavy, snapshot-by-date" sang "production-ready, teammate-onboardable, maintainable".

## Hiện trạng docs

| Vị trí | Số file | Mô tả |
|---|---:|---|
| `docs/` (root) | 12 | Core docs + README + SECRETS_SETUP |
| `docs/archive/` | 23 | Historical reports, evidence bundles, research |
| `docs/archive/analysis/` | 5 | Early-stage research & strategy docs |
| `docs/archive/cleanup/` | 2 | Cleanup audit (session trước) |
| `docs/templates/` | 3 | Rehearsal/UAT templates |
| Root | 2 | `README.md`, `SETUP_GUIDE.md` |

**Tổng: ~47 file docs liên quan.**

---

## Phân tích từng file

### Tier 1: GIỮ & CẬP NHẬT (Production Docs)

Các file này vẫn có giá trị production, nhưng cần cập nhật để phản ánh đúng hiện trạng.

| File | Size | Vấn đề | Hành động |
|---|---:|---|---|
| `README.md` (root) | 4KB | Links dùng absolute path `D:/`, `E:/` → không portable. Liệt kê quá nhiều helper docs. | **REWRITE** — chuẩn hóa relative links, rút gọn |
| `SETUP_GUIDE.md` (root) | 5KB | Section 2 liệt kê `Smtp:*` keys nhưng production đã chuyển sang Brevo. Path `E:\tool edit\` stale. | **UPDATE** — sửa secret keys, dùng relative paths |
| `docs/README.md` | 3KB | Index chưa phản ánh cấu trúc mới sau archive. Vẫn reference file bằng số thứ tự cũ. | **REWRITE** — index mới theo cấu trúc production |
| `docs/SECRETS_SETUP.md` | 7KB | Nội dung tốt, nhưng reference path `E:\tool edit\` cần sửa. | **UPDATE** — sửa paths |
| `docs/01_ARCHITECTURE_OVERVIEW.md` | 30KB | Có errata notes cho Voice AI drift. Một số diagrams stale. Vẫn là doc kiến trúc chính. | **UPDATE** — sửa errata, cập nhật diagrams |
| `docs/03_AI_FLOW.md` | 34KB | Chi tiết AI pipeline. Một số sections về Ollama local stale so với cloud Gemini. | **UPDATE** — cập nhật Gemini pool, cloud path |
| `docs/24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md` | 6KB | Release gate commands. Vẫn current. | **GIỮ NGUYÊN** |

### Tier 2: GỘP & VIẾT LẠI (Merge into production docs)

Các file có thông tin tốt nhưng bị phân tán, trùng lặp, hoặc quá dài cho 1 chủ đề.

| File | Size | Vấn đề | Hành động |
|---|---:|---|---|
| `docs/02_USERFLOW.md` | 19KB | Sinh ra từ 2025-12, rất cũ. Nhiều screens/flows đã thay đổi. | **REWRITE** — viết lại theo runtime thực tế |
| `docs/04_ENVIRONMENT_EXECUTION_PLAN.md` | 5KB | Trùng 80% với `SETUP_GUIDE.md`. Ports, commands, flow giống nhau. | **MERGE** vào `SETUP_GUIDE.md` rồi archive |
| `docs/16_AUTH_INFRA_INVESTIGATION_2026-04-14.md` | 19KB | Investigation rất chi tiết. Phần "Fix Plan" 7 phases vẫn relevant. Nhưng phần "live verification" là snapshot. | **MERGE** phần fix plan vào doc mới `AUTH_AND_INFRA.md`, archive phần investigation |
| `docs/18_REAL_DEVICE_AUTH_RUNBOOK...md` | 25KB | Runbook + Google credentials guide + bug tracker. Quá nhiều concern. | **SPLIT**: credentials guide → `SECRETS_SETUP.md`, runbook → `TESTING_RUNBOOK.md`, archive investigation |

### Tier 3: ARCHIVE (Move to `docs/archive/`)

Các file là snapshot tại thời điểm cụ thể, không còn current nhưng có giá trị tham khảo.

| File | Lý do archive |
|---|---|
| `docs/06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md` | Snapshot 1 tháng cũ, nhiều blockers đã fix. Tiến độ % stale. |
| `docs/07_NOTION_PLAN_GAP...2026-03-14.md` | Gap analysis cũ. SQL snapshot data cũ. Notion task status đã đổi. |
| `docs/11_RESULT_E2E_PRODUCTION_SMOKE.md` | Smoke lane doc, nhưng procedures đã được thay thế bởi `24_PRODUCT_RELEASE_TEST_PLAN`. |

### Tier 4: ĐÃ ARCHIVE (Giữ nguyên trong `docs/archive/`)

| File | Status |
|---|---|
| `archive/08_EATFITAI_MODERN_PRODUCT_AUDIT_2026-03-29.md` | ✅ Đã archive đúng |
| `archive/09_EATFITAI_BENCHMARK_EVIDENCE_2026-03-29.md` | ✅ Đã archive đúng |
| `archive/10_SUPABASE_RENDER_CLOUD_SETUP.md` | ⚠️ Cần review — nội dung cloud setup vẫn relevant |
| `archive/12_GEMINI_POOL_LIVE_ROLLOUT_2026-04-09.md` | ✅ Đã archive đúng |
| `archive/13_SCAN_DEMO_RELIABILITY_BUNDLE_2026-04-09.md` | ✅ Đã archive đúng |
| `archive/15_SCAN_DEMO_RELIABILITY_POST_EXECUTION_REVIEW.md` | ✅ Đã archive đúng |
| `archive/17_PULLER_HANDOFF_2026-04-14.md` | ✅ Đã archive đúng |
| `archive/21_SECURITY_LIVE_ROLLOUT_RUNBOOK_2026-04-16.md` | ✅ Đã archive đúng |
| `archive/22_SECURITY_AUTOMATION_EXECUTION_2026-04-16.md` | ✅ Đã archive đúng |
| `archive/23_SECURITY_LIVE_ROTATION_UPDATE_2026-04-16.md` | ✅ Đã archive đúng |
| `archive/25_CLOUD_PRODUCT_PROGRESS_2026-04-17.md` | ✅ Đã archive đúng |
| `archive/AI_DATASET_AND_MODEL_EVIDENCE.md` | ✅ Đã archive đúng |
| `archive/Bo_cuc_cua_bao_cao.md` | ✅ Report template |
| `archive/ENVIRONMENT_MANIFEST.example` | ✅ Reference manifest |
| `archive/EatFitAI_Admin_Documentation.md` | ✅ Future-facing admin blueprint |
| `archive/Hinh_thuc_trinh_bay_bao_cao.md` | ✅ Report formatting guide |
| `archive/JWT_CONFIGURATION.md` | ✅ Đã archive đúng |
| `archive/PLAN.md` | ✅ Old execution plan |
| `archive/QA_EATFITAI_FULL_APP_EVALUATION_2026-03-28.md` | ✅ Đã archive đúng |
| `archive/SECRETS_CHECKLIST.md` | ✅ Superseded by `SECRETS_SETUP.md` |
| `archive/data_sources.md` | ✅ Data source reference |
| `archive/task.md` | ✅ Old task tracker |
| `archive/yolo11-upgrade-research.md` | ✅ Research doc |
| `archive/analysis/*` (5 files) | ✅ Early-stage research |
| `archive/cleanup/*` (2 files) | ✅ Cleanup records |

---

## Cấu trúc docs mới đề xuất

Sau khi thực hiện, `docs/` sẽ có cấu trúc gọn:

```
docs/
├── README.md                          # Index & navigation guide (REWRITE)
├── 01_ARCHITECTURE_OVERVIEW.md        # System architecture (UPDATE)
├── 02_USERFLOW.md                     # User flows - viết lại (REWRITE)
├── 03_AI_FLOW.md                      # AI pipeline details (UPDATE)
├── SECRETS_SETUP.md                   # Secret management (UPDATE)
├── AUTH_AND_INFRA.md                   # Auth remediation + infra notes (NEW - merged)
├── TESTING_AND_RELEASE.md             # Test gates + runbook (NEW - merged from 24 + 18)
├── archive/                           # Historical snapshots, evidence
│   ├── 04_ENVIRONMENT_EXECUTION_PLAN.md     # ← moved from docs/
│   ├── 06_RUNTIME_AUDIT_SNAPSHOT_*.md       # ← moved from docs/
│   ├── 07_NOTION_PLAN_GAP_*.md              # ← moved from docs/
│   ├── 11_RESULT_E2E_PRODUCTION_SMOKE.md    # ← moved from docs/
│   ├── 16_AUTH_INFRA_INVESTIGATION_*.md     # ← moved from docs/
│   ├── 18_REAL_DEVICE_AUTH_RUNBOOK_*.md     # ← moved from docs/
│   └── ... (existing archived files)
└── templates/                         # UAT/rehearsal templates (giữ nguyên)
```

**Kết quả: từ 12 file active → 7 file active**, mỗi file có purpose rõ ràng.

---

## Chi tiết thực hiện

### Phase 1: Archive các snapshot docs (move files)

Di chuyển 5 file vào `docs/archive/`:
- `04_ENVIRONMENT_EXECUTION_PLAN.md`
- `06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md`
- `07_NOTION_PLAN_GAP_AND_2PERSON_RESTRUCTURE_2026-03-14.md`
- `11_RESULT_E2E_PRODUCTION_SMOKE.md`
- `16_AUTH_INFRA_INVESTIGATION_2026-04-14.md`
- `18_REAL_DEVICE_AUTH_RUNBOOK_AND_GOOGLE_REMEDIATION_2026-04-15.md`

### Phase 2: Tạo docs mới bằng cách merge

#### `AUTH_AND_INFRA.md` (NEW)
Gộp từ:
- Phần "Fix Plan" (phases 0-6) từ `16_AUTH_INFRA_INVESTIGATION`
- Phần Google credentials guide từ `18_REAL_DEVICE_AUTH_RUNBOOK`
- Phần "Infra Contradictions" từ `16_AUTH_INFRA_INVESTIGATION`
- Cập nhật status: Google sign-in đã fix, forgot-password đã verify

#### `TESTING_AND_RELEASE.md` (NEW)
Gộp từ:
- Toàn bộ `24_PRODUCT_RELEASE_TEST_PLAN` (gate commands, Maestro suites)
- Phần runbook vận hành từ `18_REAL_DEVICE_AUTH_RUNBOOK` (device attach, Metro, Appium)
- Smoke production procedures từ `11_RESULT_E2E_PRODUCTION_SMOKE`

### Phase 3: Cập nhật docs hiện có

#### Root `README.md`
- Sửa tất cả absolute paths (`D:/`, `E:/`) → relative paths
- Rút gọn "Environment helper docs" section — chỉ link tới 3-4 doc chính
- Thêm "Current project status" section ngắn gọn

#### Root `SETUP_GUIDE.md`
- Section 2: Thay `Smtp:*` keys bằng `Brevo:*` keys
- Merge nội dung useful từ `04_ENVIRONMENT_EXECUTION_PLAN.md` (ports, quick commands)
- Sửa paths

#### `docs/README.md`
- Viết lại index theo cấu trúc mới 7-file
- Bỏ references đến file đã archived

#### `docs/01_ARCHITECTURE_OVERVIEW.md`
- Cập nhật errata sections
- Sửa Voice AI flow diagrams
- Cập nhật deployment topology (Render branch, Supabase)

#### `docs/03_AI_FLOW.md`
- Cập nhật Gemini key pool architecture
- Sửa Ollama-only references → hybrid cloud/local
- Cập nhật scan benchmark results

#### `docs/02_USERFLOW.md`
- Viết lại dựa trên runtime evidence thực tế (không dùng bản 2025-12 cũ)
- Chỉ map các flows đã có evidence working

#### `docs/SECRETS_SETUP.md`
- Sửa paths `E:\tool edit\` → relative
- Merge Google credentials setup từ doc 18

### Phase 4: Verification

- Kiểm tra tất cả internal links giữa các docs
- Kiểm tra không còn absolute paths
- Kiểm tra mỗi file có `Cập nhật: YYYY-MM-DD` header

---

## User Review Required

> [!IMPORTANT]
> **Cần quyết định trước khi thực hiện:**

1. **Ngôn ngữ**: Docs hiện tại mix Vietnamese không dấu + có dấu + English. Muốn chuẩn hóa thế nào?
   - Option A: Vietnamese có dấu cho tất cả (consistency)
   - Option B: English headers + Vietnamese body (international-ready)
   - Option C: Giữ nguyên mix (least effort)

2. **`archive/10_SUPABASE_RENDER_CLOUD_SETUP.md`**: File này có thông tin cloud setup vẫn relevant (Brevo config, Supavisor ports). Muốn pull ngược lại thành active doc hay giữ trong archive?

3. **`02_USERFLOW.md` rewrite**: File này 629 dòng, viết từ 2025-12. Muốn tôi viết lại hoàn toàn dựa trên runtime evidence, hay chỉ update sections bị stale?

4. **Rename convention**: Bỏ prefix số `01_`, `02_`, `03_` hay giữ lại? 
   - Bỏ → tên file descriptive hơn (`ARCHITECTURE.md`)
   - Giữ → maintain reading order

---

## Verification Plan

### Automated
```powershell
# Kiểm tra không còn absolute paths trong docs
Select-String -Path "d:\EatFitAI_v1\docs\*.md" -Pattern "[A-Z]:\\[^$]" -SimpleMatch
Select-String -Path "d:\EatFitAI_v1\README.md" -Pattern "[A-Z]:\\[^$]" -SimpleMatch
Select-String -Path "d:\EatFitAI_v1\SETUP_GUIDE.md" -Pattern "[A-Z]:\\[^$]" -SimpleMatch

# Kiểm tra internal links không broken
Select-String -Path "d:\EatFitAI_v1\docs\*.md" -Pattern "\]\(.*\.md\)" | ForEach-Object { ... }
```

### Manual
- Đọc lại `docs/README.md` index và verify từng link
- Confirm mỗi active doc có timestamp header
- Spot-check `SETUP_GUIDE.md` secret keys section
