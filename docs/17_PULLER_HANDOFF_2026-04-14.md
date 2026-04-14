# Puller Handoff 2026-04-14

## Muc tieu tai lieu

Tai lieu nay danh cho nguoi vua `git pull` nhanh branch hien tai va can biet:

- thay doi nao dang ton tai tren branch hien tai hoac worktree vua duoc commit
- thay doi nao da hoan thanh o muc code / schema / API
- thay doi nao moi o muc dang lam, chua duoc xac thuc day du
- can canh gi khi chay lai backend, mobile, tooling, va khi tiep tuc implement

Trang thai hien tai duoc tong hop tu worktree branch:

- `hieu_deploy/production`

## Pham vi trang thai branch hien tai

Trang thai branch hien tai gom 4 cum thay doi chinh:

1. Admin governance va policy-based authorization o backend
2. Auth service duoc noi voi access-state / capability model moi
3. Tooling Appium duoc tang do ben khi test tren may that
4. Tai lieu dieu tra auth + infra duoc bo sung

## 1. Admin governance / backend progress

### Da co trong code

- Bo sung model `UserAccessControl` de tach `access_state` khoi `User.Role`
- Bo sung `AdminCapabilities`, `AdminPolicies`, `PlatformRoles`, `AdminAccessStates`
- Bo sung `AdminClaimsTransformation` de nap capability claims tu DB vao principal dang nhap
- `Program.cs` da dang ky policy authorization moi
- `Program.cs` da goi `AdminGovernanceBootstrapper.EnsureSchemaAsync()` khi startup
- `AdminGovernanceBootstrapper` tu tao bang `UserAccessControl` neu chua ton tai
- `AdminGovernanceBootstrapper` bo sung cac cot moi cho `AdminAuditEvent` neu chua ton tai
- `AdminAuditService` da ghi duoc them:
  - `ActorId`
  - `ActorEmail`
  - `EffectiveRole`
  - `CapabilitySnapshot`
  - `Severity`
  - `CorrelationId`
  - `Environment`
  - `DiffSummary`
  - `Justification`
- `RequestLoggingMiddleware` da them `X-Request-Id` va `X-Correlation-Id`
- `AdminController` da chuyen tu `[Authorize(Roles = "Admin")]` sang policy-based access

### Endpoint / behavior moi da co

- `GET /api/admin/session`
  - tra session admin hien tai, role, access state, capability list
- `GET /api/admin/mutations`
  - tra mutation registry cho frontend governance UI
- `GET /api/admin/support/users/{id}/overview`
  - tong hop user, recent meals, recent corrections, recent audit events
- `GET /api/admin/inbox`
  - tong hop su kien can xu ly cho admin
- `PUT /api/admin/users/{id}/access-state`
  - workflow chinh de suspend / restore / deactivate user
- `POST /api/admin/users/{id}/deactivate`
  - shortcut de deactivate qua workflow co governance

### Endpoint cu da bi siet lai

- Nhieu admin controllers da doi sang policy chi tiet:
  - runtime
  - audit
  - meals
  - foods
  - master data
- `DELETE /api/admin/users/{id}` da bi block, khong con hard-delete legacy
- `PUT /api/admin/users/{id}/suspend` van con, nhung da bi day ve kieu legacy toggle va co canh bao dung workflow moi

### Y nghia hien tai

- Admin khong con duoc xem la 1 role duy nhat
- Quyen dang bat dau chuyen sang kieu capability-based
- Access state va role dang duoc tach ra ro hon
- Audit trail da day hon va phu hop de lam governance UI / support UI

## 2. Auth progress

### Da co trong code

- `AuthService` da inject them `ApplicationDbContext`
- Login da check `UserAccessControl.AccessState`
- Neu account khong `active`, login bi tu choi
- JWT da gan:
  - normalized platform role
  - access state
  - full capability claim set cho admin roles
- `User.Role` da duoc normalize ve lowercase authority model moi
- Unit test `AuthServiceTests` da duoc cap nhat de tao them `ApplicationDbContext`

### Chua xong / can luu y

- Password reset van dang dua vao `IMemoryCache`
  - chay duoc tren 1 instance
  - chua an toan cho restart / multi-instance
- Google sign-in chua duoc sua trong commit nay
  - mobile config chua day du
  - backend production chua co Google client IDs

Chi tiet phan nay duoc ghi rieng trong:

- [16_AUTH_INFRA_INVESTIGATION_2026-04-14.md](E:/tool edit/eatfitai_v1/docs/16_AUTH_INFRA_INVESTIGATION_2026-04-14.md)

## 3. Appium / device testing progress

### Da co trong code

- `tools/appium/lib/common.js` da duoc nang cap de ben hon khi tap tren may that
- Ho tro:
  - `APPIUM_AUTOMATION_NAME`
  - `mobile: clickGesture`
  - pointer actions tap fallback
  - adb tap fallback tot hon
  - optional keystore config cho Appium neu can
- Selector candidate da co path rieng cho Espresso neu can chuyen automation backend

### Y nghia hien tai

- Tooling test Android dang de dung tren may that hon truoc
- Day la tang on dinh cho automation, khong phai da co full E2E suite moi

## 4. Tai lieu duoc bo sung

Da co them:

- [16_AUTH_INFRA_INVESTIGATION_2026-04-14.md](E:/tool edit/eatfitai_v1/docs/16_AUTH_INFRA_INVESTIGATION_2026-04-14.md)
- [17_PULLER_HANDOFF_2026-04-14.md](E:/tool edit/eatfitai_v1/docs/17_PULLER_HANDOFF_2026-04-14.md)

## 5. File / khu vuc thay doi chinh

### Backend admin / governance

