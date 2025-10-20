# EatFitAI (No-Docker, SP-first)
API: .NET 9, http://localhost:5100
DB: SQL Server local (Integrated Security)
Mobile: Expo (React Native)

### Backend
1) Copy .env.example -> .env
2) dotnet ef database update (hoac dotnet run)
3) API tu migrate + ap /db/scripts

### Mobile
1) Copy .env.example -> .env
2) npm i && npx expo start

### Demo account
login: demo@eatfit.ai / demo123

### Ghi chu
Khong Docker, khong CRUD EF, chi SP qua Dapper.
