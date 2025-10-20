namespace EatFitAI.Domain.Users;

public class UserProfile
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? TargetWeightKg { get; set; }
    public string ActivityLevel { get; set; } = string.Empty;
    public string Goal { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public NguoiDung? User { get; set; }
}
