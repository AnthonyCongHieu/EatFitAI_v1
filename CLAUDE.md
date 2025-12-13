# EatFitAI Project - Claude Skill

## Project Overview
EatFitAI là ứng dụng theo dõi dinh dưỡng cá nhân với tích hợp AI Vision để nhận diện thực phẩm.

## Tech Stack

### Backend (.NET 9)
- **Framework:** ASP.NET Core Web API
- **Database:** SQL Server với Entity Framework Core
- **Auth:** JWT Bearer authentication
- **Pattern:** Clean Architecture (Controllers → Services → Repositories)

### Mobile (React Native / Expo SDK 54)
- **Language:** TypeScript
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Navigation:** React Navigation
- **Styling:** Vanilla CSS với design tokens

### AI Provider (Python/Flask)
- **Vision:** YOLO v11 (trained on Vietnamese food)
- **LLM:** Ollama (nutrition advice, recipes)

## Directory Structure

```
eatfitai-backend/
├── Controllers/     # API endpoints
├── Services/        # Business logic
├── Repositories/    # Data access
├── DTOs/           # Data transfer objects
├── DbScaffold/     # EF Core models
└── Tests/          # Unit & Integration tests

eatfitai-mobile/
├── src/
│   ├── app/screens/    # Screen components
│   ├── components/     # Reusable UI
│   ├── services/       # API clients
│   ├── store/          # Zustand stores
│   └── types/          # TypeScript types
└── __tests__/          # Jest tests

ai-provider/
├── app.py              # Flask API
├── nutrition_llm.py    # Ollama integration
└── best.pt             # YOLO model
```

## Coding Conventions

### Language
- **Code comments:** Vietnamese (không dấu hoặc có dấu)
- **Variable/function names:** English (camelCase)
- **UI text:** Vietnamese (sử dụng i18n)

### Backend (.NET)
- Controllers: `[HttpGet]`, `[HttpPost]` với route attributes
- Services: Interface-based với Dependency Injection
- DTOs: Separate Request/Response DTOs
- Error handling: Try-catch với proper exception types
- Naming: `*Controller`, `*Service`, `*Repository`, `*Dto`

### Mobile (TypeScript)
- Components: Functional components với hooks
- State: Zustand stores với typed selectors
- API: Centralized apiClient với interceptors  
- Types: Strict TypeScript, avoid `any`
- Naming: PascalCase for components, camelCase for functions

## API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token

### Food
- `GET /api/food/search?q={query}` - Tìm thực phẩm
- `GET /api/food/{id}` - Chi tiết thực phẩm
- `GET /api/food/search-all` - Tìm catalog + user foods

### Meal Diary
- `GET /api/meal-diary?date={date}` - Lấy entries theo ngày
- `POST /api/meal-diary` - Thêm entry
- `PUT /api/meal-diary/{id}` - Cập nhật entry
- `DELETE /api/meal-diary/{id}` - Xóa entry

### AI
- `POST /api/ai/detect-food` - Vision detection
- `GET /api/ai/recipe-suggestions` - Gợi ý công thức
- `GET /api/ai/nutrition-insights` - Phân tích dinh dưỡng

## Testing

### Backend
```powershell
cd eatfitai-backend
dotnet test
```

### Mobile
```powershell
cd eatfitai-mobile
npm test
```

## Common Tasks

### Start Development
```powershell
# Backend
cd eatfitai-backend && dotnet run

# Mobile
cd eatfitai-mobile && npm run dev

# AI Provider
cd ai-provider && python app.py
```

### Generate Types (Mobile)
```powershell
cd eatfitai-mobile && npm run typegen
```

## Key Files

| Purpose | Backend | Mobile |
|---------|---------|--------|
| Entry point | Program.cs | App.tsx |
| API client | - | src/services/apiClient.ts |
| Auth service | Services/AuthService.cs | src/services/authSession.ts |
| Food service | Services/FoodService.cs | src/services/foodService.ts |
| AI service | Controllers/AIController.cs | src/services/aiService.ts |
