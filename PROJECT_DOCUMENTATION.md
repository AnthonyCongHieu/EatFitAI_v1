# EatFitAI Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Requirements & Specifications](#requirements--specifications)
3. [Backend Architecture & API](#backend-architecture--api)
4. [Mobile App Architecture](#mobile-app-architecture)
5. [Development Guidelines & Rules](#development-guidelines--rules)
6. [Current Tasks & TODOs](#current-tasks--todos)
7. [UI/UX Improvements](#uiux-improvements)
8. [API Rules & Conventions](#api-rules--conventions)

---

## Project Overview

EatFitAI is a comprehensive nutrition tracking mobile application with AI-powered features. The project consists of two main components:

- **Mobile App**: Expo (React Native) application for iOS and Android
- **Backend**: .NET 9 Web API with SQL Server database (stored procedure-first architecture)

### Key Features
- User authentication (JWT, Google OAuth)
- Profile management and body metrics tracking
- Food search and custom dish creation
- Meal diary entries with nutrition calculation
- Nutrition targets and progress tracking
- Summary reports (daily/weekly/monthly)
- AI-powered vision, recipes, and nutrition suggestions

### Technology Stack
- **Backend**: .NET 9 + SQL Server (SP-first with Dapper), EF for schema only
- **Mobile**: React Native (Expo) + TypeScript
- **Database**: SQL Server with stored procedures
- **Authentication**: JWT (Access: 30min, Refresh: 30 days sliding)
- **Deployment**: Kestrel HTTP + local SQL

### Current Status
- Mobile app: Fully functional, can connect to external APIs via environment variables
- Backend: Codebase cleared for re-setup, preparing new .NET 9 implementation
- Demo account: demo@eatfit.ai / demo123

---

## Requirements & Specifications

### Functional Requirements
- **Authentication**: User registration, login, JWT token management
- **Profile Management**: User profiles, body metrics, nutrition targets
- **Meal Tracking**: Food search, custom dishes, meal diary entries
- **Analytics**: Daily/weekly/monthly nutrition summaries and progress tracking
- **AI Features**: Vision analysis, recipe suggestions, nutrition recommendations (mock implementation)

### Non-Functional Requirements
- **Performance**: Optimized for mobile and web usage
- **Security**: JWT authentication, secure data handling
- **Scalability**: Modular architecture supporting future AI integration
- **Usability**: Intuitive mobile-first design

### Technical Specifications
- **Backend Architecture**: Layered architecture (Controllers → Services → Repositories → Database)
- **Database Design**: SQL Server with stored procedures as primary data access
- **API Design**: RESTful APIs with standardized response formats
- **Mobile Architecture**: Component-based with state management (Zustand)
- **Code Quality**: TypeScript strict mode, ESLint, comprehensive testing

---

## Backend Architecture & API

### Technology Stack Selection

#### Core Framework
- **.NET 9**: Latest .NET version for performance and features
- **ASP.NET Core Web API**: REST API framework
- **Entity Framework**: Schema management (not for data access)
- **Dapper**: Micro-ORM for stored procedure execution

#### Database Integration
- **SQL Server**: Primary database
- **Stored Procedures**: SP-first architecture
- **Connection Pooling**: Built-in connection management

#### Authentication & Security
- **JWT**: Token-based authentication
- **BCrypt**: Password hashing
- **Rate Limiting**: API protection
- **CORS**: Cross-origin resource sharing

### Project Structure
```
eatfitai-backend/
├── Controllers/          # HTTP request handlers
├── Services/            # Business logic layer
├── Repositories/        # Data access layer
├── DTOs/               # Data transfer objects
├── Middleware/         # Custom middleware
├── Models/            # Domain models
├── Data/              # Database context and configuration
├── Migrations/        # EF migrations
└── Properties/        # Launch settings
```

### Architecture Overview

#### Layered Architecture Pattern
```
┌─────────────────┐
│   Controllers   │ ← HTTP request/response handling
├─────────────────┤
│    Services     │ ← Business logic layer
├─────────────────┤
│   Repositories  │ ← Data access layer (SP calls)
├─────────────────┤
│   Database      │ ← SQL Server with stored procedures
└─────────────────┘
```

#### Key Principles
- **Separation of Concerns**: Each layer has distinct responsibilities
- **Dependency Injection**: Services injected into controllers
- **Repository Pattern**: Abstract data access operations
- **Middleware Pipeline**: Request processing through middleware stack

### API Design

#### Authentication Endpoints
```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/refresh           # Token refresh
POST   /api/auth/logout            # User logout
GET    /api/auth/me               # Get current user profile
```

#### User Management Endpoints
```
GET    /api/users/profile          # Get user profile
PUT    /api/users/profile          # Update user profile
GET    /api/users/targets          # Get nutrition targets
PUT    /api/users/targets          # Update nutrition targets
GET    /api/users/metrics          # Get body metrics history
POST   /api/users/metrics          # Add body metric entry
```

#### Meal Diary Endpoints
```
GET    /api/meals                  # Get meal diary entries (paginated)
GET    /api/meals/:id              # Get specific meal entry
POST   /api/meals                  # Add meal entry
PUT    /api/meals/:id              # Update meal entry
DELETE /api/meals/:id              # Soft delete meal entry
POST   /api/meals/:id/restore      # Restore deleted meal entry
```

#### Food Management Endpoints
```
GET    /api/foods/search            # Search food items
GET    /api/foods/:id              # Get food item details
GET    /api/foods/favorites        # Get user's favorite foods
POST   /api/foods/:id/favorite     # Add to favorites
DELETE /api/foods/:id/favorite     # Remove from favorites
GET    /api/foods/recent           # Get recently used foods
```

#### Statistics Endpoints
```
GET    /api/stats/daily/:date       # Daily nutrition summary
GET    /api/stats/weekly/:weekStart # Weekly nutrition summary
GET    /api/stats/monthly/:month    # Monthly nutrition summary
GET    /api/stats/progress          # Target vs actual progress
```

### Authentication Strategy

#### JWT Implementation
- **Access Token**: Short-lived (30 minutes), used for API access
- **Refresh Token**: Long-lived (30 days sliding), used to obtain new access tokens
- **Token Storage**: HTTP-only cookies for web, secure storage for mobile

#### Security Measures
- Password hashing with BCrypt (12 rounds)
- JWT secret rotation
- Rate limiting on auth endpoints
- CORS configuration
- Input validation and sanitization

### Testing Strategy

#### Unit Testing
- **Framework**: xUnit with Moq
- **Coverage**: Aim for 80%+ code coverage
- **Focus Areas**: Service layer business logic, utilities, validation

#### Integration Testing
- **Framework**: xUnit with TestServer
- **Test Areas**: API endpoints, database operations, authentication flow

---

## Mobile App Architecture

### Technology Stack
- **Framework**: Expo (React Native) + TypeScript
- **State Management**: Zustand stores
- **Navigation**: React Navigation (Stack + Tabs)
- **HTTP Client**: Axios with interceptors
- **Testing**: Jest + React Native Testing Library
- **Code Quality**: ESLint, Prettier, Husky, Lint-Staged

### Project Structure
```
eatfitai-mobile/
├── src/
│   ├── app/                    # Screens and navigation
│   │   ├── screens/           # Screen components
│   │   └── navigation/        # Navigation configuration
│   ├── components/            # Reusable UI components
│   ├── store/                 # Zustand state management
│   ├── services/              # API services and clients
│   ├── hooks/                 # Custom React hooks
│   ├── theme/                 # Theme and styling
│   ├── types/                 # TypeScript type definitions
│   └── config/                # Configuration files
├── scripts/                   # Build and utility scripts
└── __tests__/                 # Test files
```

### Key Components

#### State Management (Zustand)
- **Auth Store**: Authentication state and token management
- **Diary Store**: Meal diary entries and operations
- **Profile Store**: User profile and settings
- **Stats Store**: Analytics and summary data

#### Service Layer
- **API Client**: Axios instance with interceptors for auth and error handling
- **Auth Service**: Authentication operations
- **Diary Service**: Meal diary CRUD operations
- **Food Service**: Food search and management
- **Profile Service**: User profile operations

#### UI Components
- **Themed Components**: Theme-aware text, buttons, cards
- **Skeleton Components**: Loading state animations
- **Form Components**: Inputs, pickers, validation
- **Layout Components**: Screens, headers, navigation

### Development Workflow
1. **Setup**: Install dependencies, copy `.env.example` to `.env`
2. **Development**: Run `npm run dev` to start Expo dev server
3. **Type Generation**: Run `npm run typegen` to sync API types from OpenAPI spec
4. **Testing**: Run `npm test` for unit tests
5. **Linting**: Run `npm run lint` and `npm run typecheck`
6. **Building**: Use `npm run android/ios/web` for platform builds

---

## Development Guidelines & Rules

### Code Formatting (Codex Format)
- **Goal → Files → Changes → Run & Verify → Questions≤2**
- Comments: Vietnamese for complex logic only
- Git Flow: main/dev/feature branches
- Commit Messages: `feat|fix|docs|test|refactor: short description`

### Backend Rules
- **SP-First Architecture**: Use stored procedures for data access, EF only for schema
- **Authentication**: JWT Access (30min), Refresh (30 days sliding)
- **CORS**: Allow localhost:19006, LAN-IP:19006, exp://*

### Mobile Rules
- **TypeScript Strict**: Full type safety enabled
- **Component Structure**: Clear separation of concerns
- **State Management**: Zustand for complex state, Context for theme
- **API Integration**: Service layer handles all external calls

### API Integration Rules
- **SQL Schema = Source of Truth**: Never modify `EatFitAI.sql`
- **Naming Convention Mapping**:
  | SQL Column | Backend (C#) | Frontend (TS) |
  |------------|--------------|----------------|
  | `MaNguoiDung` | `MaNguoiDung` | `userId` |
  | `HoTen` | `HoTen` | `fullName` |
  | `ChieuCaoCm` | `ChieuCaoCm` | `heightCm` |
  | `CanNangKg` | `CanNangKg` | `weightKg` |

### Development Workflow
1. **Backend Changes**: Always check SQL schema first
2. **Frontend Changes**: Always check backend contracts
3. **API Changes**: Update both sides simultaneously
4. **Testing**: Test full request/response cycle

---

## Current Tasks & TODOs

### Backend Compilation Fixes
#### 1. Update DiaryContracts.cs
- [ ] Replace `MaMonAn` in `DiaryCreateRequest` with `MaThucPham`, `MaMonNguoiDung`, `MaCongThuc` (all `long?` and at least one required).

#### 2. Update DiaryController.cs
- [ ] In `Create` method: Replace `request.ItemId` and `request.Source` with `request.MaThucPham`, `request.MaMonNguoiDung`, `request.MaCongThuc`.
- [ ] Change `request.QuantityGrams` to `request.KhoiLuongGram`, `request.MealDate` to `request.NgayAn`, `request.MealCode` to `request.MaBuaAn`.
- [ ] Update response mappings in `Create` and `Update` to use `MaNhatKy`, `NgayAn`, etc., remove `Id`, `MealDate`, `ItemId`, `Source`, `FoodId`, `CustomDishId`, `AiRecipeId`.
- [ ] In `GetByDate`: Update response to match `DiaryEntryResponse` fields.
- [ ] In `Update`: Similar changes for request and response.

#### 3. Update SummaryController.cs
- [ ] In `Day` method: Change `MealDate` to `NgayAn`, `TotalCaloriesKcal` to `TongCalo`, etc. in `DaySummaryResponse`.
- [ ] In `Week` method: Update `WeekSummaryItem` mappings similarly.

#### 4. Check FoodsController.cs and NutritionTargetsController.cs
- [ ] Verify if mappings already match; update if necessary.

#### 5. Build and Test
- [ ] Run build to check for remaining errors.
- [ ] Fix any additional issues.

---

## UI/UX Improvements

### Completed Improvements (Phase 1)
- ✅ **Font System**: Complete Inter font family (300-700 weights)
- ✅ **Theme System**: Comprehensive theme with typography, colors, shadows, animations
- ✅ **Skeleton Components**: Animated loading states with pulse effects
- ✅ **ThemedText Component**: Full typography variants and color options
- ✅ **Basic Components**: Icon, EmptyState, ErrorState components

### Phase 2 Enhancements (In Progress)

#### 1. Button Component Enhancement
- [ ] Size variants (xs, sm, md, lg, xl)
- [ ] Loading states with spinner animation
- [ ] Ghost variant (transparent background)
- [ ] Better disabled states with opacity
- [ ] Icon + text support
- [ ] Custom ripple effects

#### 2. Card Component Enhancement
- [ ] Interactive variants with press effects
- [ ] Gradient background support
- [ ] Enhanced shadow system
- [ ] Customizable borders and border radius
- [ ] Hover/press animations

#### 3. Screen Component Improvements
- [ ] Better scroll behaviors
- [ ] Enhanced pull-to-refresh
- [ ] Keyboard handling optimizations
- [ ] Safe area improvements

#### 4. Form Components Enhancement
- [ ] Better input validation states
- [ ] Floating label inputs
- [ ] Input masks and formatters
- [ ] Auto-complete suggestions

#### 5. Modal & Dialog System
- [ ] Custom Modal component
- [ ] Bottom sheet variants
- [ ] Action sheets
- [ ] Confirmation dialogs

#### 6. Navigation Improvements
- [ ] Custom header components
- [ ] Enhanced tab bar styling
- [ ] Navigation animations
- [ ] Back button customization

#### 7. Loading & Feedback System
- [ ] Progress indicators
- [ ] Enhanced skeleton variants
- [ ] Better toast notifications
- [ ] Status indicators

#### 8. Accessibility & Performance
- [ ] Focus management improvements
- [ ] Screen reader optimizations
- [ ] Reduced re-renders with memo
- [ ] Lazy loading components

### Design System Achievements
- **Typography**: Standardized font system with Inter family
- **Colors**: Comprehensive palette for light/dark themes
- **Spacing**: Consistent spacing scale (xs, sm, md, lg, xl, xxl)
- **Shadows**: Proper elevation system
- **Animations**: Smooth transitions with Reanimated
- **Performance**: Optimized with memo and efficient loading

---

## API Rules & Conventions

### Backend-First API Design
The EatFitAI project uses a **Backend-first API Design** approach where the SQL schema serves as the absolute source of truth. Frontend must adapt to backend contracts.

### Core Principles

#### 1. SQL Schema = Source of Truth
- **NEVER modify** the `EatFitAI.sql` file
- All field names must match SQL columns exactly
- Backend models must reflect SQL schema 1:1

#### 2. Backend Rules (C# .NET)
- **Field Names**: Use **PascalCase + Vietnamese** according to SQL schema
  - ✅ `MaNguoiDung`, `HoTen`, `ChieuCaoCm`, `MaAccessToken`
  - ❌ `UserId`, `FullName`, `HeightCm`, `AccessToken`
- **API Contracts**: Define contracts matching SQL columns
- **Response Format**: Return data in PascalCase (matches SQL)
- **No Breaking Changes**: Never modify SQL schema

#### 3. Frontend Rules (React Native/TypeScript)
- **Field Names**: Use **camelCase + English** in code
  - ✅ `userId`, `fullName`, `heightCm`, `accessToken`
  - ❌ `MaNguoiDung`, `HoTen`, `ChieuCaoCm`, `MaAccessToken`
- **API Calls**: Map camelCase → PascalCase when sending requests
- **Response Handling**: Map PascalCase → camelCase when receiving responses
- **Type Definitions**: Use camelCase in TypeScript interfaces
- **Service Layer**: Handle mapping logic in services

### Implementation Examples

#### Backend Implementation
```csharp
// ✅ Correct: Match SQL schema exactly
public sealed class AuthResponse
{
    public Guid MaNguoiDung { get; init; }
    public string HoTen { get; init; }
    public string MaAccessToken { get; init; }
    public DateTimeOffset ThoiGianHetHanAccessToken { get; init; }
}
```

#### Frontend Implementation
```typescript
// ✅ Correct: camelCase in TypeScript
interface AuthResponse {
  userId: string;
  fullName: string;
  accessToken: string;
  accessTokenExpiresAt: string;
}

// Service handles mapping
const mapAuthResponse = (data: any): AuthResponse => ({
  userId: data.MaNguoiDung,
  fullName: data.HoTen,
  accessToken: data.MaAccessToken,
  accessTokenExpiresAt: data.ThoiGianHetHanAccessToken,
});
```

### API Flow Rules

#### Request Flow (Frontend → Backend)
1. Frontend: Prepare data in camelCase
2. Service: Map camelCase → PascalCase
3. API Call: Send PascalCase data
4. Backend: Receive PascalCase (matches SQL)

#### Response Flow (Backend → Frontend)
1. Backend: Return data in PascalCase (matches SQL)
2. API Call: Receive PascalCase data
3. Service: Map PascalCase → camelCase
4. Frontend: Use camelCase data

### File Structure Rules

#### Backend Structure
```
src/EatFitAI.Api/
├── Contracts/           # API contracts matching SQL
├── Controllers/         # Use contracts directly
└── ...

src/EatFitAI.Domain/     # Domain models matching SQL
src/EatFitAI.Infrastructure/ # EF models matching SQL
```

#### Frontend Structure
```
src/
├── services/            # API clients with mapping logic
├── store/               # Zustand stores using camelCase
├── types/               # TypeScript interfaces (camelCase)
└── ...
```

### Migration Strategy

#### Phase 1: Establish Rules (Current)
- ✅ Write comprehensive API rules
- ✅ Document naming conventions
- ✅ Define implementation patterns

#### Phase 2: Backend Alignment
- [ ] Audit all API contracts against SQL schema
- [ ] Fix field names to match SQL exactly
- [ ] Update controllers to use correct contracts
- [ ] Ensure EF models match SQL

#### Phase 3: Frontend Adaptation
- [ ] Update TypeScript interfaces to camelCase
- [ ] Implement mapping logic in services
- [ ] Update stores to use mapped data
- [ ] Test all API integrations

#### Phase 4: Testing & Validation
- [ ] End-to-end API testing
- [ ] TypeScript compilation check
- [ ] Runtime data flow validation
- [ ] Documentation update

### Best Practices

#### Backend Best Practices
- Always reference SQL schema when creating contracts
- Use PascalCase + Vietnamese consistently
- Keep contracts simple and match DB structure
- Document any custom logic clearly

#### Frontend Best Practices
- Use camelCase in all TypeScript code
- Centralize mapping logic in services
- Maintain type safety with interfaces
- Document mapping functions clearly

#### Development Workflow
1. **Backend Changes**: Always check SQL schema first
2. **Frontend Changes**: Always check backend contracts
3. **API Changes**: Update both sides simultaneously
4. **Testing**: Test full request/response cycle

---

*This documentation serves as the single source of truth for the EatFitAI project, ensuring consistency across all development activities.*