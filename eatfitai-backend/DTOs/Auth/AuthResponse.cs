using System.Text.Json.Serialization;

namespace EatFitAI.API.DTOs.Auth
{
    public class AuthResponse
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        
        // Frontend expects "accessToken" không phải "token"
        [JsonPropertyName("accessToken")]
        public string Token { get; set; } = string.Empty;
        
        // Frontend expects "accessTokenExpiresAt" không phải "expiresAt"
        [JsonPropertyName("accessTokenExpiresAt")]
        public DateTime ExpiresAt { get; set; }
        
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime RefreshTokenExpiresAt { get; set; }
        
        // Cho frontend biết user cần vào Onboarding không
        public bool NeedsOnboarding { get; set; } = false;
    }
}
