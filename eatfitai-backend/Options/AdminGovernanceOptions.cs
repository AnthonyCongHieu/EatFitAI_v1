namespace EatFitAI.API.Options;

public sealed class AdminGovernanceOptions
{
    public List<AdminSeedMembershipOptions> SeedMemberships { get; init; } = new();
}

public sealed class AdminSeedMembershipOptions
{
    public string? UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? DisplayName { get; init; }
    public string Role { get; init; } = "user";
    public string AccessState { get; init; } = "active";
    public bool ProvisionIfMissing { get; init; }
}
