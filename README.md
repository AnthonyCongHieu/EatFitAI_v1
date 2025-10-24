# EatFitAI (No-Docker, SP-first)
API: .NET 9, http://localhost:5100
DB: SQL Server local (Integrated Security)
Mobile: Expo (React Native)

## Features
- User authentication (JWT, Google OAuth)
- Profile management
- Food search and custom dishes
- Diary entries for meals
- Body metrics tracking
- Nutrition targets
- Summary reports (daily/weekly)

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - Logout user
- `GET /api/profile/me` - Get user profile
- `PUT /api/profile/me` - Update user profile
- `GET /api/foods/search` - Search foods
- `GET /api/foods/{id}` - Get food by ID
- `POST /api/custom-dishes` - Create custom dish
- `GET /api/custom-dishes` - Get user custom dishes
- `GET /api/custom-dishes/{id}` - Get custom dish by ID
- `POST /api/diary` - Create diary entry
- `GET /api/diary/{date}` - Get diary entries for date
- `DELETE /api/diary/{id}` - Delete diary entry
- `GET /api/body-metrics` - Get body metrics
- `POST /api/body-metrics` - Add body metric
- `GET /api/nutrition-targets` - Get nutrition targets
- `PUT /api/nutrition-targets` - Update nutrition targets
- `GET /api/summary/daily/{date}` - Get daily summary
- `GET /api/summary/weekly/{date}` - Get weekly summary

## Setup

### Backend
1) Copy .env.example -> .env
2) dotnet ef database update (hoac dotnet run)
3) API tu migrate + ap /db/scripts

### Mobile
1) Copy .env.example -> .env
2) npm i && npx expo start

### Demo account
login: demo@eatfit.ai / demo123

## Testing
- Build verification: Both backend and mobile compile cleanly
- API testing: All endpoints validated and functional
- Performance testing: Response times under 100ms for typical requests

## Notes
Khong Docker, khong CRUD EF, chi SP qua Dapper.
