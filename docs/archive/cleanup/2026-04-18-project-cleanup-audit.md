# Whole-Project Cleanup Audit

Date: `2026-04-18`

## Summary

This audit covered:

- all git-tracked files in `D:\EatFitAI_v1`
- the generated local roots `_logs/`, `_state/`, `artifacts/`, `eatfitai-mobile/.expo/`, `eatfitai-backend/bin/`, and `eatfitai-backend/obj/`
- exclusion of `node_modules/` and other vendored dependency trees

The inventory is stored in:

- `docs/cleanup/2026-04-18-project-cleanup-inventory.csv`

Inventory scope was implemented as:

- one row per tracked repo file
- one row per selected generated root directory

This keeps the cleanup backlog actionable while still covering the agreed scope. Generated roots were audited at directory-root level because the recommended action is uniform across their descendants.

## Inventory Totals

Total inventory rows: `738`

| Action | Count |
| --- | ---: |
| `SECURITY_QUARANTINE` | 3 |
| `DELETE_NOW` | 7 |
| `ARCHIVE_OR_MOVE` | 26 |
| `FIX_OR_REPLACE` | 12 |
| `VERIFY_FIRST` | 25 |
| `KEEP_ACTIVE` | 665 |

Area distribution:

| Area | Count |
| --- | ---: |
| `root` | 31 |
| `docs` | 35 |
| `backend` | 253 |
| `mobile` | 338 |
| `ai-provider` | 21 |
| `tools` | 44 |
| `scripts` | 3 |
| `workspace-meta` | 7 |
| `generated` | 6 |

## Method

For each in-scope path, the audit recorded:

- subsystem area
- file kind
- tracked vs generated status
- reference evidence from manifests, docs, path conventions, or explicit no-ref findings
- last signal using filename date and/or filesystem mtime
- risk, confidence, and recommended cleanup action

Extra review passes were applied for:

- hardcoded secret candidates
- machine-specific absolute Windows paths
- demo/smoke artifact drift
- legacy training/data lanes disconnected from current runtime
- heuristic dead-component candidates in the mobile source tree
- mojibake/encoding risk

## Key Findings

### Wave 1: Security Quarantine

The highest-risk tracked items are:

- `test_db.py`
- `test_db2.py`
- `test_db3.py`

Why these were quarantined immediately:

- they are root-level loose scripts
- they have no tracked references outside themselves
- they contain hardcoded database credentials

Required follow-up:

- rotate any still-valid credential material
- remove these files from tracked history in the next security batch if not already covered by a separate history rewrite plan
- replace ad hoc connectivity tests with env-driven or secret-store-driven tooling only

No other tracked file in this audit surfaced the same hardcoded DB password string.

### Wave 2: Generated Local Clutter

The selected generated roots are all safe `DELETE_NOW` candidates.

| Path | Descendant files | Latest generated signal |
| --- | ---: | --- |
| `_logs/` | 130 | `2026-04-17` |
| `_state/` | 0 | `2026-04-16` |
| `artifacts/` | 5 | `2026-04-18` |
| `eatfitai-mobile/.expo/` | 2 | `2026-04-16` |
| `eatfitai-backend/bin/` | 572 | `2026-04-18` |
| `eatfitai-backend/obj/` | 52 | `2026-04-18` |

These are reproducible local outputs and should not remain part of any long-lived cleanup discussion once deleted.

### Wave 3: Docs And Runbook Drift

The docs problem is not that the repo lacks documentation. The problem is that documentation has split into:

- canonical docs that are still useful
- historical evidence bundles and handoff notes
- active docs polluted by workstation-specific `D:/` or `E:/` links

Highest-value `FIX_OR_REPLACE` items in this wave:

- `README.md`
- `SETUP_GUIDE.md`
- `docs/01_ARCHITECTURE_OVERVIEW.md`
- `docs/16_AUTH_INFRA_INVESTIGATION_2026-04-14.md`
- `docs/18_REAL_DEVICE_AUTH_RUNBOOK_AND_GOOGLE_REMEDIATION_2026-04-15.md`
- `docs/24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md`
- `docs/SECRETS_SETUP.md`

