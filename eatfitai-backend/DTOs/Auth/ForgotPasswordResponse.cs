namespace EatFitAI.API.DTOs.Auth
{
    public class ForgotPasswordResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        // Returned so mobile can show/reset without email provider; replace with email delivery in production.
        public string ResetCode { get; set; } = string.Empty;
    }
}
