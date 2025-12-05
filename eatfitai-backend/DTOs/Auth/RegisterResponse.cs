namespace EatFitAI.API.DTOs.Auth
{
    /// <summary>
    /// Response khi đăng ký - chưa có token, cần xác minh email
    /// </summary>
    public class RegisterResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime VerificationCodeExpiresAt { get; set; }
        
        // DEV mode only - hiển thị mã để test
        public string? VerificationCode { get; set; }
    }
}
