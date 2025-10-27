# TODO: Remove Identity - Switch to SP + Dapper

This document tracks the Identity removal tasks and their status.

## Done

### Phase 1: Stored Procedures
- [x] 110_sp_Auth_DangKy.sql - Register new user
- [x] 111_sp_Auth_DangNhap.sql - Get user by email
- [x] 112_sp_Auth_LayTheoId.sql - Get user by ID

### Phase 2: Auth Repository
- [x] IAuthRepository interface
- [x] AuthRepository implementation with Dapper

### Phase 3: Program.cs
- [x] Removed Identity configuration (AddIdentityCore, AddEntityFrameworkStores, SignInManager)
- [x] Added IAuthRepository registration
- [x] Removed Microsoft.AspNetCore.Identity usages

### Phase 4: Dependencies
- [x] Removed Microsoft.AspNetCore.Identity.EntityFrameworkCore from Infrastructure.csproj
- [x] Added BCrypt.Net-Next

### Phase 5: AuthController
- [x] Replaced UserManager/SignInManager with IAuthRepository
- [x] Implemented Register with custom validation
- [x] Implemented Login with password verification
- [x] Implemented Google login
- [x] Updated GetUserFromAccessTokenAsync
- [x] Added helpers: ValidatePassword, HashPassword, VerifyPassword
- [x] Switched password hashing to BCrypt (salted, secure)

## Current Status

- [x] BCrypt-based hashing/verification is active in `src/EatFitAI.Api/Controllers/AuthController.cs`
- [x] Identity removed from startup; `IAuthRepository` registered in DI
- [x] EF migrations referencing Identity removed
- [x] New baseline migration generated to match custom schema: `InitialCustomSchema`
  - Path: `eatfitai-backend/src/EatFitAI.Infrastructure/Migrations/*_InitialCustomSchema.cs`
  - Creates tables with expected columns (e.g., `NguoiDung.MatKhauHash` varbinary)

## Next Steps

### Step 1: Build and run API
```bash
cd eatfitai-backend
dotnet build
dotnet run --project src/EatFitAI.Api
```

The API applies EF migrations on startup and then applies SP scripts.

### Step 2: Test endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- POST /api/auth/refresh
- POST /api/auth/logout

### Step 3: Mobile app sanity check
- Run backend + mobile app
- Verify register/login/google flows

## Goals

- Backend has no dependency on Identity
- Auth fully SP + Dapper
- Passwords hashed securely with BCrypt
- Mobile app continues to work without API contract changes
- Compliant with RULES.md: "SP-first + Dapper; EF schema-only"

