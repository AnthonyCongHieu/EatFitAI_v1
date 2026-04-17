# EatFitAI Backend Secrets

Use `dotnet user-secrets` for all machine-specific backend values.

Project path:

```powershell
dotnet user-secrets list --project .\eatfitai-backend\EatFitAI.API.csproj
```

## Required keys

```text
ConnectionStrings:DefaultConnection
Jwt:Key
Smtp:Host
Smtp:Port
Smtp:User
Smtp:Password
Smtp:FromEmail
```

## Example commands

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Database=EatFitAI;Trusted_Connection=True;TrustServerCertificate=True;" --project .\eatfitai-backend\EatFitAI.API.csproj
dotnet user-secrets set "Jwt:Key" "REPLACE_WITH_BASE64_OR_LONG_RANDOM_SECRET" --project .\eatfitai-backend\EatFitAI.API.csproj
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com" --project .\eatfitai-backend\EatFitAI.API.csproj
dotnet user-secrets set "Smtp:Port" "587" --project .\eatfitai-backend\EatFitAI.API.csproj
dotnet user-secrets set "Smtp:User" "your-email@example.com" --project .\eatfitai-backend\EatFitAI.API.csproj
dotnet user-secrets set "Smtp:Password" "your-app-password" --project .\eatfitai-backend\EatFitAI.API.csproj
dotnet user-secrets set "Smtp:FromEmail" "your-email@example.com" --project .\eatfitai-backend\EatFitAI.API.csproj
```

## Rules

- Do not store dev secrets in `appsettings.json`
- Do not commit `.env` or machine-specific JSON
- Use `localhost` in docs, but each machine can override the connection string in `user-secrets`

## Verify

```powershell
dotnet user-secrets list --project .\eatfitai-backend\EatFitAI.API.csproj
```
