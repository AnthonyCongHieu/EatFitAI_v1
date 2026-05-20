using EatFitAI.API.Data;
using EatFitAI.API.DTOs;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services;

/// <summary>
/// AI Weekly Review Service - Intelligent analysis và suggestions
/// </summary>
public class AIReviewService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AIReviewService> _logger;
    private readonly IBusinessDateService _businessDateService;

    public AIReviewService(
        ApplicationDbContext db,
        ILogger<AIReviewService> logger,
        IBusinessDateService businessDateService)
    {
        _db = db;
        _logger = logger;
        _businessDateService = businessDateService;
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
            var timeZoneId = await _businessDateService.GetUserTimeZoneIdAsync(userId);
            var today = await _businessDateService.GetTodayAsync(userId);
            var lastReviewLocalDate = _businessDateService.ToDateOnly(EnsureUtc(lastReviewDate.Value), timeZoneId);
            var daysSinceLastReview = today.DayNumber - lastReviewLocalDate.DayNumber;
            
            if (daysSinceLastReview >= 14 && daysLogged >= 10)
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
        WeeklyReviewDto review;
        
        // Not enough data
        if (dataQuality < 50)
        {
            review = new WeeklyReviewDto
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
        else
        {
            // Analyze based on goal
            review = userData.Goal.ToLower() switch
            {
                "lose" => AnalyzeWeightLoss(userData, dataQuality),
                "gain" => AnalyzeWeightGain(userData, dataQuality),
                "maintain" => AnalyzeMaintain(userData, dataQuality),
                _ => AnalyzeMaintain(userData, dataQuality)
            };
        }

        return await AttachPrimaryActionAsync(userId, userData, review);
    }

    public async Task<ReviewActionResponseDto> RecordReviewAction(Guid userId, ReviewActionRequestDto request)
    {
        if (request == null)
        {
            throw new ArgumentException("Review action request is required", nameof(request));
        }

        var normalizedAction = (request.Action ?? string.Empty).Trim().ToLowerInvariant();
        var status = normalizedAction switch
        {
            "accept" => "accepted",
            "done" => "done",
            "snooze" => "snoozed",
            "replace" => "replaced",
            "useful" => "useful",
            _ => string.Empty
        };
        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Unsupported review action", nameof(request));
        }

        var user = await _db.Users.FindAsync(userId)
            ?? throw new Exception("Không tìm thấy người dùng");

        var now = DateTime.UtcNow;
        var weekStartDate = request.WeekStartDate.HasValue
            ? DateOnly.FromDateTime(request.WeekStartDate.Value.Date)
            : GetWeekStartDate(await _businessDateService.GetTodayAsync(userId));
        var actionKey = string.IsNullOrWhiteSpace(request.ActionKey)
            ? "weekly_one_action"
            : request.ActionKey.Trim();
        var label = string.IsNullOrWhiteSpace(request.Label)
            ? "Hành động nhỏ tuần này"
            : request.Label.Trim();

        var savedAction = await _db.WeeklyReviewActions
            .FirstOrDefaultAsync(item =>
                item.UserId == userId &&
                item.WeekStartDate == weekStartDate &&
                item.ActionKey == actionKey);

        if (savedAction == null)
        {
            savedAction = new WeeklyReviewAction
            {
                UserId = userId,
                WeekStartDate = weekStartDate,
                ActionKey = actionKey,
                CreatedAt = now
            };
            await _db.WeeklyReviewActions.AddAsync(savedAction);
        }

        savedAction.Label = label;
        savedAction.Status = status;
        savedAction.ReplacementText = status == "replaced" && !string.IsNullOrWhiteSpace(request.ReplacementText)
            ? request.ReplacementText.Trim()
            : savedAction.ReplacementText;
        savedAction.UpdatedAt = now;

        if (status is "accepted" or "done" or "useful")
        {
            user.LastReviewDate = now;
        }

        await _db.SaveChangesAsync();

        return new ReviewActionResponseDto
        {
            Action = normalizedAction,
            Status = status,
            ActionKey = actionKey,
            WeekStartDate = weekStartDate.ToDateTime(TimeOnly.MinValue),
            ReplacementText = savedAction.ReplacementText,
            RecordedAt = now
        };
    }

    private async Task<WeeklyReviewDto> AttachPrimaryActionAsync(
        Guid userId,
        UserWeekDataDto userData,
        WeeklyReviewDto review)
    {
        var today = await _businessDateService.GetTodayAsync(userId);
        var weekStartDate = GetWeekStartDate(today);
        var primaryAction = BuildPrimaryAction(userData, review);

        var savedAction = await _db.WeeklyReviewActions
            .AsNoTracking()
            .FirstOrDefaultAsync(item =>
                item.UserId == userId &&
                item.WeekStartDate == weekStartDate &&
                item.ActionKey == primaryAction.ActionKey);

        if (savedAction != null)
        {
            primaryAction.Status = savedAction.Status;
            primaryAction.ReplacementText = savedAction.ReplacementText;
        }

        review.WeekStartDate = weekStartDate.ToDateTime(TimeOnly.MinValue);
        review.PrimaryAction = primaryAction;
        review.Insights.Recommendations = review.Insights.Recommendations
            .Take(1)
            .ToList();

        return review;
    }

    private static WeeklyReviewPrimaryActionDto BuildPrimaryAction(
        UserWeekDataDto userData,
        WeeklyReviewDto review)
    {
        if (review.Status == "NEED_MORE_DATA" || userData.DaysLogged < 4)
        {
            return new WeeklyReviewPrimaryActionDto
            {
                ActionKey = "log_four_days",
                Label = "Log ít nhất 4 ngày trong tuần",
                DeepLink = "/diary",
                Status = "suggested"
            };
        }

        if (review.SuggestedActions?.NewTargetCalories.HasValue == true)
        {
            return new WeeklyReviewPrimaryActionDto
            {
                ActionKey = "review_target_suggestion",
                Label = "Xem đề xuất chỉnh mục tiêu",
                DeepLink = "/ai/nutrition-insights",
                Status = "suggested"
            };
        }

        var recommendation = review.Insights.Recommendations.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(recommendation))
        {
            return new WeeklyReviewPrimaryActionDto
            {
                ActionKey = "weekly_recommendation",
                Label = recommendation,
                DeepLink = "/diary",
                Status = "suggested"
            };
        }

        return new WeeklyReviewPrimaryActionDto
        {
            ActionKey = "keep_steady_week",
            Label = "Giữ nhịp log và ăn trong range tuần này",
            DeepLink = "/diary",
            Status = "suggested"
        };
    }

    private static DateOnly GetWeekStartDate(DateOnly date)
    {
        var dayOfWeek = (int)date.DayOfWeek;
        var diff = dayOfWeek == 0 ? -6 : 1 - dayOfWeek;
        return date.AddDays(diff);
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
                Message = $"Giảm cân ổn ({Math.Abs(weightChange):F1}kg/tuần). Tiếp tục!",
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
                Message = $"Tăng cân tốt (+{weightChange:F1}kg)!",
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
                Message = "Cân nặng ổn định. Duy trì tốt!",
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
            Message = "Tiếp tục theo dõi tiến độ!",
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
        if (user == null) throw new Exception("Không tìm thấy người dùng");
        
        var timeZoneId = await _businessDateService.GetUserTimeZoneIdAsync(userId);
        var today = await _businessDateService.GetTodayAsync(userId);
        var createdDate = _businessDateService.ToDateOnly(EnsureUtc(user.CreatedAt), timeZoneId);
        var daysSinceStart = today.DayNumber - createdDate.DayNumber;
        
        // Get meal diary data (last 7 days)
        var weekAgo = today.AddDays(-7);
        var recentMeals = await _db.MealDiaries
            .Where(m => m.UserId == userId && m.EatenDate >= weekAgo && !m.IsDeleted)
            .Select(m => new
            {
                m.EatenDate,
                m.MealTypeId,
                m.Calories,
                m.Protein,
                m.Carb,
                m.Fat
            })
            .ToListAsync();

        var mealData = recentMeals
            .GroupBy(m => m.EatenDate)
            .Select(g => new
            {
                Date = g.Key,
                Calories = g.Sum(m => m.Calories),
                Protein = g.Sum(m => m.Protein),
                Carbs = g.Sum(m => m.Carb),
                Fat = g.Sum(m => m.Fat),
                Meals = g.Select(m => new { m.MealTypeId, m.Calories }).ToList()
            })
            .Where(day => DayCompletenessService.IsCompleteDay(
                day.Meals.Select(meal => (meal.MealTypeId, meal.Calories))))
            .ToList();
        
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
        
        // The active cloud schema does not persist Goal on NutritionTarget in this context.
        var goal = target?.Goal ?? "maintain";
        
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
            
            // Khong con lay tu check-in
            SleepQuality = null,
            HungerLevel = null,
            StressLevel = null,
            
            Goal = goal,
            
            LastReviewDate = user.LastReviewDate
        };
    }

    private int CalculateDataQuality(UserWeekDataDto data)
    {
        int score = 0;
        
        // Logging consistency (60% - tang tu 40 vi khong con check-in)
        score += (int)((data.DaysLogged / 7m) * 60);
        
        // Physical state data (20%)
        if (data.SleepQuality.HasValue && data.HungerLevel.HasValue) score += 20;
        
        // Body metrics (20% - tang tu 10)
        if (data.WeightChange.HasValue) score += 20;
        
        return score;
    }

    private DateTime CalculateNextReviewDate(UserWeekDataDto data)
    {
        var daysNeeded = 7 - data.DaysSinceStart;
        return DateTime.UtcNow.AddDays(Math.Max(daysNeeded, 0));
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    #endregion
}