- `eatfitai-backend/Controllers/AdminController.cs`
- `eatfitai-backend/Controllers/AdminAIController.cs`
- `eatfitai-backend/Controllers/AdminAuditController.cs`
- `eatfitai-backend/Controllers/AdminMasterDataController.cs`
- `eatfitai-backend/Controllers/AdminMealController.cs`
- `eatfitai-backend/Controllers/AdminRuntimeController.cs`
- `eatfitai-backend/DTOs/Admin/AdminDto.cs`
- `eatfitai-backend/DTOs/Admin/AdminAuditDtos.cs`
- `eatfitai-backend/DTOs/Common/ApiResponse.cs`
- `eatfitai-backend/Services/AdminAuditService.cs`
- `eatfitai-backend/Services/AdminGovernanceBootstrapper.cs`
- `eatfitai-backend/Security/AdminCapabilities.cs`
- `eatfitai-backend/Security/AdminClaimsTransformation.cs`
- `eatfitai-backend/Models/UserAccessControl.cs`
- `eatfitai-backend/Models/AdminAuditEvent.cs`
- `eatfitai-backend/Program.cs`
- `eatfitai-backend/Data/ApplicationDbContext.cs`

### Auth / user model

- `eatfitai-backend/Services/AuthService.cs`
- `eatfitai-backend/Tests/Unit/Services/AuthServiceTests.cs`
- `eatfitai-backend/DbScaffold/Data/EatFitAIDbContext.cs`
- `eatfitai-backend/DbScaffold/Models/User.cs`
- `eatfitai-backend/Models/User.cs`

### Tooling / mobile

- `tools/appium/lib/common.js`
- `eatfitai-mobile/package-lock.json`

## 6. Tinh trang hien tai

### Da xong o muc implementation

- capability model co code
- policy model co code
- admin session / inbox / support overview co code
- access-state workflow co code
- audit enrichment co code
- startup bootstrap schema co code
- Appium tap fallback co code
- auth/infra investigation doc co bang chung live

### Da xong o muc behavior review nhung chua xac thuc full

- auth token claim model moi
- role normalization
- login block voi user suspended / deactivated
- audit fields moi len DB

### Chua xong / chua duoc xem la production-ready

- chua co migration EF chinh quy; dang bootstrap bang SQL luc startup
- chua co xac nhan full frontend admin da match voi mutation / inbox / session contract moi
- chua co xac nhan full regression cho tat ca admin endpoints
- password reset multi-instance issue chua duoc sua
- Google sign-in production chua duoc sua
- van con package-lock drift, nhung khong thay doi package manifest trong snapshot nay

## 7. Can luu y khi pull code ve

### 7.1 Khong nen mac dinh xem branch nay la da on dinh production

Ly do:

- phan admin governance dang la mot dot nang cap lon
- co thay doi auth claim model
- co schema bootstrap runtime
- co thay doi endpoint contract o admin layer

### 7.2 Khi chay backend

Can kiem tra:

- startup co tao / cap nhat `UserAccessControl` thanh cong khong
- startup co bo sung cot audit moi thanh cong khong
- token dang nhap cua admin co nhan claims moi khong
- admin role trong DB co gia tri dung theo he lowercase moi khong

### 7.3 Khi test admin API

Nen test toi thieu:

1. `GET /api/admin/session`
2. `GET /api/admin/mutations`
3. `GET /api/admin/users`
4. `GET /api/admin/inbox`
5. `GET /api/admin/support/users/{id}/overview`
6. `PUT /api/admin/users/{id}/role`
7. `PUT /api/admin/users/{id}/access-state`
8. runtime endpoints co policy moi

### 7.4 Khi test auth

Nen test toi thieu:

1. login user active
2. login user suspended
3. login user deactivated
4. forgot-password
5. reset-password
6. verify email
7. Google sign-in

Luu y:

- Google sign-in du kien van fail cho toi khi mobile env + native config + Render env duoc dien day du

## 8. Ranh gioi giua "da commit" va "can lam tiep"

### Da ton tai tren branch hien tai

- governance backend foundation
- policy authorization foundation
- audit enrichment foundation
- access-state foundation
- Appium tap resiliency improvement
- auth/infra investigation documentation

### Can lam tiep ngay sau khi pull

1. Review lai contract frontend admin voi endpoint moi
2. Chot migration strategy thay vi bootstrap SQL thuan runtime
3. Sua password-reset sang shared persistence
4. Sua Google sign-in end-to-end
5. Chay full regression auth + admin
6. Doi chieu lai Render / Supabase / mobile env source-of-truth

## 9. Tinh trang kiem thu cho snapshot nay

Trang thai xac thuc hien tai:

- chua co bang chung trong snapshot nay cho full automated test pass
- can xem commit nay la snapshot tien do co tai lieu handoff, khong phai release candidate
- verification quan trong nhat hien co nam trong tai lieu dieu tra auth/infra

Neu nguoi pull code ve can tiep tuc an toan, thu tu uu tien nen la:

1. xac thuc startup bootstrap schema
2. xac thuc admin session va claims
3. xac thuc access-state workflow
4. xac thuc auth regression
5. moi tiep tuc frontend admin hoac rollout

## 10. Ghi chu thuc te

- Lan push nay dong goi phan worktree con lai cung tai lieu handoff, trong khi branch hien tai da san co mot so thay doi lon tu cac buoc truoc do
- Co cac thay doi lon khong bat dau trong luot lam viec nay, nhung van duoc dong goi chung theo yeu cau snapshot
- Neu can tach thanh cac commit sach hon sau nay, nen tach lai theo cum:
  - admin-governance
  - auth-role-access-state
  - appium-tooling
  - docs

