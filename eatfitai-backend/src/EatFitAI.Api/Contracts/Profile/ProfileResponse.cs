using System;

namespace EatFitAI.Api.Contracts.Profile;

public sealed class ProfileResponse
{
    public Guid UserId { get; init; }
    public string? FullName { get; init; }
    public string? Gender { get; init; }
    public DateOnly? DateOfBirth { get; init; }
    public decimal? HeightCm { get; init; }
    public decimal? TargetWeightKg { get; init; }
    public string? ActivityLevel { get; init; }
    public string? Goal { get; init; }
    public string? AvatarUrl { get; init; }
}

