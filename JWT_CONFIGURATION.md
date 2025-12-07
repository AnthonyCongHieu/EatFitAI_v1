# 🔐 JWT Configuration - EatFitAI Backend

> **Date**: 2025-12-07  
> **Status**: ✅ JWT Key đã được cấu hình

---

## 📋 Tổng Quan User Secrets

### Complete User Secrets List

| Key | Value | Type |
|-----|-------|------|
| `Jwt:Key` | `T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0=` | JWT Secret |
| `Smtp:Host` | `smtp.gmail.com` | SMTP Config |
| `Smtp:Port` | `587` | SMTP Config |
| `Smtp:User` | `dinhconghieudch1610@gmail.com` | SMTP Config |
| `Smtp:Password` | `lwmhoclsjcypsmrv` | App Password |
| `Smtp:FromEmail` | `dinhconghieudch1610@gmail.com` | SMTP Config |

---

## 🔑 JWT Secret Key

### 1. Hiện Tại Đang Dùng JWT Gì?

**Algorithm**: `HMAC-SHA256` (HS256)

**JWT Configuration** (appsettings.json):
```json
{
  "Jwt": {
    "Key": "REPLACE_WITH_USER_SECRET",  ← Override bởi User Secrets
    "Issuer": "EatFitAI",
    "Audience": "EatFitAI",
    "ExpiryInMinutes": 1440  ← Token hết hạn sau 24h
  }
}
```

**JWT Key từ User Secrets**:
```
T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0=
```

- **Format**: Base64-encoded  
- **Length**: 256-bit (32 bytes)
- **Algorithm**: HMAC-SHA256

---

### 2. Code Sử Dụng JWT Key

**AuthService.cs** (dòng 160, 203):
```csharp
// Đọc JWT Key từ configuration (User Secrets override appsettings)
var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "default-secret-key");

// Validate token
var tokenHandler = new JwtSecurityTokenHandler();
tokenHandler.ValidateToken(token, new TokenValidationParameters
{
    ValidateIssuerSigningKey = true,
    IssuerSigningKey = new SymmetricSecurityKey(key),  ← Dùng key để verify
    ValidateIssuer = false,
    ValidateAudience = false,
    ClockSkew = TimeSpan.Zero
}, out SecurityToken validatedToken);
```

**Generate Token**:
```csharp
private string GenerateJwtToken(User user)
{
    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "default-secret-key");
    
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email)
        }),
        Expires = DateTime.UtcNow.AddHours(24),
        SigningCredentials = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256Signature)  ← HS256
    };
    
    var token = tokenHandler.CreateToken(tokenDescriptor);
    return tokenHandler.WriteToken(token);
}
```

---

### 3. Cách Tạo JWT Secret Key

#### Option 1: PowerShell (Recommended)
```powershell
# Generate 256-bit (32 bytes) random key
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Output example: T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0=
```

#### Option 2: .NET CLI
```bash
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 32)"
```

#### Option 3: Online Tool (Not Recommended for Production)
- https://generate-random.org/encryption-key-generator
- Select: 256-bit, Base64

#### Option 4: C# Code
```csharp
using System.Security.Cryptography;

var bytes = new byte[32];
RandomNumberGenerator.Fill(bytes);
var key = Convert.ToBase64String(bytes);
Console.WriteLine(key);
```

---

### 4. Đã Tạo và Add vào User Secrets

**Command đã thực hiện**:
```bash
cd d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\eatfitai-backend
dotnet user-secrets set "Jwt:Key" "T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0="

# Output:
# Successfully saved Jwt:Key to the secret store.
```

**Verify**:
```bash
dotnet user-secrets list

# Output:
# Jwt:Key = T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0=
# Smtp:User = dinhconghieudch1610@gmail.com
# Smtp:Port = 587
# Smtp:Password = lwmhoclsjcypsmrv
# Smtp:Host = smtp.gmail.com
# Smtp:FromEmail = dinhconghieudch1610@gmail.com
```

---

## 🔒 JWT Token Structure

### Token Example
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI2MmRmYzQ5Yy0xMjM2LTRmNWMtOWQ3OC00ZjBmM2I5YThlNzQiLCJlbWFpbCI6InRlc3QxMjM0NTZAZXhhbXBsZS5jb20iLCJ1bmlxdWVfbmFtZSI6IlRlc3QgVXNlciIsIm5iZiI6MTczMzU2NDM4NiwiZXhwIjoxNzMzNjUwNzg2LCJpYXQiOjE3MzM1NjQzODZ9.6-XrdCvifu_SVlwWJoqbYLl4SXCTT-1qmD9SDyZqy1i4
```

### Decoded Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Decoded Payload
```json
{
  "nameid": "62dfc49c-1236-4f5c-9d78-4f0f3b9a8e74",
  "email": "test123456@example.com",
  "unique_name": "Test User",
  "nbf": 1733564386,
  "exp": 1733650786,  ← Expires: 24h from issued
  "iat": 1733564386
}
```

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0=  ← Secret Key
)
```

---

## ⚠️ Security Best Practices

### ✅ Good
- [x] JWT key lưu trong User Secrets (không commit vào Git)
- [x] 256-bit key (đủ mạnh cho HS256)
- [x] Random key từ cryptographic RNG
- [x] Token expiry: 24h (không quá dài)
- [x] Refresh token rotation implemented

### ❌ Avoid
- [ ] Hardcode JWT key trong code
- [ ] Dùng weak key (< 256-bit cho HS256)
- [ ] Commit secrets vào Git
- [ ] Token không có expiry
- [ ] Dùng key dễ đoán (e.g., "secret", "password123")

---

## 🔄 Rotate JWT Key (Nếu Cần)

### Khi Nào Cần Rotate?

1. **Security breach**: Key bị lộ
2. **Compliance**: Policy yêu cầu rotate định kỳ
3. **Team member leaves**: Người biết key rời khỏi team

### Cách Rotate

```bash
# 1. Generate new key
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$newKey = [Convert]::ToBase64String($bytes)

# 2. Update user secrets
cd d:\Project\PTUD eatfitAL\coding\EatFitAI_v1\eatfitai-backend
dotnet user-secrets set "Jwt:Key" "$newKey"

# 3. Restart backend
# All old tokens will be invalid!
```

⚠️ **Warning**: Rotating key sẽ invalidate TẤT CẢ tokens hiện tại. Users phải login lại.

---

## 📊 JWT vs Refresh Token

| Feature | Access Token (JWT) | Refresh Token |
|---------|-------------------|---------------|
| **Expiry** | 24h | 30 days |
| **Purpose** | API authorization | Renew access token |
| **Storage** | Memory | Secure storage |
| **Rotation** | No | Yes (mỗi lần refresh) |
| **Revocable** | No (stateless) | Yes (stored in DB) |

---

## 🧪 Test JWT Token

### Using Postman/Thunder Client

```http
POST http://localhost:5247/api/auth/verify-email
Content-Type: application/json

{
  "email": "test@example.com",
  "verificationCode": "123456"
}
```

**Response**:
```json
{
  "token": "eyJhbG...",  ← Access Token (JWT)
  "refreshToken": "Xqu3NcD...",
  "expiresAt": "2025-12-08T14:00:00Z"
}
```

### Verify Token at jwt.io

1. Copy token
2. Go to https://jwt.io
3. Paste token
4. In "Verify Signature" section:
   - Algorithm: HS256
   - Secret: `T34Fos2mCCnsp8SLe3HG/3K6Uzj2a809p+RFh6Bx7o0=`
5. Should show "Signature Verified" ✅

---

**END OF DOCUMENTATION**
