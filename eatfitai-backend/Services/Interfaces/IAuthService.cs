using EatFitAI.API.DTOs.Auth;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IAuthService
    {
        // Registration với email verification (không cấp token ngay)
        Task<RegisterResponse> RegisterWithVerificationAsync(RegisterRequest request);
        
        // Xác minh email bằng mã 6 số
        Task<AuthResponse> VerifyEmailAsync(VerifyEmailRequest request);
        
        // Gửi lại mã xác minh
        Task<RegisterResponse> ResendVerificationAsync(ResendVerificationRequest request);
        
        // Legacy - giữ lại cho backward compatibility
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<bool> ValidateTokenAsync(string token);
        Task<Guid?> GetUserIdFromTokenAsync(string token);
        Task LogoutAsync(string refreshToken);
        Task<AuthResponse> RefreshTokenAsync(string refreshToken);
        Task<AuthResponse> GoogleLoginAsync(string idToken);
        Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task VerifyResetCodeAsync(VerifyResetCodeRequest request);
        Task ResetPasswordAsync(ResetPasswordRequest request);
        
        // Mark onboarding as completed
        Task MarkOnboardingCompletedAsync(Guid userId);
        
        // Change password
        Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
    }
}
