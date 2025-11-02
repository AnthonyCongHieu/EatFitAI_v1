# EatFitAI Backend Setup Plan

## 1. Technology Stack Selection

### Core Framework
- **Node.js**: v18+ LTS for stability and performance
- **Express.js**: v4.x for REST API framework
- **TypeScript**: For type safety and better development experience

### Database Integration
- **mssql**: Microsoft SQL Server driver for Node.js
- **Connection pooling**: Built-in connection management
- **Stored procedures**: Direct execution of existing SP-first architecture

### Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcrypt**: Password hashing
- **express-rate-limit**: API rate limiting
- **helmet**: Security headers
- **cors**: Cross-origin resource sharing

### Validation & Middleware
- **joi**: Request validation
- **express-validator**: Alternative validation library
- **multer**: File upload handling (for meal photos)

### Development Tools
- **nodemon**: Development server with auto-restart
- **dotenv**: Environment variable management
- **winston**: Logging framework
- **jest**: Unit and integration testing
- **supertest**: API testing

### Production Considerations
- **pm2**: Process manager for production
- **compression**: Response compression
- **express-slow-down**: Progressive rate limiting

## 2. Project Structure

```
eatfitai-backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # SQL Server connection config
│   │   ├── auth.ts             # JWT configuration
│   │   └── environment.ts      # Environment variables
│   ├── controllers/
│   │   ├── authController.ts   # Authentication endpoints
│   │   ├── userController.ts   # User profile management
│   │   ├── mealController.ts   # Meal diary operations
│   │   ├── foodController.ts   # Food item management
│   │   └── statsController.ts  # Statistics and reports
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication middleware
│   │   ├── validation.ts       # Request validation middleware
│   │   ├── errorHandler.ts     # Global error handling
│   │   └── rateLimiter.ts      # Rate limiting middleware
│   ├── models/
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── database.ts         # Database query functions
│   ├── routes/
│   │   ├── auth.ts             # Authentication routes
│   │   ├── users.ts            # User management routes
│   │   ├── meals.ts            # Meal diary routes
│   │   ├── foods.ts            # Food item routes
│   │   └── stats.ts            # Statistics routes
│   ├── services/
│   │   ├── authService.ts      # Authentication business logic
│   │   ├── userService.ts      # User management logic
│   │   ├── mealService.ts      # Meal diary logic
│   │   └── statsService.ts     # Statistics calculations
│   ├── utils/
│   │   ├── logger.ts           # Logging utilities
│   │   ├── responses.ts        # Standard response formats
│   │   └── validation.ts       # Validation helpers
│   └── app.ts                  # Express app configuration
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── scripts/
│   ├── init-db.ts              # Database initialization
│   └── seed-data.ts            # Sample data seeding
├── docs/
│   ├── api.md                  # API documentation
│   └── deployment.md           # Deployment guide
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## 3. Architecture Overview

### Layered Architecture Pattern

```
┌─────────────────┐
│   Controllers   │ ← HTTP request/response handling
├─────────────────┤
│    Services     │ ← Business logic layer
├─────────────────┤
│   Repositories  │ ← Data access layer (SQL queries/SP calls)
├─────────────────┤
│   Database      │ ← SQL Server with stored procedures
└─────────────────┘
```

### Key Principles
- **Separation of Concerns**: Each layer has distinct responsibilities
- **Dependency Injection**: Services injected into controllers
- **Repository Pattern**: Abstract data access operations
- **Middleware Pipeline**: Request processing through middleware stack
- **Error Handling**: Centralized error management
- **Logging**: Comprehensive logging at all levels

### Data Flow
1. **Request** → Middleware (auth, validation, rate limiting)
2. **Controller** → Parse request, call service
3. **Service** → Business logic, call repository
4. **Repository** → Execute stored procedures/queries
5. **Database** → Return results
6. **Response** → Format and return via controller

## 4. Database Integration

### Connection Configuration
```typescript
// config/database.ts
import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true, // Use encryption
    trustServerCertificate: true, // For local development
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10, // Maximum connections
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export const poolPromise = new sql.ConnectionPool(config).connect();
```

### Repository Pattern Implementation
```typescript
// models/database.ts
import { poolPromise } from '../config/database';

export class DatabaseRepository {
  async executeSP(spName: string, params: any = {}) {
    try {
      const pool = await poolPromise;
      const request = pool.request();

      // Add parameters
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });

      const result = await request.execute(spName);
      return result;
    } catch (error) {
      logger.error('Database error:', error);
      throw error;
    }
  }

  async getMealDiary(userId: string, date: string) {
    return this.executeSP('sp_GetMealDiary', { UserId: userId, Date: date });
  }
}
```

### Stored Procedure Integration
- Direct execution of existing stored procedures
- Parameter mapping from TypeScript objects
- Result set handling and transformation
- Error handling and logging

## 5. API Design

### Authentication Endpoints
```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/refresh           # Token refresh
POST   /api/auth/logout            # User logout
GET    /api/auth/me               # Get current user profile
```

### User Management Endpoints
```
GET    /api/users/profile          # Get user profile
PUT    /api/users/profile          # Update user profile
GET    /api/users/targets          # Get nutrition targets
PUT    /api/users/targets          # Update nutrition targets
GET    /api/users/metrics          # Get body metrics history
POST   /api/users/metrics          # Add body metric entry
```

### Meal Diary Endpoints
```
GET    /api/meals                  # Get meal diary entries (paginated)
GET    /api/meals/:id              # Get specific meal entry
POST   /api/meals                  # Add meal entry
PUT    /api/meals/:id              # Update meal entry
DELETE /api/meals/:id              # Soft delete meal entry
POST   /api/meals/:id/restore      # Restore deleted meal entry
```

### Food Management Endpoints
```
GET    /api/foods/search            # Search food items
GET    /api/foods/:id              # Get food item details
GET    /api/foods/favorites        # Get user's favorite foods
POST   /api/foods/:id/favorite     # Add to favorites
DELETE /api/foods/:id/favorite     # Remove from favorites
GET    /api/foods/recent           # Get recently used foods
```

### User Dishes Endpoints
```
GET    /api/dishes                  # Get user's custom dishes
POST   /api/dishes                  # Create custom dish
GET    /api/dishes/:id              # Get dish details
PUT    /api/dishes/:id              # Update dish
DELETE /api/dishes/:id              # Delete dish
```

### Statistics Endpoints
```
GET    /api/stats/daily/:date       # Daily nutrition summary
GET    /api/stats/weekly/:weekStart # Weekly nutrition summary
GET    /api/stats/monthly/:month    # Monthly nutrition summary
GET    /api/stats/progress          # Target vs actual progress
```

### Request/Response Format
```typescript
// Standard API Response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

