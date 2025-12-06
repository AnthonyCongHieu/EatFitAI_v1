# EatFitAI Bug Fixes - Commit Notes
**Date:** 2025-12-06

## Tổng Quan

Fix 10 bugs liên quan đến authentication, UI/UX, stats display, và onboarding flow.

---

## Chi Tiết Các Fix

### 1. Lỗi Đăng Ký - Tài Khoản Tự Thêm Khi Verify Fail
**File:** `eatfitai-backend/Services/AuthService.cs`

**Vấn đề:** User đăng ký → account được thêm vào DB ngay → verify fail → account vẫn tồn tại → không thể đăng ký lại

**Fix:** Cho phép re-register email chưa verify bằng cách reset verification code:

```csharp
// BEFORE
if (await _userRepository.EmailExistsAsync(request.Email))
{
    throw new InvalidOperationException("Email đã được đăng ký");
}

// AFTER
var existingUser = await _userRepository.GetByEmailAsync(request.Email);
if (existingUser != null)
{
    if (!existingUser.EmailVerified)
    {
        // Reset verification code thay vì reject
        existingUser.PasswordHash = HashPassword(request.Password);
        existingUser.VerificationCode = HashResetCode(newCode);
        existingUser.VerificationCodeExpiry = DateTime.UtcNow.Add(VerificationCodeLifetime);
        await _context.SaveChangesAsync();
        // Gửi email và return success
    }
    throw new InvalidOperationException("Email đã được đăng ký");
}
```

---

### 2-4. Fix i18n + Profile Display
**File:** `eatfitai-mobile/src/i18n/vi.ts`

**Vấn đề:** ProfileScreen dùng keys `t('common.profile_title')` nhưng keys không tồn tại → hiển thị key name

**Fix:** Thêm 46 translation keys:

```typescript
common: {
  // ... existing keys ...
  
  // Profile Screen keys (MỚI)
  profile_title: 'Hồ sơ',
  profile_subtitle: 'Thông tin cá nhân của bạn',
  personal_info: 'Thông tin cá nhân',
  full_name: 'Họ và tên',
  height: 'Chiều cao (cm)',
  weight: 'Cân nặng (kg)',
  gender: 'Giới tính',
  age: 'Tuổi',
  goal: 'Mục tiêu',
  activity_level: 'Mức vận động',
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
  lose_weight: 'Giảm cân',
  maintain_weight: 'Duy trì',
  gain_weight: 'Tăng cân',
  sedentary: 'Ít vận động',
  light: 'Nhẹ nhàng',
  moderate: 'Vừa phải',
  active: 'Tích cực',
  very_active: 'Rất tích cực',
  // ... more keys
},
auth: {
  // ... existing keys ...
  newPassword: 'Mật khẩu mới',
  confirmNewPassword: 'Xác nhận mật khẩu mới',
  passwordUpdated: 'Mật khẩu đã được cập nhật thành công',
}
```

---

### 5. Quên Mật Khẩu - Label Không Dịch
**File:** `eatfitai-mobile/src/i18n/vi.ts`

**Vấn đề:** ForgotPasswordScreen hiển thị `auth.newPassword`, `auth.confirmNewPassword` thay vì text tiếng Việt

**Fix:** Đã thêm keys trong phần trên.

---

### 6-7. Crash + Lỗi Stats Khi Không Có Data
**File:** `eatfitai-mobile/src/app/screens/stats/WeekStatsScreen.tsx`

**Vấn đề:** `useAnimatedStyle` được gọi trong JSX → vi phạm React Hook rules → crash

**Fix:** Di chuyển animated styles lên component level:

```tsx
// BEFORE (CRASH) - useAnimatedStyle trong JSX
<Animated.View
  style={[
    styles.summaryItem,
    useAnimatedStyle(() => ({
      transform: [{ scale: highlightedCard === 0 ? cardScale.value : 1 }],
    })),
  ]}
/>

// AFTER (FIXED) - định nghĩa ở component level
const card0AnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: highlightedCard === 0 ? cardScale.value : 1 }],
}));

const card1AnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: highlightedCard === 1 ? cardScale.value : 1 }],
}));

const card2AnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: highlightedCard === 2 ? cardScale.value : 1 }],
}));

// Sử dụng trong JSX
<Animated.View style={[styles.summaryItem, card0AnimatedStyle]} />
```

