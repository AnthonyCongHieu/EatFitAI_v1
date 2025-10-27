# Tóm tắt: Loại bỏ ASP.NET Identity - Chuyển sang SP + Dapper

## 🎯 Mục tiêu
Loại bỏ hoàn toàn ASP.NET Identity và thay thế bằng custom authentication sử dụng Stored Procedures + Dapper, tuân thủ RULES.md: "SP-first + Dapper; EF chỉ schema"

## ✅ Các thay đổi đã thực hiện

### 1. Stored Procedures (db/scripts/)
**Tạo mới 3 stored procedures:**

#### 110_sp_Auth_DangKy.sql
- Đăng ký user mới
- Nhận: @Email, @MatKhauHash (varbinary), @HoTen
- Kiểm tra email trùng
- Insert vào bảng NguoiDung
- Trả về thông tin user vừa tạo

#### 111_sp_Auth_DangNhap.sql
- Lấy thông tin user theo email
- Nhận: @Email
- Trả về user (bao gồm MatKhauHash để verify)

#### 112_sp_Auth_LayTheoId.sql
- Lấy thông tin user theo ID
- Nhận: @MaNguoiDung
- Trả về thông tin user

### 2. Auth Repository

#### IAuthRepository (Application/Repositories/)
```csharp
public interface IAuthRepository
{
    Task<NguoiDung?> FindByEmailAsync(string email, CancellationToken ct);
    Task<NguoiDung?> FindByIdAsync(Guid userId, CancellationToken ct);
    Task<NguoiDung> CreateUserAsync(string email, byte[] passwordHash, string? hoTen, CancellationToken ct);
}
```

#### AuthRepository (Infrastructure/Repositories/)
- Implement interface với Dapper
- Gọi stored procedures
- Sử dụng ISqlConnectionFactory.CreateOpenConnectionAsync()

### 3. Domain Entity

#### NguoiDung.cs
**Trước:**
```csharp
public class NguoiDung : IdentityUser<Guid>
{
    // Chỉ có các thuộc tính bổ sung
}
```

**Sau:**
```csharp
public class NguoiDung
{
    public Guid MaNguoiDung { get; set; }
    public string Email { get; set; } = string.Empty;
    public byte[] MatKhauHash { get; set; } = Array.Empty<byte>();
    public string? HoTen { get; set; }
    public string? GioiTinh { get; set; }
    public DateOnly? NgaySinh { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }
    // ... navigation properties
}
```

### 4. AuthController.cs

**Thay đổi chính:**
- ❌ Xóa: `UserManager<NguoiDung>`, `SignInManager<NguoiDung>`
- ✅ Thêm: `IAuthRepository`
- ✅ Custom password validation: `ValidatePassword()`
- ✅ BCrypt password hashing: `HashPassword()`, `VerifyPassword()`
- ✅ Cập nhật tất cả endpoints: register, login, google, refresh, logout

**Password Hashing:**
- Sử dụng BCrypt.Net-Next
- Tự động salt
- An toàn hơn SHA256

### 5. Program.cs

**Xóa Identity configuration:**
```csharp
// ❌ Đã xóa
var identityBuilder = builder.Services.AddIdentityCore<NguoiDung>(...);
identityBuilder.AddRoles<IdentityRole<Guid>>();
identityBuilder.AddEntityFrameworkStores<AppDbContext>();
identityBuilder.AddSignInManager();
identityBuilder.AddDefaultTokenProviders();
```

**Thêm Auth Repository:**
```csharp
// ✅ Đã thêm
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
```

**Xóa using:**
```csharp
// ❌ Đã xóa
using Microsoft.AspNetCore.Identity;
using EatFitAI.Domain.Users; // không cần nữa
```

### 6. Dependencies

#### Infrastructure.csproj
**Xóa:**
```xml
<PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="9.0.0" />
```

**Thêm:**
```xml
<PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />
```

**Giữ nguyên:**
- Dapper 2.1.35
- Microsoft.Data.SqlClient 5.2.0
- Microsoft.EntityFrameworkCore (cho schema only)

### 7. AppDbContext.cs
- ✅ Không cần thay đổi (đã không inherit từ IdentityDbContext)
- ✅ Mapping vẫn giữ nguyên

## 📊 So sánh Before/After

