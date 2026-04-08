namespace EatFitAI.API.DTOs.AI;

public class AiCorrectionRequestDto
{
    public string Label { get; set; } = default!;

    public int? FoodItemId { get; set; }

    public double? DetectedConfidence { get; set; }

    public string? SelectedFoodName { get; set; }

    public string? Source { get; set; }

    public DateTimeOffset? ClientTimestamp { get; set; }
}

public class AiCorrectionStatsDto
{
    public int TotalCorrections { get; set; }

    public int TodayCorrections { get; set; }

    public List<AiCorrectionBucketDto> TopSources { get; set; } = new();

    public List<AiCorrectionBucketDto> TopCorrectedLabels { get; set; } = new();
}

public class AiCorrectionBucketDto
{
    public string Value { get; set; } = string.Empty;

    public int Count { get; set; }
}
