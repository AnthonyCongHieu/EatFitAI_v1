namespace EatFitAI.API.DTOs.User
{
    public class UserProfileDto : UserDto
    {
        public string? AvatarUrl { get; set; }
        public decimal? CurrentHeightCm { get; set; }
        public decimal? CurrentWeightKg { get; set; }
        public DateOnly? LastMeasuredDate { get; set; }
        
        // Profile 2026 - Gamification & Goal Tracking
        public decimal? TargetWeightKg { get; set; }
        public int CurrentStreak { get; set; }
        public int LongestStreak { get; set; }
    }
}
