namespace EatFitAI.API.Models;

public class PushCampaign
{
    public Guid PushCampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string DataJson { get; set; } = "{}";
    public string AudienceFilterJson { get; set; } = "{}";
    public string Status { get; set; } = "draft";
    public DateTime? ScheduledAt { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TargetCount { get; set; }
    public int DeliveredCount { get; set; }
    public int FailedCount { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public virtual ICollection<PushCampaignDelivery> Deliveries { get; set; } = new List<PushCampaignDelivery>();
}