These should stay, but their machine-specific absolute links should be replaced with repo-relative references.

Strong `ARCHIVE_OR_MOVE` candidates in docs:

- dated evidence bundles: `docs/13_*`, `docs/15_*`, `docs/17_*`, `docs/21_*`, `docs/22_*`, `docs/23_*`, `docs/25_*`
- historical comparative reports: `docs/08_*`, `docs/09_*`, `docs/QA_EATFITAI_FULL_APP_EVALUATION_2026-03-28.md`
- `docs/analysis_reports/*`
- `docs/EatFitAI_Admin_Documentation.md`

These are better kept as archive/history material than as top-level active working docs.

Important keepers:

- `docs/README.md`
- `docs/templates/scan-demo-rehearsal-template.md`
- `docs/templates/scan-demo-uat-cases.csv`
- `docs/templates/scan-demo-uat-report-template.md`

### Wave 4: Demo, Smoke, And Release Evidence Lanes

Current scan-demo and release-verification lanes are still live enough to avoid blunt cleanup:

- `seed-scan-demo.ps1` is still referenced by scan-demo docs and backend seeding flow
- `tools/appium/fixtures/scan-demo/*` is still tied to production-smoke preflight and manifest templates
- `eatfitai-mobile/.maestro/*` remains the main happy-path automation lane
- `tools/appium/cloud-proof.android.js`, `sanity.android.js`, and `edge.android.js` remain wired into current release and diagnostic flows

One concrete cleanup candidate exists here:

- `tools/appium/smoke.android.js` -> `VERIFY_FIRST`

Reason:

- `tools/appium/package.json` maps `smoke:android` to `sanity.android.js`
- no tracked script or doc entry point points to `smoke.android.js`
- this looks like a duplicate/abandoned script name rather than an active lane

### Wave 5: Legacy Training And Data Utilities

There are two separate training-related lanes in this repo:

1. the live AI provider runtime under `ai-provider/`
2. an older root-level training/data lane

The root-level lane should be removed from the workspace root or archived elsewhere:

- `1_download_data.py`
- `2_merge_dataset.py`
- `3_train_eatfit_v2.py`
- `data_sources.md`
- `master_classes.json`

Why:

- these are not part of the current `ai-provider/app.py` runtime path
- they are mainly surfaced by `docs/yolo11-upgrade-research.md`
- they carry drift and encoding-risk baggage without being part of the active serving path

The `ai-provider/` training helpers are not safe delete-now targets, but they do need review:

- `ai-provider/continue_training.py`
- `ai-provider/download_model.py`
- `ai-provider/export_model.py`
- `ai-provider/train_local.py`
- `ai-provider/TRAINING_GUIDE.md`
- `ai-provider/upload_model.py`

These belong in `VERIFY_FIRST`, not `DELETE_NOW`, because they may still be used for model iteration even though they are not runtime entrypoints.

The fallback model artifact should stay:

- `ai-provider/yolov8s.pt`

Reason:

- `ai-provider/app.py` still loads it as the fallback model
- `tools/dev/Invoke-DevPreflight.ps1` still checks for it

## Dead-Component Pass

A heuristic no-ref scan on the mobile source tree found a small group of candidates that deserve manual review:

- `eatfitai-mobile/src/components/auth/GoogleSignInButton.tsx`
- `eatfitai-mobile/src/components/ui/AiSummaryBar.tsx`
- `eatfitai-mobile/src/components/ui/AvatarPicker.tsx`
- `eatfitai-mobile/src/components/ui/FilterChip.tsx`
- `eatfitai-mobile/src/components/ui/FoodEntryCard.tsx`
- `eatfitai-mobile/src/components/ui/LoadingOverlay.tsx`
- `eatfitai-mobile/src/components/ui/MacroProgressCard.tsx`
- `eatfitai-mobile/src/components/ui/MetricCard.tsx`
- `eatfitai-mobile/src/components/ui/OptionSelector.tsx`
- `eatfitai-mobile/src/components/ui/PressableScale.tsx`
- `eatfitai-mobile/src/components/ui/QuickRating.tsx`
- `eatfitai-mobile/src/components/ui/ScreenHeader.tsx`
- `eatfitai-mobile/src/constants/designSystem.ts`
- `eatfitai-mobile/src/hooks/useHaptics.ts`

