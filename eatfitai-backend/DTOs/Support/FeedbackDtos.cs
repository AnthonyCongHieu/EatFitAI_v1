namespace EatFitAI.API.DTOs.Support;

public sealed class FeedbackRequest
{
    public string? Category { get; set; }
    public string? Sentiment { get; set; }
    public string? Message { get; set; }
    public string? AppVersion { get; set; }
    public string? BuildNumber { get; set; }
    public string? Platform { get; set; }
    public string? DeviceModel { get; set; }
    public string? Screen { get; set; }
}

public sealed class FeedbackEmailMessage
{
    public required string RecipientEmail { get; set; }
    public required string UserEmail { get; set; }
    public string? UserDisplayName { get; set; }
    public Guid? UserId { get; set; }
    public required string Category { get; set; }
    public required string Sentiment { get; set; }
    public required string Message { get; set; }
    public string? AppVersion { get; set; }
    public string? BuildNumber { get; set; }
    public string? Platform { get; set; }
    public string? DeviceModel { get; set; }
    public string? Screen { get; set; }
    public required string TraceId { get; set; }
}
