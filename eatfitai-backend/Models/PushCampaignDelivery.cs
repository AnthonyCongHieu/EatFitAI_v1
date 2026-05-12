namespace EatFitAI.API.Models;

public class PushCampaignDelivery
{
    public Guid PushCampaignDeliveryId { get; set; }
    public Guid PushCampaignId { get; set; }
    public Guid PushDeviceId { get; set; }
    public string ExpoPushToken { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public string? TicketId { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public int AttemptCount { get; set; }
    public DateTime? NextAttemptAt { get; set; }
    public DateTime? LastAttemptAt { get; set; }
    public DateTime? ReceiptCheckedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public virtual PushCampaign? Campaign { get; set; }
    public virtual PushDevice? Device { get; set; }
}