### Before (Với Identity)
```
Request → AuthController 
    → UserManager.FindByEmailAsync() 
    → EF Core query bảng AspNetUsers (KHÔNG TỒN TẠI)
    → ❌ SQL Error: Invalid column name 'UserName', 'NormalizedEmail'...
```

### After (Không Identity)
```
Request → AuthController 
    → IAuthRepository.FindByEmailAsync()
    → Dapper execute sp_Auth_DangNhap
    → ✅ Query bảng NguoiDung (TỒN TẠI với đúng cột)
    → ✅ Trả về user
```

## 🔐 Bảo mật Password

### Trước (Không an toàn)
- Identity's PasswordHasher (phức tạp nhưng không kiểm soát được)
- Hoặc SHA256 (quá đơn giản, không salt)

### Sau (An toàn)
- **BCrypt** với cost factor mặc định
- Tự động salt mỗi lần hash
- Chống brute-force attacks
- Industry standard cho password hashing

## 🧪 Testing Checklist

### API Endpoints
- [ ] POST /api/auth/register - Đăng ký user mới
- [ ] POST /api/auth/login - Đăng nhập
- [ ] POST /api/auth/google - Google Sign-in
- [ ] POST /api/auth/refresh - Refresh token
- [ ] POST /api/auth/logout - Đăng xuất

### Test Cases
1. **Register:**
   - Email mới → Success
   - Email trùng → 422 Error
   - Password yếu → Validation errors
   
2. **Login:**
   - Email + password đúng → Success + tokens
   - Email sai → 401 Unauthorized
   - Password sai → 401 Unauthorized

3. **Google Login:**
   - ID token hợp lệ, user mới → Tạo user + tokens
   - ID token hợp lệ, user cũ → Trả tokens
   - ID token không hợp lệ → 422 Error

4. **Refresh:**
   - Refresh token hợp lệ → New tokens
   - Refresh token hết hạn → 401 Error
   - Refresh token không tồn tại → 401 Error

5. **Logout:**
   - Refresh token hợp lệ → Revoke thành công
   - Refresh token rỗng → 422 Error

## 📝 Lưu ý quan trọng

### Database
- Bảng `NguoiDung` phải có cột `MatKhauHash` kiểu `varbinary(256)`
- Không cần các bảng Identity (AspNetUsers, AspNetRoles, etc.)
- Stored procedures sẽ tự động được apply khi app khởi động

### Migration
- Nếu có EF migrations cũ tạo bảng Identity → Cần xóa
- Chỉ giữ migrations cho schema của bảng custom

### Frontend Compatibility
- API contract không thay đổi (AuthResponse, RegisterRequest, etc.)
- Mobile app không cần update
- Chỉ backend logic thay đổi

## 🚀 Deployment Steps

1. **Backup database** (quan trọng!)
2. **Apply code changes** (đã hoàn thành)
3. **Run migrations:**
   ```bash
   cd eatfitai-backend
   dotnet ef database update --project src/EatFitAI.Infrastructure --startup-project src/EatFitAI.Api
   ```
4. **Start API:**
   ```bash
   dotnet run --project src/EatFitAI.Api
   ```
5. **Test endpoints** với Postman/Swagger
6. **Test mobile app** integration

## ✨ Kết quả

✅ **Loại bỏ hoàn toàn Identity**
- Không còn dependency vào Microsoft.AspNetCore.Identity
- Không còn UserManager, SignInManager
- Không còn IdentityUser base class

✅ **Tuân thủ RULES.md**
- SP-first: Tất cả auth logic qua stored procedures
- Dapper: Repository pattern với Dapper
- EF chỉ schema: DbContext chỉ để mapping, không query

✅ **Bảo mật tốt hơn**
- BCrypt thay vì SHA256
- Auto-salt mỗi password
- Industry best practices

✅ **Code sạch hơn**
- Tách biệt rõ ràng: Domain, Application, Infrastructure
- Dễ test, dễ maintain
- Không phụ thuộc framework nặng

## 📚 Tài liệu tham khảo

- BCrypt.Net-Next: https://github.com/BcryptNet/bcrypt.net
- Dapper: https://github.com/DapperLib/Dapper
- Password Hashing Best Practices: OWASP guidelines

---

**Ngày hoàn thành:** 2024
**Người thực hiện:** EatFitAI Development Team
