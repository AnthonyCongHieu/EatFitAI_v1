namespace EatFitAI.API.Services;

public static class DayCompletenessStatus
{
    public const string Empty = "empty";
    public const string Partial = "partial";
    public const string Complete = "complete";
}

public static class FoodTrustStatus
{
    public const string Verified = "verified";
    public const string Trusted = "trusted";
    public const string NeedsReview = "needs_review";
    public const string LowConfidence = "low_confidence";
}

public static class LapseTier
{
    public const string Active = "active";
    public const string Slipping = "slipping";
    public const string Recovery = "recovery";
    public const string Restart = "restart";
}
