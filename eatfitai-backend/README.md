# EatFitAI Backend

Backend duoc to chuc theo clean architecture (Domain -> Application -> Infrastructure -> Api).

## Yeu cau
- .NET 8 SDK

## Cach chay
`ash
dotnet restore
dotnet build
dotnet run --project src/EatFitAI.Api/EatFitAI.Api.csproj
`

API se mo tai http://localhost:5000 (hoac port neu thay doi). Swagger co san tai /swagger (OpenAPI 3.1). Health check tai /health.

## Cau truc thu muc
- src/EatFitAI.Domain: cac entity, logic thuoc domain
- src/EatFitAI.Application: cac service, use case
- src/EatFitAI.Infrastructure: truy cap du lieu, tich hop ngoai vi
- src/EatFitAI.Api: ASP.NET API
- 	ests/EatFitAI.Tests: unit/integration test (dang trong)
- ops/: docker-compose, seed, postman collection (se bo sung o cac buoc tiep theo)

## Logging & Health
- Log duoc day ra console bang Serilog (de quan sat tren Docker/CI).
- Health check mac dinh tai /health.

## CORS
Cho phep origin http://localhost:19006 va cac app Expo (exp://*).
