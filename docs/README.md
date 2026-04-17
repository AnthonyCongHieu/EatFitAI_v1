# EatFitAI Documentation Index

Cap nhat: `2026-03-14`

Thu muc `docs/` la noi tap trung cac tai lieu ky thuat, runtime audit, va tai lieu doi chieu de phuc vu coding, demo, va bao ve.

## Tai lieu nen doc truoc

1. `01_ARCHITECTURE_OVERVIEW.md`
   - Snapshot hien trang he thong mobile, backend, AI provider, SQL.
   - Dung khi can nam nhanh kien truc va boundary hien tai.

2. `02_USERFLOW.md`
   - Ban do user flow va man hinh chinh cua app.
   - Dung khi can doi chieu mot flow UI voi backend/API.

3. `03_AI_FLOW.md`
   - Luong AI vision, nutrition, voice, fallback.
   - Dung khi can hieu lane AI va cac diem trust/risk.

## Tai lieu moi nhat phuc vu thuc thi

4. `04_ENVIRONMENT_EXECUTION_PLAN.md`
   - Ke hoach va quy uoc setup moi truong Windows, emulator-first, Appium lane.
   - Dung khi dung lai local stack, bo tri storage, va preflight.

5. `11_RESULT_E2E_PRODUCTION_SMOKE.md`
   - Lane smoke production cho flow Result E2E qua Render backend/Supabase.
   - Dung khi can verify recovery cloud ma khong doi default local lane.

6. `06_RUNTIME_AUDIT_SNAPSHOT_2026-03-14.md`
   - Snapshot runtime audit moi nhat tren native Android build.
   - Dung khi can biet app hien tai chay duoc flow nao, flow nao vo, blocker nao dang ton tai.

7. `07_NOTION_PLAN_GAP_AND_2PERSON_RESTRUCTURE_2026-03-14.md`
   - Ban doi chieu giua runtime audit, Notion task hien tai, va SQL truth.
   - Dung khi can co cau lai backlog, chia viec cho 2 nguoi, va quyet dinh scope.

8. `16_AUTH_INFRA_INVESTIGATION_2026-04-14.md`
   - Tong hop tinh hinh Google sign-in, email delivery, va auth infra.
   - Dung khi can doi chieu auth voi backend/env/infra.

9. `18_REAL_DEVICE_AUTH_RUNBOOK_AND_GOOGLE_REMEDIATION_2026-04-15.md`
   - Runbook van hanh auth tren thiet bi Android that qua USB.
   - Co huong dan lay Google credentials/files, note bug, workaround, va ke hoach fix toan dien.
   - Dung khi can test lai forgot/reset/google ma khong muon di do lane tu dau.

10. `24_PRODUCT_RELEASE_TEST_PLAN_2026-04-16.md`
   - Ke hoach gate test product-grade moi nhat cho workspace, Android automation, real device, va cloud verify.
   - Dung khi can chot release readiness theo mot runbook duy nhat.

## Thu muc phu

- `archive/`
  - Luu cac bao cao lich su, evidence bundles, cleanup inventory, va tai lieu da duoc dua ra khoi luong execution hang ngay.
- `templates/`
  - Luu cac template dung lai cho rehearsal, UAT, va bao cao.

## Cach dung bo tai lieu nay

- Neu can dung moi truong va test app: doc `04` truoc.
- Neu can verify production Result flow: doc `11`.
- Neu can chot release gate va evidence bundle product-grade: doc `24`.
- Neu can biet app hien tai dung o dau: doc `06`.
- Neu can chia viec, cat scope, va sap lai Notion: doc `07`.
- Neu can van hanh auth tren may that va chot Google/reset mail: doc `18`.
- Neu can biet he thong duoc xay nhu the nao: doc `01`, `02`, `03`.

## Nguyen tac cap nhat

1. Runtime va database truth uu tien hon cam giac demo.
2. Tai lieu moi phai noi ro pham vi va ngay cap nhat.
3. Khong tao them file trung muc dich neu co the cap nhat vao `04`, `06`, `07`.
