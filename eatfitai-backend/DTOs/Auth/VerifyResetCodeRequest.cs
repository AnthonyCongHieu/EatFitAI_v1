namespace EatFitAI.API.DTOs.Auth
{
    public class VerifyResetCodeRequest
    {
        public string Email { get; set; } = string.Empty;
        public string ResetCode { get; set; } = string.Empty;
    }
}
