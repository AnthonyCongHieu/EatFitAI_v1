using System;

namespace EatFitAI.API.Models;

/// <summary>
/// Weekly check-in record - tracks user's progress each week
/// </summary>
public class WeeklyCheckIn
{
    public int WeeklyCheckInId { get; set; }
    
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Week number since user started (week 1, 2, 3...)
    /// </summary>
    public int WeekNumber { get; set; }
    
    /// <summary>
    /// Start date of the week (Monday)
    /// </summary>
    public DateOnly WeekStartDate { get; set; }
    
    /// <summary>
    /// End date of the week (Sunday)
    /// </summary>
    public DateOnly WeekEndDate { get; set; }
    
    /// <summary>
    /// Weight at check-in (kg)
    /// </summary>
    public decimal WeightKg { get; set; }
    
    /// <summary>
    /// Weight change from previous week (negative = loss, positive = gain)
    /// </summary>
    public decimal? WeightChange { get; set; }
    
    /// <summary>
    /// Average daily calories consumed during the week
    /// </summary>
    public decimal? AvgCalories { get; set; }
    
    /// <summary>
    /// Target calories during the week
    /// </summary>
    public decimal? TargetCalories { get; set; }
    
    /// <summary>
    /// Average daily protein (g)
    /// </summary>
    public decimal? AvgProtein { get; set; }
    
    /// <summary>
    /// Average daily carbs (g)
    /// </summary>
    public decimal? AvgCarbs { get; set; }
    
    /// <summary>
    /// Average daily fat (g)
    /// </summary>
    public decimal? AvgFat { get; set; }
    
    /// <summary>
    /// Number of days logged during the week
    /// </summary>
    public int DaysLogged { get; set; }
    
    /// <summary>
    /// User's goal at the time: 'lose', 'maintain', 'gain'
    /// </summary>
    public string Goal { get; set; } = "maintain";
    
    /// <summary>
    /// AI-generated suggestion for the user
    /// </summary>
    public string? AiSuggestion { get; set; }
    
    /// <summary>
    /// Whether user is on track with their goal
    /// </summary>
    public bool IsOnTrack { get; set; }
    
    /// <summary>
    /// Suggested new calorie target (if adjustment needed)
    /// </summary>
    public decimal? SuggestedCalories { get; set; }
    
    /// <summary>
    /// User's personal notes for the week
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// When the check-in was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public virtual User User { get; set; } = null!;
}