These were placed in `VERIFY_FIRST`, not marked dead, because the scan was intentionally conservative:

- no textual refs outside self were found
- they are not route files or obvious entrypoints
- React Native projects can still hide usage behind re-export or naming drift, so deletion should wait for a second pass

Files explicitly *not* treated as dead:

- `eatfitai-mobile/src/types/*.d.ts` ambient type declarations
- `eatfitai-mobile/src/i18n/vi.test.ts`
- backend `DbScaffold`
- `.maestro` automation flows

## Encoding And Text Safety

The current mojibake detector reported one hit:

- `eatfitai-mobile/src/i18n/vi.test.ts`

That hit is a false positive. The file intentionally contains the replacement character in an assertion that verifies bad text is absent.

Cleanup implication:

- `scripts/cloud/check_mojibake.py` should move to `FIX_OR_REPLACE`
- the detector needs a narrow whitelist or logic adjustment for test fixtures/assertions

This audit did not find a second high-confidence mojibake cluster in repo-owned UTF-8 text. Some older docs still show style drift or ASCII-only Vietnamese transliteration, but that is not the same thing as confirmed UTF-8 corruption.

## Prioritized Backlog

### `SECURITY_QUARANTINE`

- Remove and rotate around `test_db.py`, `test_db2.py`, `test_db3.py`.

### `DELETE_NOW`

- Delete generated local roots: `_logs/`, `_state/`, `artifacts/`, `eatfitai-mobile/.expo/`, `eatfitai-backend/bin/`, `eatfitai-backend/obj/`.
- Delete `commit_backend.txt`.

### `ARCHIVE_OR_MOVE`

- Move root planning/report-format notes out of the repo root: `PLAN.md`, `task.md`, `Bo_cuc_cua_bao_cao.md`, `Hinh_thuc_trinh_bay_bao_cao.md`.
- Move the legacy root-level training/data lane out of the repo root.
- Archive historical evidence and analysis docs now that canonical docs exist.

### `FIX_OR_REPLACE`

- Replace absolute workstation paths in `README.md`, `SETUP_GUIDE.md`, and the canonical docs that still use local-drive links.
- Repair `docs/SECRETS_SETUP.md` so it keeps its content but stops depending on `E:/...` references.
- Parameterize machine-specific helper defaults in:
  - `sync-ai-provider-model.ps1`
  - `ai-provider/download_dataset.py`
  - `tools/dev/Relocate-WindowsDevStorage.ps1`
  - `tools/security-ops/targets.json`
- Fix `scripts/cloud/check_mojibake.py` so the current test assertion no longer trips the detector.

### `VERIFY_FIRST`

- Review the `ai-provider/` training helper lane before relocating it.
- Review `docs/10_SUPABASE_RENDER_CLOUD_SETUP.md`, `docs/AI_DATASET_AND_MODEL_EVIDENCE.md`, and `docs/yolo11-upgrade-research.md` for whether they belong in active docs or archive.
- Review `eatfitai-backend/DEV-RUN-GUIDE.md` against `SETUP_GUIDE.md`.
- Confirm whether the 14 mobile dead-component candidates are truly unused.
- Confirm whether `tools/appium/smoke.android.js` is redundant.

## DO_NOT_TOUCH_YET

- `eatfitai-backend/DbScaffold/`
- `ai-provider/yolov8s.pt`
- `seed-scan-demo.ps1`
- `tools/appium/fixtures/scan-demo/`
- `eatfitai-mobile/.maestro/`
- `start-mobile.ps1`
- `start-mobile-local.ps1`
- `start-stack.ps1`

## Validation Notes

- The inventory file was generated fresh from the current workspace and includes `738` rows.
- The generator script compiled successfully with `python -m py_compile`.
- The current mojibake scan still needs a detector fix because of the `vi.test.ts` false positive.
- No runtime code or public API contract was changed during this audit pass.
