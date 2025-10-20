using System.ComponentModel.DataAnnotations;

namespace EatFitAI.Api.Contracts.Profile;

public sealed class ProfileUpdateRequest
{
    [MaxLength(200)]
    public string? FullName { get; set; }

    [MaxLength(50)]
    public string? Gender { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public decimal? HeightCm { get; set; }

    public decimal? TargetWeightKg { get; set; }

    [MaxLength(50)]
    public string? ActivityLevel { get; set; }

    [MaxLength(100)]
    public string? Goal { get; set; }

    [Url]
    public string? AvatarUrl { get; set; }
}

