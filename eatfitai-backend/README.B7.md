Backend Notes: Docker, Run, Seed, Tests

Run (local)

- Prereqs: .NET 9 SDK, SQL Server (or use docker compose)
- Configure env (optional): create `.env` in repo root `eatfitai-backend/.env`
  - `ConnectionStrings__Default=Server=YOUR_SQL,1433;Database=EatFitAIDb;User Id=sa;Password=...;TrustServerCertificate=True;`
  - `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` (optional; defaults provided for dev)
- Run: `dotnet run --project src/EatFitAI.Api`
- Swagger: `/swagger`, Health: `/health`

Docker

- `cd ops && docker compose up --build`
- API: `http://localhost:8080` ; SQL: `localhost,14333` (sa / from `SA_PASSWORD`)

Seed

- Seed runs automatically on startup (EnsureCreated + seed refs + create views on SQL Server).
- Reference seed: `LoaiBuaAn`, `MucDoVanDong`, `MucTieu`, `ThucPham` (>=15 VN samples)

Tests

- Integration tests: `dotnet test` (WebApplicationFactory)
- Uses SQLite for Testing environment; automatic seed enabled
- Covers: Auth (register/login/refresh), Diary (compute macros), Summary (day/week)

Postman

- Collection: `ops/postman_collection.json`
- Set `{{baseUrl}}` then run Register → Login → Diary → Summary.

