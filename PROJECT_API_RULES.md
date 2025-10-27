# Quy Tắc API Toàn Dự Án EatFitAI

## 📋 Tổng Quan
Dự án EatFitAI sử dụng kiến trúc **Backend-first API Design** với SQL schema làm nguồn chân lý tuyệt đối. Frontend phải adapt theo backend contracts.

## 🎯 Nguyên Tắc Cơ Bản

### 1. SQL Schema = Source of Truth
- **TUYỆT ĐỐI KHÔNG THAY ĐỔI** file `EatFitAI.sql`
- Tất cả field names phải khớp chính xác với SQL columns
- Backend models phải reflect SQL schema 1:1

### 2. Backend Rules (C# .NET)
- **Field Names**: Sử dụng **PascalCase + Tiếng Việt** theo SQL schema
  - ✅ `MaNguoiDung`, `HoTen`, `ChieuCaoCm`, `MaAccessToken`
  - ❌ `UserId`, `FullName`, `HeightCm`, `AccessToken`
- **API Contracts**: Định nghĩa contracts theo SQL columns
- **Response Format**: Trả về data theo PascalCase (không camelCase)
- **No Breaking Changes**: Không thay đổi SQL schema

### 3. Frontend Rules (React Native/TypeScript)
- **Field Names**: Sử dụng **camelCase + Tiếng Anh** trong code
  - ✅ `userId`, `fullName`, `heightCm`, `accessToken`
  - ❌ `MaNguoiDung`, `HoTen`, `ChieuCaoCm`, `MaAccessToken`
- **API Calls**: Map từ camelCase → PascalCase khi gửi request
- **Response Handling**: Map từ PascalCase → camelCase khi nhận response
- **Type Definitions**: Sử dụng camelCase trong TypeScript interfaces
- **Service Layer**: Handle mapping logic trong services

### 4. Naming Convention Mapping

| SQL Column | Backend (C#) | Frontend (TS) | Description |
|------------|--------------|----------------|-------------|
| `MaNguoiDung` | `MaNguoiDung` | `userId` | User ID |
| `HoTen` | `HoTen` | `fullName` | Full name |
| `ChieuCaoCm` | `ChieuCaoCm` | `heightCm` | Height in cm |
| `CanNangKg` | `CanNangKg` | `weightKg` | Weight in kg |
| `MaAccessToken` | `MaAccessToken` | `accessToken` | Access token |
| `ThoiGianHetHanAccessToken` | `ThoiGianHetHanAccessToken` | `accessTokenExpiresAt` | Token expiry |
| `MaRefreshToken` | `MaRefreshToken` | `refreshToken` | Refresh token |
| `ThoiGianHetHanRefreshToken` | `ThoiGianHetHanRefreshToken` | `refreshTokenExpiresAt` | Refresh expiry |

## 🔧 Implementation Rules

### Backend Implementation
```csharp
// ✅ Correct: Match SQL schema exactly
public sealed class AuthResponse
{
    public Guid MaNguoiDung { get; init; }
    public string HoTen { get; init; }
    public string MaAccessToken { get; init; }
    public DateTimeOffset ThoiGianHetHanAccessToken { get; init; }
}

// ❌ Wrong: camelCase or English names
public sealed class AuthResponse
{
    public Guid UserId { get; init; } // Wrong!
    public string FullName { get; init; } // Wrong!
}
```

### Frontend Implementation
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

## 📁 File Structure Rules

### Backend Structure
```
src/EatFitAI.Api/
├── Contracts/           # API contracts matching SQL
│   ├── Auth/
│   │   ├── RegisterRequest.cs    # HoTen, Email, MatKhau
│   │   ├── AuthResponse.cs       # MaNguoiDung, MaAccessToken, etc.
│   └── ...
├── Controllers/         # Use contracts directly
└── ...

src/EatFitAI.Domain/     # Domain models matching SQL
src/EatFitAI.Infrastructure/ # EF models matching SQL
```

### Frontend Structure
```
src/
├── services/            # API clients with mapping logic
│   ├── apiClient.ts     # Base client
│   ├── authService.ts   # Auth API with mapping
│   └── ...
├── store/               # Zustand stores using camelCase
├── types/               # TypeScript interfaces (camelCase)
└── ...
```

## 🔄 API Flow Rules

### Request Flow (Frontend → Backend)
1. Frontend: Prepare data in camelCase
2. Service: Map camelCase → PascalCase
3. API Call: Send PascalCase data
4. Backend: Receive PascalCase (matches SQL)

### Response Flow (Backend → Frontend)
1. Backend: Return data in PascalCase (matches SQL)
2. API Call: Receive PascalCase data
3. Service: Map PascalCase → camelCase
4. Frontend: Use camelCase data

## ✅ Validation Rules

### Backend Validation
- All contracts must match SQL column names exactly
- No custom field names allowed
- Controllers use contracts directly
- EF models match SQL schema 1:1

### Frontend Validation
- All TypeScript interfaces use camelCase
- Services handle mapping correctly
- No direct use of PascalCase in components
- Type safety maintained throughout

## 🚀 Migration Strategy

### Phase 1: Establish Rules (Current)
- [x] Write comprehensive API rules
- [x] Document naming conventions
- [x] Define implementation patterns

### Phase 2: Backend Alignment
- [ ] Audit all API contracts against SQL schema
- [ ] Fix field names to match SQL exactly
- [ ] Update controllers to use correct contracts
- [ ] Ensure EF models match SQL

### Phase 3: Frontend Adaptation
- [ ] Update TypeScript interfaces to camelCase
- [ ] Implement mapping logic in services
- [ ] Update stores to use mapped data
- [ ] Test all API integrations

### Phase 4: Testing & Validation
- [ ] End-to-end API testing
- [ ] TypeScript compilation check
- [ ] Runtime data flow validation
- [ ] Documentation update

## 📝 Best Practices

### Backend Best Practices
- Always reference SQL schema when creating contracts
- Use PascalCase + Vietnamese consistently
- Keep contracts simple and match DB structure
- Document any custom logic clearly

### Frontend Best Practices
- Use camelCase in all TypeScript code
- Centralize mapping logic in services
- Maintain type safety with interfaces
- Document mapping functions clearly

### Development Workflow
1. **Backend Changes**: Always check SQL schema first
2. **Frontend Changes**: Always check backend contracts
3. **API Changes**: Update both sides simultaneously
4. **Testing**: Test full request/response cycle

---

*Quy tắc này đảm bảo tính nhất quán và maintainability của toàn bộ hệ thống API.*
