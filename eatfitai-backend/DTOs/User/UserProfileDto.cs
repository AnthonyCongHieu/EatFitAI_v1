namespace EatFitAI.API.DTOs.User
{
    public class UserProfileDto : UserDto
    {
        public string? AvatarUrl { get; set; }
        public decimal? CurrentHeightCm { get; set; }
        public decimal? CurrentWeightKg { get; set; }
        public DateOnly? LastMeasuredDate { get; set; }
    }
}
