using EatFitAI.API.Data;
using EatFitAI.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

/// <summary>
/// AI Weekly Review Service - Intelligent analysis và suggestions
/// </summary>
public class AIReviewService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AIReviewService> _logger;

    public AIReviewService(ApplicationDbContext db, ILogger<AIReviewService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Check if review should trigger
    /// </summary>
    public async Task<ReviewTriggerDto> CheckReviewTrigger(Guid userId)
    {
        var userData = await AggregateUserData(userId);
        
        // Manual request always allowed (Level 4)
        // For now, we'll implement automatic triggers only
        
        var daysSinceStart = userData.DaysSinceStart;
        var daysLogged = userData.DaysLogged;
        var lastReviewDate = userData.LastReviewDate;
        
        // Level 1: Quick Check (3-4 days)
        if (daysSinceStart >= 3 && daysSinceStart < 7 && daysLogged >= 2)
        {
            return new ReviewTriggerDto
            {
                Level = 1,
                Type = "QUICK_CHECK",
                Enabled = true,
                Priority = "low",
                DataQuality = CalculateDataQuality(userData)
            };
        }
        
        // Level 2: First Weekly (7-10 days)
        if (daysSinceStart >= 7 && daysSinceStart <= 10 && lastReviewDate == null)
        {
            if (daysLogged >= 5 && userData.CurrentWeight != null)
            {
                return new ReviewTriggerDto
                {
                    Level = 2,
                    Type = "FIRST_WEEKLY",
                    Enabled = true,
                    Priority = "high",
                    DataQuality = CalculateDataQuality(userData)
                };
            }
            else
            {
                return new ReviewTriggerDto
                {
                    Level = 2,
                    Type = "FIRST_WEEKLY",
                    Enabled = false,
                    Reason = $"Cần {5 - daysLogged} ngày log nữa và đo cân nặng",
                    Encouragement = "Gần rồi! Tiếp tục log để nhận review đầu tiên!"
                };
            }
        }
        
        // Level 3: Bi-weekly (14+ days since last review)
        if (lastReviewDate != null)
        {
            var daysSinceLastReview = (DateTime.UtcNow - lastReviewDate.Value).Days;
            
            if (daysSinceLastReview >= 14 && daysLogged >= 10 && userData.WeeklyCheckInCount >= 2)
            {
                return new ReviewTriggerDto
                {
                    Level = 3,
                    Type = "BI_WEEKLY_DEEP",
                    Enabled = true,
                    Priority = "medium",
                    DataQuality = CalculateDataQuality(userData)
                };
            }
        }
        
        // Alternative: Post check-in trigger
        var latestCheckIn = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .FirstOrDefaultAsync();
            
        if (latestCheckIn != null)
        {
            var hoursSinceCheckIn = (DateTime.UtcNow - latestCheckIn.CreatedAt).TotalHours;
            
            if (hoursSinceCheckIn < 24 && daysLogged >= 5)
            {
                return new ReviewTriggerDto
                {
                    Level = 2,
                    Type = "POST_CHECKIN",
                    Enabled = true,
                    Priority = "high",
                    Reason = "Fresh weekly check-in data available!"
                };
            }
        }
        
        // Not ready yet
        return new ReviewTriggerDto
        {
            Enabled = false,
            NextReviewEstimate = CalculateNextReviewDate(userData)
        };
    }

    /// <summary>
    /// Analyze weekly progress và generate suggestions
    /// </summary>
    public async Task<WeeklyReviewDto> AnalyzeWeeklyProgress(Guid userId)
    {
        var userData = await AggregateUserData(userId);
        var dataQuality = CalculateDataQuality(userData);
        
        // Not enough data
        if (dataQuality < 50)
        {
            return new WeeklyReviewDto
            {
                Status = "NEED_MORE_DATA",
                Message = $"Chỉ log {userData.DaysLogged}/7 ngày. Hãy log đầy đủ hơn!",
                Confidence = 0.3m,
                DataQuality = dataQuality,
                Insights = new InsightsDto
                {
                    ComplianceScore = (userData.DaysLogged / 7m) * 100,
                    Recommendations = new List<string> 
                    { 
                        "Set reminder hàng ngày",
                        "Use AI scan để nhanh hơn"
                    }
                }
            };
        }
        
        // Analyze based on goal
        return userData.Goal.ToLower() switch
        {
            "lose" => AnalyzeWeightLoss(userData, dataQuality),
            "gain" => AnalyzeWeightGain(userData, dataQuality),
            "maintain" => AnalyzeMaintain(userData, dataQuality),
            _ => AnalyzeMaintain(userData, dataQuality)
        };
    }

    #region Analysis Methods

    private WeeklyReviewDto AnalyzeWeightLoss(UserWeekDataDto data, int quality)
    {
        var weightChange = data.WeightChange ?? 0;
        var calorieDeficit = data.TargetCalories - (int)data.AvgCalories;
        
        // Good progress
        if (weightChange < -0.3m && weightChange > -1m)
        {
            return new WeeklyReviewDto
            {
                Status = "CONTINUE",
                Message = $"✅ Giảm cân ổn ({Math.Abs(weightChange):F1}kg/tuần). Tiếp tục!",
                Confidence = 0.9m,
                DataQuality = quality,
                Insights = CreateInsights(data, "improving")
            };
        }
        
        // Too slow
        if (weightChange >= 0 || weightChange > -0.2m)
        {
            if (calorieDeficit < 200)
            {
                return new WeeklyReviewDto
                {
                    Status = "UPDATE_NEEDED",
                    Message = "Cân nặng chưa giảm. Cần giảm calories.",
                    Confidence = 0.85m,
                    DataQuality = quality,
                    SuggestedActions = new SuggestedActionsDto
                    {
                        Type = "CALORIES",
                        NewTargetCalories = data.TargetCalories - 150
                    },
                    Insights = CreateInsights(data, "stable")
                };
            }
            
            // Check lifestyle factors
            if (data.HungerLevel > 4 || data.SleepQuality < 3)
            {
                return new WeeklyReviewDto
                {
                    Status = "UPDATE_NEEDED",
                    Message = "Stress/thiếu ngủ ảnh hưởng. Điều chỉnh lifestyle.",
                    Confidence = 0.75m,
                    DataQuality = quality,
                    SuggestedActions = new SuggestedActionsDto
                    {
                        Type = "LIFESTYLE",
                        LifestyleChanges = new List<string>
                        {
                            "Ưu tiên 7-8h ngủ",
                            "Tăng protein buổi sáng +20g",
                            "Meal prep cuối tuần"
                        }
                    },
                    Insights = CreateInsights(data, "concerning")
                };
            }
        }
        
        // Too fast
        if (weightChange < -1.5m)
        {
            return new WeeklyReviewDto
            {
                Status = "UPDATE_NEEDED",
                Message = "⚠️ Giảm quá nhanh! Tăng calories để bền vững.",
                Confidence = 0.9m,
                DataQuality = quality,
                SuggestedActions = new SuggestedActionsDto
                {
                    Type = "CALORIES",
                    NewTargetCalories = data.TargetCalories + 150
                },
                Insights = CreateInsights(data, "concerning")
            };
        }
        
        // Default
        return CreateDefaultReview(data, quality);
    }

    private WeeklyReviewDto AnalyzeWeightGain(UserWeekDataDto data, int quality)
    {
        var weightChange = data.WeightChange ?? 0;
        
        if (weightChange > 0.3m)
        {
            return new WeeklyReviewDto
            {
                Status = "CONTINUE",
                Message = $"✅ Tăng cân tốt (+{weightChange:F1}kg)!",
                Confidence = 0.9m,
                DataQuality = quality,
                Insights = CreateInsights(data, "improving")
            };
        }
        
        if (weightChange <= 0)
        {
            return new WeeklyReviewDto
            {
                Status = "UPDATE_NEEDED",
                Message = "Cân nặng chưa tăng. Tăng calories +200-300.",
                Confidence = 0.85m,
                DataQuality = quality,
                SuggestedActions = new SuggestedActionsDto
                {
                    Type = "CALORIES",
                    NewTargetCalories = data.TargetCalories + 250
                },
                Insights = CreateInsights(data, "stable")
            };
        }
        
        return CreateDefaultReview(data, quality);
    }

    private WeeklyReviewDto AnalyzeMaintain(UserWeekDataDto data, int quality)
    {
        var weightChange = Math.Abs(data.WeightChange ?? 0);
        
        if (weightChange < 0.5m)
        {
            return new WeeklyReviewDto
            {
                Status = "CONTINUE",
                Message = "✅ Cân nặng ổn định. Duy trì tốt!",
                Confidence = 0.9m,
                DataQuality = quality,
                Insights = CreateInsights(data, "stable")
            };
        }
        
        return CreateDefaultReview(data, quality);
    }

    private WeeklyReviewDto CreateDefaultReview(UserWeekDataDto data, int quality)
    {
        return new WeeklyReviewDto
        {
            Status = "CONTINUE",
            Message = "Tiếp tục theo dõi và check-in tuần sau!",
            Confidence = 0.7m,
            DataQuality = quality,
            Insights = CreateInsights(data, "stable")
        };
    }

    private InsightsDto CreateInsights(UserWeekDataDto data, string trend)
    {
        var complianceScore = (data.DaysLogged / 7m) * 100;
        var recommendations = new List<string>();
        
        if (complianceScore < 70)
        {
            recommendations.Add("Log meals đều đặn hơn");
        }
        
        if (data.SleepQuality.HasValue && data.SleepQuality < 3)
        {
            recommendations.Add("Cải thiện giấc ngủ (7-8h)");
        }
        
        if (data.HungerLevel.HasValue && data.HungerLevel > 4)
        {
            recommendations.Add("Tăng protein để no lâu hơn");
        }
        
        return new InsightsDto
        {
            WeightTrend = trend,
            ComplianceScore = complianceScore,
            EnergyLevel = EstimateEnergyLevel(data),
            Recommendations = recommendations
        };
    }

    private string EstimateEnergyLevel(UserWeekDataDto data)
    {
        var deficit = data.TargetCalories - (int)data.AvgCalories;
        
        if (deficit > 500) return "low";
        if (deficit < -200) return "high";
        return "normal";
    }

    #endregion

    #region Helper Methods

    private async Task<UserWeekDataDto> AggregateUserData(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) throw new Exception("User not found");
        
        var daysSinceStart = (DateTime.UtcNow - user.CreatedAt).Days;
        
        // Get meal diary data (last 7 days)
        var weekAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
        var mealData = await _db.MealDiaries
            .Where(m => m.UserId == userId && m.EatenDate >= weekAgo && !m.IsDeleted)
            .GroupBy(m => m.EatenDate)
            .Select(g => new
            {
                Date = g.Key,
                Calories = g.Sum(m => m.Calories),
                Protein = g.Sum(m => m.Protein),
                Carbs = g.Sum(m => m.Carb),
                Fat = g.Sum(m => m.Fat)
            })
            .ToListAsync();
        
        var daysLogged = mealData.Count;
        
        // Get body metrics
        var weights = await _db.BodyMetrics
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.MeasuredDate)
            .Take(2)
            .ToListAsync();
        
        // Get nutrition target
        var target = await _db.NutritionTargets
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.EffectiveFrom)
            .FirstOrDefaultAsync();
        
        // Get latest weekly check-in
        var checkIn = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .FirstOrDefaultAsync();
        
        var checkInCount = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId)
            .CountAsync();
        
        return new UserWeekDataDto
        {
            DaysSinceStart = daysSinceStart,
            DaysLogged = daysLogged,
            CurrentWeight = weights.FirstOrDefault()?.WeightKg,
            StartWeight = weights.Count > 1 ? weights[1].WeightKg : null,
            WeightChange = weights.Count > 1 
                ? weights[0].WeightKg - weights[1].WeightKg 
                : null,
            
            AvgCalories = daysLogged > 0 ? mealData.Average(m => m.Calories) : 0,
            TargetCalories = target?.TargetCalories ?? 2000,
            AvgProtein = daysLogged > 0 ? mealData.Average(m => m.Protein) : 0,
            AvgCarbs = daysLogged > 0 ? mealData.Average(m => m.Carbs) : 0,
            AvgFat = daysLogged > 0 ? mealData.Average(m => m.Fat) : 0,
            
            SleepQuality = checkIn?.SleepQuality,
            HungerLevel = checkIn?.HungerLevel,
            StressLevel = checkIn?.StressLevel,
            
            Goal = checkIn?.Goal ?? "maintain",
            HasWeeklyCheckIn = checkIn != null,
            WeeklyCheckInCount = checkInCount,
            
            LastReviewDate = null // TODO: Track in DB
        };
    }

    private int CalculateDataQuality(UserWeekDataDto data)
    {
        int score = 0;
        
        // Logging consistency (40%)
        score += (int)((data.DaysLogged / 7m) * 40);
        
        // Complete check-in (30%)
        if (data.HasWeeklyCheckIn) score += 30;
        
        // Physical state data (20%)
        if (data.SleepQuality.HasValue && data.HungerLevel.HasValue) score += 20;
        
        // Body metrics (10%)
        if (data.WeightChange.HasValue) score += 10;
        
        return score;
    }

    private DateTime CalculateNextReviewDate(UserWeekDataDto data)
    {
        var daysNeeded = 7 - data.DaysSinceStart;
        return DateTime.UtcNow.AddDays(Math.Max(daysNeeded, 0));
    }

    #endregion
}
