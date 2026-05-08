using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class FoodTrustBuilderTests
{
    [Fact]
    public void BuildSummary_VerifiedCompleteFood_ReturnsVerifiedTrust()
    {
        var food = new FoodItemDto
        {
            FoodItemId = 1,
            FoodName = "Cơm trắng",
            CaloriesPer100g = 130,
            ProteinPer100g = 2.7m,
            CarbPer100g = 28,
            FatPer100g = 0.3m,
            IsVerified = true,
            VerifiedBy = "Admin",
            ReliabilityScore = 0.95,
            NutrientCompletenessScore = 100
        };

        var summary = FoodTrustBuilder.BuildSummary(food);

        Assert.Equal(FoodTrustStatus.Verified, summary.Status);
        Assert.Equal("Đã kiểm chứng", summary.Label);
        Assert.False(summary.NeedsReview);
        Assert.Empty(summary.MissingNutrients);
    }

    [Fact]
    public void BuildSummary_MissingBarcodeMacros_ReturnsNeedsReviewAndKeepsMissingNames()
    {
        var food = new FoodItemDto
        {
            FoodItemId = 2,
            FoodName = "Sữa chua mã vạch",
            CaloriesPer100g = 90,
            ProteinPer100g = 0,
            CarbPer100g = 12,
            FatPer100g = 0,
            Source = "provider",
            IsVerified = false,
            ReliabilityScore = 0.5,
            MissingNutrients = new List<string> { "protein", "fat" },
            NutrientCompletenessScore = 50
        };

        var summary = FoodTrustBuilder.BuildSummary(food);
        var details = FoodTrustBuilder.BuildDetails(food);

        Assert.Equal(FoodTrustStatus.NeedsReview, summary.Status);
        Assert.Equal("Cần kiểm tra", summary.Label);
        Assert.True(summary.NeedsReview);
        Assert.Contains("protein", summary.MissingNutrients);
        Assert.Contains("fat", summary.MissingNutrients);
        Assert.True(details.NutrientCompleteness.HasMissingRequiredNutrients);
        Assert.Equal(50, details.NutrientCompleteness.Score);
    }
}
