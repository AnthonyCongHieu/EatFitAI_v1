# EatFitAI Admin Browser Testing Plan

## Tasks:
- [x] Navigate to http://localhost:3000/login
- [ ] Login with `admin@eatfit.ai` / `Admin@123456`
- [ ] Verify Dashboard UI
- [ ] Verify "Quản lý Khóa Gemini" (Gemini Keys) page (/gemini-keys)
- [ ] Verify "Người dùng" (Users) page (/users)
- [ ] Report and fix any errors found

## Observations:
- Login status: Fails with "Database error querying schema" (Supabase 500).
- Dashboard status: Not accessible due to login failure.
- Gemini Keys status: Not accessible.
- Users status: Not accessible.
- Backend status (localhost:5247): **CONNECTION REFUSED** (Backend is not running).

## Findings:
- Console log shows `Failed to load resource: the server responded with a status of 500 ()` for `https://bjlmndmafrajjysenpbm.supabase.co/auth/v1/token?grant_type=password`.
- Toast message "Database error querying schema" appears on login attempt.
- The backend Swagger/API at `http://localhost:5247` is unreachable.
- Frontend hydrated with some mismatches but seems functional otherwise.
