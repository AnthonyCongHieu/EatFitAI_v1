# TODO: Loại bỏ Identity - Chuyển sang SP + Dapper

## ✅ Đã hoàn thành

### Phase 1: Stored Procedures
- [x] 110_sp_Auth_DangKy.sql - Đăng ký user mới
- [x] 111_sp_Auth_DangNhap.sql - Lấy user theo email
- [x] 112_sp_Auth_LayTheoId.sql - Lấy user theo ID

### Phase 2: Auth Repository
- [x] IAuthRepository interface
- [x] AuthRepository implementation với Dapper

### Phase 3: Program.cs
- [x] Xóa Identity configuration (AddIdentityCore, AddEntityFrameworkStores, AddSignInManager)
- [x] Thêm IAuthRepository registration
- [x] Xóa using Microsoft.AspNetCore.Identity

### Phase 4: Dependencies
- [x] Xóa Microsoft.AspNetCore.Identity.EntityFrameworkCore từ Infrastructure.csproj

### Phase 5: AuthController - Partial
- [x] Thay UserManager/SignInManager bằng IAuthRepository
- [x] Implement Register endpoint với custom validation
- [x] Implement Login endpoint với password verification
- [x] Implement Google login
- [x] Update GetUserFromAccessTokenAsync
- [x] Thêm helper methods: ValidatePassword, HashPassword, VerifyPassword

## ⚠️ CẦN SỬA

### AuthController.cs - Còn lỗi compile
**Vấn đề:** File đang dùng SHA256 để hash password, cần cải thiện bảo mật

**Cần làm:**
1. Thay SHA256 bằng BCrypt hoặc PBKDF2 (an toàn hơn)
2. Hoặc giữ SHA256 nhưng thêm salt

**Lý do:** SHA256 không an toàn cho password vì:
- Không có salt → cùng password = cùng hash
- Quá nhanh → dễ bị brute force
- Nên dùng BCrypt/PBKDF2/Argon2

## 📋 Các bước tiếp theo

### Bước 1: Cải thiện Password Hashing
**Tùy chọn A - Dùng BCrypt (Khuyến nghị):**
```bash
cd eatfitai-backend/src/EatFitAI.Infrastructure
dotnet add package BCrypt.Net-Next
```

Sau đó update AuthController:
```csharp
private static byte[] HashPassword(string password)
{
    // BCrypt tự động thêm salt
    var hash = BCrypt.Net.BCrypt.HashPassword(password);
    return Encoding.UTF8.GetBytes(hash);
}

private static bool VerifyPassword(string password, byte[] storedHash)
{
    var hashString = Encoding.UTF8.GetString(storedHash);
    return BCrypt.Net.BCrypt.Verify(password, hashString);
}
```

**Tùy chọn B - Giữ SHA256 + Salt:**
- Thêm cột Salt vào bảng NguoiDung
- Update SP để lưu salt
- Kết hợp password + salt trước khi hash

### Bước 2: Test API
```bash
cd eatfitai-backend
dotnet build
dotnet run --project src/EatFitAI.Api
```

Test endpoints:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- POST /api/auth/refresh
- POST /api/auth/logout

### Bước 3: Xóa EF Migrations liên quan Identity (nếu có)
```bash
cd eatfitai-backend/src/EatFitAI.Infrastructure
# Kiểm tra folder Migrations/
# Xóa các migration tạo bảng AspNetUsers, AspNetRoles, etc.
```

### Bước 4: Test với Mobile App
- Chạy backend
- Chạy mobile app
- Test đăng ký, đăng nhập, Google login

## 🎯 Mục tiêu cuối cùng

✅ Backend không còn dependency vào Identity
✅ Auth hoàn toàn dùng SP + Dapper
✅ Password được hash an toàn
✅ Mobile app vẫn hoạt động bình thường
✅ Tuân thủ RULES.md: "SP-first + Dapper; EF chỉ schema"
