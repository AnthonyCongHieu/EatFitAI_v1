---
description: Repository Information Overview
alwaysApply: true
---

# Repository Information Overview

## Repository Summary
EatFitAI is a nutrition tracking application with AI-powered recipe suggestions. The project follows a "No-Docker, SP-first" approach with a .NET backend using Dapper for data access (avoiding EF Core for CRUD operations) and a React Native mobile frontend built with Expo.

## Repository Structure
- **eatfitai-backend/**: .NET 9 backend API with clean architecture
  - **src/**: Source code organized in layers (Api, Application, Domain, Infrastructure)
  - **db/scripts/**: SQL scripts for views and stored procedures
- **eatfitai-mobile/**: React Native mobile app built with Expo and TypeScript
  - **src/**: Source code organized by feature and component type
  - **__tests__/**: Jest test files for the mobile app

## Projects

### Backend (eatfitai-backend)
**Configuration File**: EatFitAI.Api.csproj

#### Language & Runtime
**Language**: C#
**Version**: .NET 9.0
**Build System**: MSBuild
**Package Manager**: NuGet

#### Dependencies
**Main Dependencies**:
- Microsoft.AspNetCore.Authentication.JwtBearer (9.0.0)
- Microsoft.EntityFrameworkCore.SqlServer (9.0.0)
- Microsoft.EntityFrameworkCore.Design (9.0.0)
- Dapper (not explicitly shown but referenced in code)

#### Build & Installation
```bash
dotnet restore
dotnet build
dotnet ef database update
dotnet run --project src/EatFitAI.Api/EatFitAI.Api.csproj
```

#### Architecture
**Pattern**: Clean Architecture
- **EatFitAI.Api**: Controllers, API endpoints, and configuration
- **EatFitAI.Application**: Application services and business logic
- **EatFitAI.Domain**: Domain entities and business rules
- **EatFitAI.Infrastructure**: Data access, external services integration

#### Database
**Type**: SQL Server (Local)
**Connection**: Integrated Security
**Migration**: EF Core for schema, SQL scripts for views and stored procedures
**Access Pattern**: Stored Procedures via Dapper (SP-first approach)

### Mobile App (eatfitai-mobile)
**Configuration File**: package.json

#### Language & Runtime
**Language**: TypeScript
**Version**: Node.js >=18.0.0
**Build System**: Expo
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- expo (51.0.0)
- react (18.2.0)
- react-native (0.74.5)
- axios (1.7.2)
- react-hook-form (7.65.0)
- zustand (4.5.2)
- zod (3.25.76)
- react-navigation (6.x)
- expo-auth-session (5.5.2)
- expo-secure-store (15.0.7)

**Development Dependencies**:
- typescript (5.3.3)
- jest (29.7.0)
- eslint (8.57.0)
- prettier (3.3.2)
- husky (9.0.11)

#### Build & Installation
```bash
npm install
npx expo start
```

#### Testing
**Framework**: Jest
**Test Location**: __tests__/ directory
**Naming Convention**: *.test.ts
**Run Command**:
```bash
npm test
```

#### Project Structure
**Main Components**:
- **src/app**: Application screens and navigation
- **src/components**: Reusable UI components
- **src/hooks**: Custom React hooks
- **src/services**: API services and external integrations
- **src/store**: State management with Zustand
- **src/theme**: Theming and styling
- **src/i18n**: Internationalization
- **src/config**: Application configuration
- **src/types**: TypeScript type definitions

## Environment Configuration
The project uses environment variables for configuration:

**Backend (.env)**:
- ConnectionStrings__Default: SQL Server connection string
- Jwt__Issuer/Audience/Key: JWT authentication settings
- Jwt__AccessMinutes/RefreshDays: Token expiration settings

**Mobile (.env)**:
- API_BASE_URL: Backend API endpoint (http://<LAN-IP>:5100)
- EXPO_PUBLIC_ENV: Environment name (development)

## Authentication
**Method**: JWT (JSON Web Tokens)
**Access Token**: 30 minutes expiration
**Refresh Token**: 30 days sliding expiration with rotation
**Providers**: Email/password, Google Sign-In

## Features
- User authentication and profile management
- Body metrics tracking
- Food search and custom dish creation
- Nutrition diary with daily/weekly summaries
- AI-powered recipe suggestions (mock)
- Camera integration for food recognition