---

### 8-9. Không Hiển Thị Macro
**File:** `eatfitai-mobile/src/app/screens/diary/FoodDetailScreen.tsx`

**Vấn đề:** Giá trị macro = 0 hiển thị `--` thay vì `0`

**Fix:** Sửa logic check null:

```typescript
// BEFORE - 0 bị treat như falsy
const macroValue = useCallback(
  (base?: number | null) => {
    if (!base || multiplier <= 0) return '--';  // ❌ 0 is falsy
    const value = base * multiplier;
    return `${value.toFixed(1).replace(/\.0$/, '')} g`;
  },
  [multiplier],
);

// AFTER - chỉ check null/undefined
const macroValue = useCallback(
  (base?: number | null) => {
    if (base === null || base === undefined || multiplier <= 0) return '--';  // ✅
    const value = base * multiplier;
    return `${value.toFixed(1).replace(/\.0$/, '')} g`;
  },
  [multiplier],
);
```

---

### 10. Login Không Redirect Onboarding
**Files:** 
- `eatfitai-mobile/src/store/useAuthStore.ts`
- `eatfitai-mobile/src/app/screens/auth/LoginScreen.tsx`
- `eatfitai-backend/Services/AuthService.cs`

**Vấn đề:** User verify email → chưa nhập thông tin → login lại → vào thẳng Home (bỏ qua Onboarding)

**Fix 1:** Backend trả về `NeedsOnboarding` trong LoginAsync:

```csharp
// AuthService.cs - LoginAsync
return new AuthResponse
{
    UserId = user.UserId,
    Email = user.Email,
    Token = token,
    // ... other fields ...
    NeedsOnboarding = !user.OnboardingCompleted  // MỚI
};
```

**Fix 2:** AuthStore trả về needsOnboarding:

```typescript
// useAuthStore.ts
login: async (email, password) => {
  const resp = await apiClient.post<AuthTokensResponse & { needsOnboarding?: boolean }>(...);
  // ... save tokens ...
  return { needsOnboarding: data?.needsOnboarding ?? false };  // MỚI
},
```

**Fix 3:** LoginScreen check và redirect:

```typescript
// LoginScreen.tsx
const onSubmit = useCallback(async (values: LoginValues) => {
  const result = await login(values.email, values.password);
  
  // Navigate based on onboarding status
  if (result.needsOnboarding) {
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  } else {
    navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
  }
}, [login, navigation]);
```

---

### 11. Fix Syntax Error Pre-existing
**File:** `eatfitai-backend/Controllers/AuthController.cs`

**Vấn đề:** Duplicate catch block

**Fix:**
```csharp
// BEFORE (broken)
catch (Exception ex) {
catch (Exception ex) {  // duplicate!
    ...
}
}

// AFTER (fixed)
catch (Exception ex) {
    _logger.LogError(ex, "Error during registration with verification");
    throw;
}
```

---

## Testing Checklist

- [ ] Đăng ký tài khoản mới → verify → vào Onboarding
- [ ] Đăng ký lại với email chưa verify → nhận mã mới
- [ ] Login account chưa complete onboarding → vào Onboarding
- [ ] Login account đã complete onboarding → vào Home
- [ ] Xem Profile → text tiếng Việt đúng
- [ ] Xem Stats tuần/tháng trước (không có data) → không crash
- [ ] Xem chi tiết món ăn → hiển thị macro đúng (kể cả giá trị 0)
- [ ] Quên mật khẩu → label tiếng Việt đúng

---

## Chưa Thực Hiện

### Feature: Nhận Diện Nguyên Liệu
Scope lớn, cần phase riêng.
