namespace EatFitAI.Application.Configuration;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public int AccessMinutes { get; set; } = 30;
    public int RefreshDays { get; set; } = 30;
}