// Example: Meal Diary Entry
interface MealDiaryEntry {
  mealDiaryId: number;
  userId: string;
  eatenDate: string;
  mealTypeId: number;
  foodItemId?: number;
  userDishId?: number;
  recipeId?: number;
  servingUnitId?: number;
  portionQuantity?: number;
  grams: number;
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  note?: string;
  photoUrl?: string;
  sourceMethod?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 6. Authentication Strategy

### JWT Implementation
- **Access Token**: Short-lived (15 minutes), used for API access
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Token Storage**: HTTP-only cookies for web clients, secure storage for mobile

### Authentication Flow
1. **Registration/Login**: Validate credentials, generate tokens
2. **Token Refresh**: Use refresh token to get new access token
3. **Logout**: Invalidate refresh token on server side
4. **Middleware**: Validate access token on protected routes

### Security Measures
- Password hashing with bcrypt (12 rounds)
- JWT secret rotation
- Rate limiting on auth endpoints
- CORS configuration
- Helmet security headers
- Input validation and sanitization

### Middleware Implementation
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded as { userId: string; email: string };
    next();
  });
};
```

## 7. Key Features to Implement

### Priority 1: Core Authentication (Week 1)
- User registration and login
- JWT token management
- Password hashing and validation
- Basic user profile management

### Priority 2: Meal Diary CRUD (Week 2)
- Add meal entries with nutrition calculation
- View meal diary with pagination
- Update and soft delete meal entries
- Basic food search functionality

### Priority 3: Food Management (Week 3)
- Food item search with pagination
- Favorite foods management
- Recent foods tracking
- Custom dish creation and management

### Priority 4: Statistics and Reports (Week 4)
- Daily nutrition summaries
- Weekly and monthly reports
- Target vs actual progress tracking
- Basic charts and analytics

### Priority 5: Advanced Features (Week 5+)
- Image upload for meal photos
- AI integration endpoints (mock)
- Advanced search and filtering
- Performance optimization

## 8. Step-by-Step Implementation Guide

### Phase 1: Project Setup (Day 1)
1. Initialize Node.js project with TypeScript
2. Set up Express.js server with basic middleware
3. Configure environment variables
4. Set up project structure and folders
5. Install core dependencies
6. Configure ESLint and Prettier

### Phase 2: Database Integration (Day 2-3)
1. Configure SQL Server connection
2. Create database repository class
3. Implement stored procedure execution
4. Set up connection pooling
5. Create database migration scripts
6. Test database connectivity

### Phase 3: Authentication System (Day 4-5)
1. Implement user registration endpoint
2. Implement login endpoint
3. Create JWT token utilities
4. Implement authentication middleware
5. Add password hashing
6. Create user profile endpoints

### Phase 4: Meal Diary API (Day 6-8)
1. Implement meal diary CRUD operations
2. Add nutrition calculation logic
3. Implement food search functionality
4. Add pagination support
5. Create meal entry validation
6. Test meal diary operations

### Phase 5: Food Management (Day 9-10)
1. Implement food search API
2. Add favorite foods management
3. Create recent foods tracking
4. Implement custom dish creation
5. Add food validation
6. Test food management features

### Phase 6: Statistics API (Day 11-12)
1. Implement daily nutrition summaries
2. Add weekly/monthly statistics
3. Create target progress tracking
4. Add data aggregation logic
5. Implement caching for performance
6. Test statistics endpoints

### Phase 7: Testing and Optimization (Day 13-14)
1. Write unit tests for services
2. Create integration tests for APIs
3. Add error handling and logging
4. Implement rate limiting
5. Performance optimization
6. Security hardening

### Phase 8: Documentation and Deployment (Day 15)
1. Create API documentation
2. Set up deployment scripts
3. Configure production environment
4. Add monitoring and logging
5. Create deployment guide
6. Final testing and validation

## 9. Testing Strategy

### Unit Testing
- **Framework**: Jest with ts-jest
- **Coverage**: Aim for 80%+ code coverage
- **Focus Areas**:
  - Service layer business logic
  - Utility functions
  - Validation logic
  - Authentication helpers

### Integration Testing
- **Framework**: Jest with supertest
- **Test Areas**:
  - API endpoints functionality
  - Database operations
  - Authentication flow
  - Error handling

### Test Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── authService.test.ts
│   │   ├── mealService.test.ts
│   │   └── userService.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── responses.test.ts
├── integration/
│   ├── auth.test.ts
│   ├── meals.test.ts
│   ├── foods.test.ts
│   └── stats.test.ts
└── fixtures/
    ├── sampleData.ts
    └── testHelpers.ts
```

### Testing Best Practices
- Use test databases for integration tests
- Mock external dependencies
- Test both success and error scenarios
- Include edge cases and boundary conditions
- Run tests in CI/CD pipeline

## 10. Deployment Considerations

### Development Environment
- Local SQL Server instance
- Node.js development server
- Environment variables for configuration
- Hot reload for development

### Production Environment
- **Server**: Azure App Service or Azure VM
- **Database**: Azure SQL Database
- **Process Manager**: PM2 for Node.js
- **Reverse Proxy**: Nginx for static files and SSL
- **SSL**: Let's Encrypt certificates
- **Monitoring**: Application Insights

### Deployment Pipeline
1. **Source Control**: Git with GitHub Actions
2. **Build**: TypeScript compilation and testing
3. **Artifact**: Docker image creation
4. **Deploy**: Azure deployment slots
5. **Database**: Automated migrations
6. **Monitoring**: Health checks and alerts

### Security Considerations
- Environment variable management
- Secret management with Azure Key Vault
- Network security groups
- Database firewall rules
- Regular security updates
- Backup and disaster recovery

### Performance Optimization
- Connection pooling for database
- Response compression
- Caching layer (Redis) for frequently accessed data
- CDN for static assets
- Database query optimization
- Horizontal scaling considerations

### Monitoring and Logging
- Application performance monitoring
- Error tracking and alerting
- Database performance monitoring
- Log aggregation and analysis
- Health check endpoints
- Usage analytics

This plan provides a comprehensive foundation for building a robust, scalable backend for the EatFitAI nutrition tracking application using Node.js and SQL Server.