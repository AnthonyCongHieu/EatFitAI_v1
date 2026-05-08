using EatFitAI.API.DTOs.Common;
using EatFitAI.API.DTOs.Food;

namespace EatFitAI.API.Services;

public static class FoodTrustBuilder
{
    private static readonly HashSet<string> RequiredNutrients = new(StringComparer.OrdinalIgnoreCase)
    {
        "calories",
        "protein",
        "carb",
        "fat",
    };

    public static FoodTrustSummaryDto BuildSummary(FoodItemDto food)
    {
        var missing = NormalizeMissing(food.MissingNutrients);
        var completenessScore = NormalizeCompletenessScore(food.NutrientCompletenessScore, missing);
        var trustScore = CalculateTrustScore(food, completenessScore, missing.Count);
        var status = ResolveStatus(food, completenessScore, missing.Count);

        return new FoodTrustSummaryDto
        {
            Status = status,
            Label = ResolveLabel(status),
            Score = trustScore,
            NeedsReview = status == FoodTrustStatus.NeedsReview || status == FoodTrustStatus.LowConfidence,
            MissingNutrients = missing,
        };
    }

    public static FoodTrustDetailsDto BuildDetails(FoodItemDto food)
    {
        var summary = BuildSummary(food);
        return new FoodTrustDetailsDto
        {
            Summary = summary,
            NutrientCompleteness = BuildNutrientCompleteness(food),
            Source = food.Source,
            VerifiedBy = food.VerifiedBy,
            LastReviewedAt = food.LastReviewedAt,
            Explanation = ResolveExplanation(summary),
        };
    }

    public static NutrientCompletenessDto BuildNutrientCompleteness(FoodItemDto food)
    {
        var missing = NormalizeMissing(food.MissingNutrients);
        return new NutrientCompletenessDto
        {
            Score = NormalizeCompletenessScore(food.NutrientCompletenessScore, missing),
            MissingNutrients = missing,
            HasMissingRequiredNutrients = missing.Count > 0,
        };
    }

    public static List<string> ParseMissingNutrients(string? missingNutrients)
    {
        if (string.IsNullOrWhiteSpace(missingNutrients))
        {
            return new List<string>();
        }

        return NormalizeMissing(
            missingNutrients
                .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .ToList());
    }

    public static string? SerializeMissingNutrients(IEnumerable<string>? missingNutrients)
    {
        var normalized = NormalizeMissing(missingNutrients);
        return normalized.Count == 0 ? null : string.Join(",", normalized);
    }

    private static List<string> NormalizeMissing(IEnumerable<string>? missing)
    {
        return (missing ?? Enumerable.Empty<string>())
            .Select(item => item.Trim().ToLowerInvariant())
            .Where(item => RequiredNutrients.Contains(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(item => item)
            .ToList();
    }

    private static decimal NormalizeCompletenessScore(decimal score, IReadOnlyCollection<string> missing)
    {
        if (score > 0)
        {
            return Math.Clamp(score, 0, 100);
        }

        return Math.Round(((RequiredNutrients.Count - missing.Count) / (decimal)RequiredNutrients.Count) * 100m, 0);
    }

    private static decimal CalculateTrustScore(
        FoodItemDto food,
        decimal completenessScore,
        int missingCount)
    {
        var reliability = food.ReliabilityScore > 0
            ? (decimal)Math.Clamp(food.ReliabilityScore, 0d, 1d) * 100m
            : food.IsVerified ? 95m : 50m;

        var score = (reliability * 0.6m) + (completenessScore * 0.4m);
        if (missingCount > 0)
        {
            score = Math.Min(score, 65m);
        }

        return Math.Round(Math.Clamp(score, 0m, 100m), 0);
    }

    private static string ResolveStatus(FoodItemDto food, decimal completenessScore, int missingCount)
    {
        if (missingCount > 0 || completenessScore < 100)
        {
            return FoodTrustStatus.NeedsReview;
        }

        if (food.IsVerified)
        {
            return FoodTrustStatus.Verified;
        }

        return food.ReliabilityScore >= 0.75d
            ? FoodTrustStatus.Trusted
            : FoodTrustStatus.LowConfidence;
    }

    private static string ResolveLabel(string status)
    {
        return status switch
        {
            FoodTrustStatus.Verified => "Đã kiểm chứng",
            FoodTrustStatus.Trusted => "Đáng tin cậy",
            FoodTrustStatus.NeedsReview => "Cần kiểm tra",
            _ => "Độ tin cậy thấp",
        };
    }

    private static string ResolveExplanation(FoodTrustSummaryDto summary)
    {
        return summary.Status switch
        {
            FoodTrustStatus.Verified => "Dữ liệu đã được kiểm chứng và đủ các chỉ số chính.",
            FoodTrustStatus.Trusted => "Dữ liệu đủ các chỉ số chính và có độ tin cậy tốt.",
            FoodTrustStatus.NeedsReview => "Một số chỉ số dinh dưỡng bị thiếu nên chưa được xem như giá trị 0 thật.",
            _ => "Dữ liệu chưa đủ chắc chắn, nên kiểm tra trước khi dùng làm chuẩn.",
        };
    }
}
