**EatFitAI Backend (Clean Architecture)**

- Tech: .NET 9, Minimal API, Serilog, OpenAPI 3.1, HealthChecks
- Structure:
  - `src/EatFitAI.Api` (API layer)
  - `src/EatFitAI.Application` (Use cases)
  - `src/EatFitAI.Domain` (Entities, Value Objects)
  - `src/EatFitAI.Infrastructure` (External: DB, integrations)
  - `tests/EatFitAI.Tests` (Unit tests)
  - `ops` (docker-compose, postman collection)
  - `seed` (data seeding placeholder)

---

Getting Started

- Prerequisites:
  - .NET SDK 9.0+
  - (Optional) Docker 24+

- Restore & Build:
  - `dotnet restore`
  - `dotnet build`

- Run API (dev):
  - `dotnet run --project src/EatFitAI.Api`
  - Swagger UI: `http://localhost:<port>/swagger`
  - OpenAPI JSON: `http://localhost:<port>/openapi/v1.json` (OpenAPI 3.1)
  - Health: `http://localhost:<port>/health`
  - Ping: `http://localhost:<port>/ping`

  Note: `<port>` do Kestrel sinh, xem log khi chạy (ví dụ `5189`).

- Run via Docker (optional):
  - `cd ops`
  - `docker compose up --build`
  - API: `http://localhost:8080`

---

Design Notes

- Nullable + Analyzers + Warnings-as-errors (trừ `CS1591`) nhằm giữ chất lượng mã.
- Serilog (console) để quan sát logs trong dev/CI/CD.
- CORS cho `http://localhost:19006` (web dev) và `exp://*` (Expo React Native) qua `SetIsOriginAllowed`.
- OpenAPI 3.1 được sinh bởi `Microsoft.AspNetCore.OpenApi` và hiển thị bằng Swagger UI tại `/swagger`.
- HealthChecks tối giản `/health` để monitoring.

