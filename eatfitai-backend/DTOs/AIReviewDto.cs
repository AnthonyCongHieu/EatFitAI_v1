using System;

namespace EatFitAI.API.DTOs;

/// <summary>
/// Review trigger information
/// </summary>
public class ReviewTriggerDto
{
    public int Level { get; set; }
    public string Type { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public string? Priority { get; set; }
    public int? DataQuality { get; set; }
    public string? Reason { get; set; }
    public string? Encouragement { get; set; }
    public DateTime? NextReviewEstimate { get; set; }
}

/// <summary>
/// Weekly review result
/// </summary>
public class WeeklyReviewDto
{
    public string Status { get; set; } = string.Empty; // CONTINUE, UPDATE_NEEDED, NEED_MORE_DATA, CONTINUE_WITH_WARNING
    public string Message { get; set; } = string.Empty;
    public decimal Confidence { get; set; } // 0-1
    public int DataQuality { get; set; } // 0-100
    
    public SuggestedActionsDto? SuggestedActions { get; set; }
    public InsightsDto Insights { get; set; } = new();
}

public class SuggestedActionsDto
{
    public string Type { get; set; } = string.Empty; // CALORIES, MACROS, LIFESTYLE, TRACKING
    public int? NewTargetCalories { get; set; }
    public MacrosDto? NewMacros { get; set; }
    public List<string> LifestyleChanges { get; set; } = new();
    public List<string> TrackingTips { get; set; } = new();
}

public class MacrosDto
{
    public int Protein { get; set; }
    public int Carbs { get; set; }
    public int Fat { get; set; }
}

public class InsightsDto
{
    public string WeightTrend { get; set; } = string.Empty; // improving, stable, concerning
    public decimal ComplianceScore { get; set; } // %
    public string EnergyLevel { get; set; } = string.Empty; // low, normal, high
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// Aggregated user data for analysis
/// </summary>
public class UserWeekDataDto
{
    public int DaysSinceStart { get; set; }
    public int DaysLogged { get; set; }
    public decimal? CurrentWeight { get; set; }
    public decimal? StartWeight { get; set; }
    public decimal? WeightChange { get; set; }
    
    public decimal AvgCalories { get; set; }
    public int TargetCalories { get; set; }
    public decimal AvgProtein { get; set; }
    public decimal AvgCarbs { get; set; }
    public decimal AvgFat { get; set; }
    
    public int? SleepQuality { get; set; }
    public int? HungerLevel { get; set; }
    public int? StressLevel { get; set; }
    
    public string Goal { get; set; } = "maintain";
    
    public DateTime? LastReviewDate { get; set; }
}
