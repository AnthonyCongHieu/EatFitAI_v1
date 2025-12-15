using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EatFitAI.API.Data;
using EatFitAI.API.Models;
using System.Security.Claims;

namespace EatFitAI.API.Controllers;

/// <summary>
/// API endpoints for weekly check-in tracking
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WeeklyCheckInController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<WeeklyCheckInController> _logger;

    public WeeklyCheckInController(ApplicationDbContext db, ILogger<WeeklyCheckInController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Get current week's check-in status and info
    /// </summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentWeek()
    {
        try 
        {
            var userId = GetUserId();
            _logger.LogInformation("[WeeklyCheckIn] GetCurrentWeek called for user: {UserId}", userId);
            
            if (userId == Guid.Empty) return Unauthorized();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var weekStart = GetWeekStart(today);
            var weekEnd = weekStart.AddDays(6);
            
            _logger.LogInformation("[WeeklyCheckIn] Week: {Start} to {End}", weekStart, weekEnd);

            // Get existing check-in for this week
            var checkIn = await _db.WeeklyCheckIns
                .Where(w => w.UserId == userId && w.WeekStartDate == weekStart)
                .FirstOrDefaultAsync();
            
            _logger.LogInformation("[WeeklyCheckIn] CheckIn found: {Found}", checkIn != null);

            // Calculate week number (weeks since user started)
            var firstCheckIn = await _db.WeeklyCheckIns
                .Where(w => w.UserId == userId)
                .OrderBy(w => w.WeekStartDate)
                .FirstOrDefaultAsync();

            var weekNumber = firstCheckIn != null
                ? ((today.DayNumber - firstCheckIn.WeekStartDate.DayNumber) / 7) + 1
                : 1;

            // Get weekly nutrition averages from diary
            var weeklyStats = await GetWeeklyNutritionStats(userId, weekStart, weekEnd);
            
            _logger.LogInformation("[WeeklyCheckIn] WeeklyStats retrieved");

            // Get previous week's weight for comparison
            var prevWeekStart = weekStart.AddDays(-7);
            var prevCheckIn = await _db.WeeklyCheckIns
                .Where(w => w.UserId == userId && w.WeekStartDate == prevWeekStart)
                .FirstOrDefaultAsync();

            // Get user's current target
            var target = await _db.NutritionTargets
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.NutritionTargetId)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                weekNumber,
                weekStart = weekStart.ToString("yyyy-MM-dd"),
                weekEnd = weekEnd.ToString("yyyy-MM-dd"),
                hasCheckedIn = checkIn != null,
                checkIn = checkIn != null ? new
                {
                    checkIn.WeeklyCheckInId,
                    checkIn.WeightKg,
                    checkIn.WeightChange,
                    checkIn.AvgCalories,
                    checkIn.TargetCalories,
                    checkIn.AvgProtein,
                    checkIn.AvgCarbs,
                    checkIn.AvgFat,
                    checkIn.DaysLogged,
                    checkIn.Goal,
                    checkIn.AiSuggestion,
                    checkIn.IsOnTrack,
                    checkIn.SuggestedCalories,
                    checkIn.Notes,
                    checkIn.CreatedAt
                } : null,
                previousWeight = prevCheckIn?.WeightKg,
                weeklyStats,
                targetCalories = target?.TargetCalories
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[WeeklyCheckIn] GetCurrentWeek EXCEPTION: {Message}", ex.Message);
            return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    /// <summary>
    /// Submit weekly check-in
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> SubmitCheckIn([FromBody] WeeklyCheckInRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekStart = GetWeekStart(today);
        var weekEnd = weekStart.AddDays(6);

        // Check if already submitted
        var existing = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId && w.WeekStartDate == weekStart)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            return BadRequest(new { message = "Đã check-in tuần này rồi" });
        }

        // Get previous week's weight
        var prevWeekStart = weekStart.AddDays(-7);
        var prevCheckIn = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId && w.WeekStartDate == prevWeekStart)
            .FirstOrDefaultAsync();

        var weightChange = prevCheckIn != null
            ? request.WeightKg - prevCheckIn.WeightKg
            : (decimal?)null;

        // Get weekly stats
        var weeklyStats = await GetWeeklyNutritionStats(userId, weekStart, weekEnd);

        // Get user's goal and target
        var target = await _db.NutritionTargets
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.NutritionTargetId)
            .FirstOrDefaultAsync();

        // Calculate week number
        var firstCheckIn = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId)
            .OrderBy(w => w.WeekStartDate)
            .FirstOrDefaultAsync();

        var weekNumber = firstCheckIn != null
            ? ((today.DayNumber - firstCheckIn.WeekStartDate.DayNumber) / 7) + 2
            : 1;

        // Determine if on track
        var goal = request.Goal ?? "maintain";
        var isOnTrack = DetermineIfOnTrack(goal, weightChange);

        // Generate AI suggestion
        var aiSuggestion = GenerateAiSuggestion(goal, weightChange, weeklyStats, target?.TargetCalories);
        var suggestedCalories = CalculateSuggestedCalories(goal, weightChange, target?.TargetCalories, weeklyStats.AvgCalories);

        var checkIn = new WeeklyCheckIn
        {
            UserId = userId,
            WeekNumber = weekNumber,
            WeekStartDate = weekStart,
            WeekEndDate = weekEnd,
            WeightKg = request.WeightKg,
            WeightChange = weightChange,
            AvgCalories = weeklyStats.AvgCalories,
            TargetCalories = target?.TargetCalories,
            AvgProtein = weeklyStats.AvgProtein,
            AvgCarbs = weeklyStats.AvgCarbs,
            AvgFat = weeklyStats.AvgFat,
            DaysLogged = weeklyStats.DaysLogged,
            Goal = goal,
           AiSuggestion = aiSuggestion,
            IsOnTrack = isOnTrack,
            SuggestedCalories = suggestedCalories,
            // Physical & Mental State
            SleepQuality = request.SleepQuality,
            HungerLevel = request.HungerLevel,
            StressLevel = request.StressLevel,
            Notes = request.Notes
        };

        _db.WeeklyCheckIns.Add(checkIn);

        // Also save to BodyMetric for historical tracking
        var bodyMetric = new BodyMetric
        {
            UserId = userId,
            WeightKg = request.WeightKg,
            MeasuredDate = today,
            Note = $"Weekly check-in tuần {weekNumber}"
        };
        _db.BodyMetrics.Add(bodyMetric);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Check-in thành công!",
            checkIn = new
            {
                checkIn.WeeklyCheckInId,
                checkIn.WeekNumber,
                checkIn.WeightKg,
                checkIn.WeightChange,
                checkIn.IsOnTrack,
                checkIn.AiSuggestion,
                checkIn.SuggestedCalories
            }
        });
    }

    /// <summary>
    /// Get check-in history
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var query = _db.WeeklyCheckIns
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.WeekStartDate);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(w => new
            {
                w.WeeklyCheckInId,
                w.WeekNumber,
                weekStart = w.WeekStartDate.ToString("yyyy-MM-dd"),
                weekEnd = w.WeekEndDate.ToString("yyyy-MM-dd"),
                w.WeightKg,
                w.WeightChange,
                w.AvgCalories,
                w.TargetCalories,
                w.DaysLogged,
                w.Goal,
                w.IsOnTrack,
                w.AiSuggestion,
                w.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    /// <summary>
    /// Get summary statistics
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var checkIns = await _db.WeeklyCheckIns
            .Where(w => w.UserId == userId)
            .OrderBy(w => w.WeekStartDate)
            .ToListAsync();

        if (!checkIns.Any())
        {
            return Ok(new
            {
                totalWeeks = 0,
                startingWeight = (decimal?)null,
                currentWeight = (decimal?)null,
                totalWeightChange = (decimal?)null,
                avgWeeklyChange = (decimal?)null,
                onTrackPercentage = 0,
                streak = 0
            });
        }

        var startingWeight = checkIns.First().WeightKg;
        var currentWeight = checkIns.Last().WeightKg;
        var totalWeightChange = currentWeight - startingWeight;
        var avgWeeklyChange = checkIns.Count > 1
            ? totalWeightChange / (checkIns.Count - 1)
            : 0;
        var onTrackCount = checkIns.Count(c => c.IsOnTrack);
        var onTrackPercentage = (double)onTrackCount / checkIns.Count * 100;

        // Calculate streak (consecutive weeks on track)
        var streak = 0;
        for (int i = checkIns.Count - 1; i >= 0; i--)
        {
            if (checkIns[i].IsOnTrack)
                streak++;
            else
                break;
        }

        return Ok(new
        {
            totalWeeks = checkIns.Count,
            startingWeight,
            currentWeight,
            totalWeightChange,
            avgWeeklyChange = Math.Round(avgWeeklyChange, 2),
            onTrackPercentage = Math.Round(onTrackPercentage, 1),
            streak
        });
    }

    #region Helper Methods

    private DateOnly GetWeekStart(DateOnly date)
    {
        // Get Monday of the week
        var daysDiff = ((int)date.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        return date.AddDays(-daysDiff);
    }

    private async Task<WeeklyStats> GetWeeklyNutritionStats(Guid userId, DateOnly weekStart, DateOnly weekEnd)
    {
        var entries = await _db.MealDiaries
            .Where(m => m.UserId == userId
                && m.EatenDate >= weekStart
                && m.EatenDate <= weekEnd
                && !m.IsDeleted)
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

        var daysLogged = entries.Count;

        return new WeeklyStats
        {
            DaysLogged = daysLogged,
            AvgCalories = daysLogged > 0 ? entries.Average(e => e.Calories) : 0m,
            AvgProtein = daysLogged > 0 ? entries.Average(e => e.Protein) : 0m,
            AvgCarbs = daysLogged > 0 ? entries.Average(e => e.Carbs) : 0m,
            AvgFat = daysLogged > 0 ? entries.Average(e => e.Fat) : 0m
        };
    }

    private bool DetermineIfOnTrack(string goal, decimal? weightChange)
    {
        if (weightChange == null) return true; // First week

        return goal switch
        {
            "lose" => weightChange < 0, // Should be losing
            "gain" => weightChange > 0, // Should be gaining
            "maintain" => Math.Abs(weightChange.Value) < 0.5m, // Within 0.5kg
            _ => true
        };
    }

    private string GenerateAiSuggestion(string goal, decimal? weightChange, WeeklyStats stats, decimal? targetCalories)
    {
        if (weightChange == null)
        {
            return "Chào mừng bạn bắt đầu hành trình! Hãy duy trì chế độ ăn và quay lại check-in tuần sau nhé.";
        }

        var change = weightChange.Value;
        var caloriesDiff = targetCalories.HasValue && stats.AvgCalories > 0
            ? stats.AvgCalories - (decimal)targetCalories.Value
            : 0;

        return goal switch
        {
            "lose" when change < -0.5m => $"🎉 Tuyệt vời! Bạn đã giảm {Math.Abs(change):F1}kg tuần này. Tiếp tục duy trì nhé!",
            "lose" when change < 0 => $"👍 Tốt lắm! Giảm {Math.Abs(change):F1}kg. Tiếp tục phát huy!",
            "lose" when change >= 0 && caloriesDiff > 100 => $"⚠️ Cân nặng chưa giảm. Bạn đang ăn vượt {caloriesDiff:F0} kcal/ngày so với mục tiêu. Hãy cố gắng giảm xuống.",
            "lose" when change >= 0 => "💪 Cân nặng giữ nguyên. Hãy tăng cường vận động hoặc giảm 100-200 kcal/ngày.",

            "gain" when change > 0.3m => $"🎉 Tuyệt vời! Bạn đã tăng {change:F1}kg. Đang đi đúng hướng!",
            "gain" when change > 0 => $"👍 Đang tiến bộ! Tăng {change:F1}kg tuần này.",
            "gain" when change <= 0 => "💡 Cân nặng chưa tăng. Hãy thêm 200-300 kcal/ngày và ưu tiên protein.",

            "maintain" when Math.Abs(change) < 0.5m => "✅ Cân nặng ổn định. Bạn đang duy trì tốt!",
            "maintain" when change > 0 => $"📈 Tăng {change:F1}kg. Nếu không mong muốn, hãy giảm bớt khẩu phần.",
            "maintain" when change < 0 => $"📉 Giảm {Math.Abs(change):F1}kg. Nếu không mong muốn, hãy tăng khẩu phần.",

            _ => "Tiếp tục theo dõi và check-in tuần sau nhé!"
        };
    }

    private decimal? CalculateSuggestedCalories(string goal, decimal? weightChange, decimal? currentTarget, decimal avgConsumed)
    {
        if (currentTarget == null) return null;

        var target = currentTarget.Value;

        // If on track, keep the same
        if (weightChange == null) return target;

        var change = weightChange.Value;

        return goal switch
        {
            "lose" when change >= 0 => Math.Max(1200, target - 100), // Reduce by 100 if not losing
            "gain" when change <= 0 => target + 150, // Increase by 150 if not gaining
            _ => target // Keep the same
        };
    }

    #endregion

    #region DTOs

    public class WeeklyCheckInRequest
    {
        public decimal WeightKg { get; set; }
        public string? Goal { get; set; }
        
        // Physical & Mental State (subjective metrics only)
        public int? SleepQuality { get; set; }  // 1-5
        public int? HungerLevel { get; set; }   // 1-5
        public int? StressLevel { get; set; }   // 1-5 (optional)
        
        public string? Notes { get; set; }
    }

    private class WeeklyStats
    {
        public int DaysLogged { get; set; }
        public decimal AvgCalories { get; set; }
        public decimal AvgProtein { get; set; }
        public decimal AvgCarbs { get; set; }
        public decimal AvgFat { get; set; }
    }

    #endregion
}
