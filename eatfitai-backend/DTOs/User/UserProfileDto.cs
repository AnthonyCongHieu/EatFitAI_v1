namespace EatFitAI.API.DTOs.User
{
    public class UserProfileDto : UserDto
    {
        public decimal? CurrentHeightCm { get; set; }
        public decimal? CurrentWeightKg { get; set; }
        public DateOnly? LastMeasuredDate { get; set; }
    }
}
