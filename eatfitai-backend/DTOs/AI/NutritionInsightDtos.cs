using System;
using System.Collections.Generic;

namespace EatFitAI.API.DTOs.AI
{
    /// <summary>
    /// Request for personalized nutrition insights
    /// </summary>
    public class NutritionInsightRequest
    {
        /// <summary>
        /// Number of days to analyze (default: 30)
        /// </summary>
        public int AnalysisDays { get; set; } = 30;

        /// <summary>
        /// Include meal timing analysis
        /// </summary>
        public bool IncludeMealTiming { get; set; } = true;

        /// <summary>
        /// Include macro distribution analysis
        /// </summary>
        public bool IncludeMacroAnalysis { get; set; } = true;
    }

    /// <summary>
    /// Personalized nutrition insights based on user history
    /// </summary>
    public class NutritionInsightDto
    {
        /// <summary>
        /// Overall adherence score (0-100)
        /// </summary>
        public decimal AdherenceScore { get; set; }

        /// <summary>
        /// Average daily calorie intake
        /// </summary>
        public decimal AverageDailyCalories { get; set; }

        /// <summary>
        /// Average daily protein intake (grams)
        /// </summary>
        public decimal AverageDailyProtein { get; set; }

        /// <summary>
        /// Average daily carbs intake (grams)
        /// </summary>
        public decimal AverageDailyCarbs { get; set; }

        /// <summary>
        /// Average daily fat intake (grams)
        /// </summary>
        public decimal AverageDailyFat { get; set; }

        /// <summary>
        /// Current target values
        /// </summary>
        public NutritionTargetDto CurrentTarget { get; set; } = default!;

        /// <summary>
        /// Recommended adjustments
        /// </summary>
        public List<NutritionRecommendationDto> Recommendations { get; set; } = new();

        /// <summary>
        /// Meal timing insights
        /// </summary>
        public MealTimingInsightDto? MealTimingInsight { get; set; }

        /// <summary>
        /// Macro distribution insights
        /// </summary>
        public MacroDistributionInsightDto? MacroDistributionInsight { get; set; }

        /// <summary>
        /// Progress trend (improving, stable, declining)
        /// </summary>
        public string ProgressTrend { get; set; } = "stable";

        /// <summary>
        /// Days analyzed
        /// </summary>
        public int DaysAnalyzed { get; set; }
    }

    /// <summary>
    /// Current nutrition target
    /// </summary>
    public class NutritionTargetDto
    {
        public int TargetCalories { get; set; }
        public int TargetProtein { get; set; }
        public int TargetCarbs { get; set; }
        public int TargetFat { get; set; }
    }

    /// <summary>
    /// Nutrition recommendation
    /// </summary>
    public class NutritionRecommendationDto
    {
        /// <summary>
        /// Recommendation type (increase_protein, reduce_carbs, etc.)
        /// </summary>
        public string Type { get; set; } = default!;

        /// <summary>
        /// Human-readable message
        /// </summary>
        public string Message { get; set; } = default!;

        /// <summary>
        /// Priority (high, medium, low)
        /// </summary>
        public string Priority { get; set; } = "medium";

        /// <summary>
        /// Suggested adjustment value
        /// </summary>
        public decimal? SuggestedValue { get; set; }

        /// <summary>
        /// Reasoning behind recommendation
        /// </summary>
        public string Reasoning { get; set; } = default!;
    }

    /// <summary>
    /// Meal timing insights
    /// </summary>
    public class MealTimingInsightDto
    {
        /// <summary>
        /// Average meals per day
        /// </summary>
        public decimal AverageMealsPerDay { get; set; }

        /// <summary>
        /// Most common meal times
        /// </summary>
        public List<string> CommonMealTimes { get; set; } = new();

        /// <summary>
        /// Suggested meal distribution
        /// </summary>
        public Dictionary<string, decimal> SuggestedDistribution { get; set; } = new();

        /// <summary>
        /// Insights about meal timing
        /// </summary>
        public List<string> Insights { get; set; } = new();
    }

    /// <summary>
    /// Macro distribution insights
    /// </summary>
    public class MacroDistributionInsightDto
    {
        /// <summary>
        /// Current protein percentage
        /// </summary>
        public decimal ProteinPercentage { get; set; }

        /// <summary>
        /// Current carbs percentage
        /// </summary>
        public decimal CarbsPercentage { get; set; }

        /// <summary>
        /// Current fat percentage
        /// </summary>
        public decimal FatPercentage { get; set; }

        /// <summary>
        /// Recommended protein percentage
        /// </summary>
        public decimal RecommendedProteinPercentage { get; set; }

        /// <summary>
        /// Recommended carbs percentage
        /// </summary>
        public decimal RecommendedCarbsPercentage { get; set; }

        /// <summary>
        /// Recommended fat percentage
        /// </summary>
        public decimal RecommendedFatPercentage { get; set; }

        /// <summary>
        /// Macro balance quality (excellent, good, needs_improvement)
        /// </summary>
        public string BalanceQuality { get; set; } = "good";

        /// <summary>
        /// Insights about macro distribution
        /// </summary>
        public List<string> Insights { get; set; } = new();
    }

    /// <summary>
    /// Request for adaptive nutrition target adjustment
    /// </summary>
    public class AdaptiveTargetRequest
    {
        /// <summary>
        /// Days to analyze for adaptation (default: 14)
        /// </summary>
        public int AnalysisDays { get; set; } = 14;

        /// <summary>
        /// Apply adjustments automatically
        /// </summary>
        public bool AutoApply { get; set; } = false;
    }

    /// <summary>
    /// Adaptive nutrition target response
    /// </summary>
    public class AdaptiveTargetDto
    {
        /// <summary>
        /// Current targets
        /// </summary>
        public NutritionTargetDto CurrentTarget { get; set; } = default!;

        /// <summary>
        /// Suggested new targets
        /// </summary>
        public NutritionTargetDto SuggestedTarget { get; set; } = default!;

        /// <summary>
        /// Adjustment reasoning
        /// </summary>
        public List<string> AdjustmentReasons { get; set; } = new();

        /// <summary>
        /// Confidence score (0-100)
        /// </summary>
        public decimal ConfidenceScore { get; set; }

        /// <summary>
        /// Whether targets were auto-applied
        /// </summary>
        public bool Applied { get; set; }
    }
}
