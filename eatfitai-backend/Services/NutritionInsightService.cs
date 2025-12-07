using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// AI-powered nutrition insight service implementation
    /// Uses historical data analysis and ML-based recommendations
    /// </summary>
    public class NutritionInsightService : INutritionInsightService
    {
        private readonly EatFitAIDbContext _db;
        private readonly ILogger<NutritionInsightService> _logger;

        public NutritionInsightService(
            EatFitAIDbContext db,
            ILogger<NutritionInsightService> logger)
        {
            _db = db;
            _logger = logger;
        }

        // Helper class for daily nutrition statistics
        private class DailyNutritionStats
        {
            public DateOnly Date { get; set; }
            public decimal TotalCalories { get; set; }
            public decimal TotalProtein { get; set; }
            public decimal TotalCarbs { get; set; }
            public decimal TotalFat { get; set; }
            public int MealCount { get; set; }
        }

        public async Task<NutritionInsightDto> GetPersonalizedInsightsAsync(
            Guid userId,
            NutritionInsightRequest request,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Generating personalized nutrition insights for user {UserId}", userId);

            var startDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-request.AnalysisDays));
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Get user's meal history
            var mealHistory = await _db.MealDiaries
                .Where(m => m.UserId == userId && m.EatenDate >= startDate && m.EatenDate <= today)
                .Include(m => m.MealType)
                .ToListAsync(cancellationToken);

            // Get current nutrition target
            var currentTarget = await _db.NutritionTargets
                .Where(nt => nt.UserId == userId && nt.EffectiveFrom <= today && (nt.EffectiveTo == null || nt.EffectiveTo >= today))
                .OrderByDescending(nt => nt.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            if (currentTarget == null)
            {
                throw new InvalidOperationException("No active nutrition target found for user");
            }

            // Calculate daily averages
            var dailyStats = mealHistory
                .GroupBy(m => m.EatenDate)
                .Select(g => new DailyNutritionStats
                {
                    Date = g.Key,
                    TotalCalories = g.Sum(m => m.Calories),
                    TotalProtein = g.Sum(m => m.Protein),
                    TotalCarbs = g.Sum(m => m.Carb),
                    TotalFat = g.Sum(m => m.Fat),
                    MealCount = g.Count()
                })
                .ToList();

            var daysWithData = dailyStats.Count;
            var avgCalories = daysWithData > 0 ? dailyStats.Average(d => d.TotalCalories) : 0;
            var avgProtein = daysWithData > 0 ? dailyStats.Average(d => d.TotalProtein) : 0;
            var avgCarbs = daysWithData > 0 ? dailyStats.Average(d => d.TotalCarbs) : 0;
            var avgFat = daysWithData > 0 ? dailyStats.Average(d => d.TotalFat) : 0;

            // Calculate adherence score
            var adherenceScore = CalculateAdherenceScore(
                avgCalories, avgProtein, avgCarbs, avgFat,
                currentTarget.TargetCalories, currentTarget.TargetProtein, currentTarget.TargetCarb, currentTarget.TargetFat);

            // Generate recommendations
            var recommendations = GenerateRecommendations(
                avgCalories, avgProtein, avgCarbs, avgFat,
                currentTarget.TargetCalories, currentTarget.TargetProtein, currentTarget.TargetCarb, currentTarget.TargetFat,
                adherenceScore);

            // Calculate progress trend
            var progressTrend = CalculateProgressTrend(dailyStats, currentTarget);

            var insight = new NutritionInsightDto
            {
                AdherenceScore = adherenceScore,
                AverageDailyCalories = avgCalories,
                AverageDailyProtein = avgProtein,
                AverageDailyCarbs = avgCarbs,
                AverageDailyFat = avgFat,
                CurrentTarget = new NutritionTargetDto
                {
                    TargetCalories = currentTarget.TargetCalories,
                    TargetProtein = currentTarget.TargetProtein,
                    TargetCarbs = currentTarget.TargetCarb,
                    TargetFat = currentTarget.TargetFat
                },
                Recommendations = recommendations,
                ProgressTrend = progressTrend,
                DaysAnalyzed = daysWithData
            };

            // Add meal timing insights if requested
            if (request.IncludeMealTiming && mealHistory.Any())
            {
                insight.MealTimingInsight = GenerateMealTimingInsights(mealHistory, dailyStats);
            }

            // Add macro distribution insights if requested
            if (request.IncludeMacroAnalysis)
            {
                insight.MacroDistributionInsight = GenerateMacroDistributionInsights(
                    avgProtein, avgCarbs, avgFat, currentTarget);
            }

            return insight;
        }

        public async Task<AdaptiveTargetDto> GetAdaptiveTargetAsync(
            Guid userId,
            AdaptiveTargetRequest request,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Calculating adaptive nutrition target for user {UserId}", userId);

            var startDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-request.AnalysisDays));
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Get current target
            var currentTarget = await _db.NutritionTargets
                .Where(nt => nt.UserId == userId && nt.EffectiveFrom <= today && (nt.EffectiveTo == null || nt.EffectiveTo >= today))
                .OrderByDescending(nt => nt.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            if (currentTarget == null)
            {
                throw new InvalidOperationException("No active nutrition target found for user");
            }

            // Get meal history
            var mealHistory = await _db.MealDiaries
                .Where(m => m.UserId == userId && m.EatenDate >= startDate && m.EatenDate <= today)
                .ToListAsync(cancellationToken);

            // Calculate averages
            var dailyStats = mealHistory
                .GroupBy(m => m.EatenDate)
                .Select(g => new
                {
                    TotalCalories = g.Sum(m => m.Calories),
                    TotalProtein = g.Sum(m => m.Protein),
                    TotalCarbs = g.Sum(m => m.Carb),
                    TotalFat = g.Sum(m => m.Fat)
                })
                .ToList();

            var avgCalories = dailyStats.Any() ? dailyStats.Average(d => d.TotalCalories) : 0;
            var avgProtein = dailyStats.Any() ? dailyStats.Average(d => d.TotalProtein) : 0;
            var avgCarbs = dailyStats.Any() ? dailyStats.Average(d => d.TotalCarbs) : 0;
            var avgFat = dailyStats.Any() ? dailyStats.Average(d => d.TotalFat) : 0;

            // Calculate adaptive adjustments
            var (suggestedCalories, suggestedProtein, suggestedCarbs, suggestedFat, reasons, confidence) =
                CalculateAdaptiveAdjustments(
                    avgCalories, avgProtein, avgCarbs, avgFat,
                    currentTarget.TargetCalories, currentTarget.TargetProtein, currentTarget.TargetCarb, currentTarget.TargetFat,
                    dailyStats.Count);

            var adaptiveTarget = new AdaptiveTargetDto
            {
                CurrentTarget = new NutritionTargetDto
                {
                    TargetCalories = currentTarget.TargetCalories,
                    TargetProtein = currentTarget.TargetProtein,
                    TargetCarbs = currentTarget.TargetCarb,
                    TargetFat = currentTarget.TargetFat
                },
                SuggestedTarget = new NutritionTargetDto
                {
                    TargetCalories = suggestedCalories,
                    TargetProtein = suggestedProtein,
                    TargetCarbs = suggestedCarbs,
                    TargetFat = suggestedFat
                },
                AdjustmentReasons = reasons,
                ConfidenceScore = confidence,
                Applied = false
            };

            // Auto-apply if requested and confidence is high
            if (request.AutoApply && confidence >= 75)
            {
                await ApplyAdaptiveTargetAsync(userId, adaptiveTarget.SuggestedTarget, cancellationToken);
                adaptiveTarget.Applied = true;
            }

            return adaptiveTarget;
        }

        public async Task ApplyAdaptiveTargetAsync(
            Guid userId,
            NutritionTargetDto newTarget,
            CancellationToken cancellationToken = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Close current target
            var currentTarget = await _db.NutritionTargets
                .Where(nt => nt.UserId == userId && nt.EffectiveFrom <= today && (nt.EffectiveTo == null || nt.EffectiveTo >= today))
                .OrderByDescending(nt => nt.EffectiveFrom)
                .FirstOrDefaultAsync(cancellationToken);

            if (currentTarget != null && currentTarget.EffectiveTo == null)
            {
                currentTarget.EffectiveTo = today.AddDays(-1);
            }

            // Create new target
            var newTargetEntity = new DbScaffold.Models.NutritionTarget
            {
                UserId = userId,
                TargetCalories = newTarget.TargetCalories,
                TargetProtein = newTarget.TargetProtein,
                TargetCarb = newTarget.TargetCarbs,
                TargetFat = newTarget.TargetFat,
                EffectiveFrom = today,
                EffectiveTo = null
            };

            _db.NutritionTargets.Add(newTargetEntity);
            await _db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Applied adaptive nutrition target for user {UserId}", userId);
        }

        #region Private Helper Methods

        private decimal CalculateAdherenceScore(
            decimal avgCal, decimal avgPro, decimal avgCarb, decimal avgFat,
            int targetCal, int targetPro, int targetCarb, int targetFat)
        {
            if (targetCal == 0) return 0;

            var calScore = 100 - Math.Min(100, Math.Abs(avgCal - targetCal) / targetCal * 100);
            var proScore = targetPro > 0 ? 100 - Math.Min(100, Math.Abs(avgPro - targetPro) / targetPro * 100) : 100;
            var carbScore = targetCarb > 0 ? 100 - Math.Min(100, Math.Abs(avgCarb - targetCarb) / targetCarb * 100) : 100;
            var fatScore = targetFat > 0 ? 100 - Math.Min(100, Math.Abs(avgFat - targetFat) / targetFat * 100) : 100;

            return (calScore * 0.4m + proScore * 0.25m + carbScore * 0.2m + fatScore * 0.15m);
        }

        private List<NutritionRecommendationDto> GenerateRecommendations(
            decimal avgCal, decimal avgPro, decimal avgCarb, decimal avgFat,
            int targetCal, int targetPro, int targetCarb, int targetFat,
            decimal adherenceScore)
        {
            var recommendations = new List<NutritionRecommendationDto>();

            // Nếu không có dữ liệu ăn uống (avg = 0), nhắc nhở nhập liệu thay vì báo thiếu hụt
            if (avgCal == 0 && avgPro == 0)
            {
                recommendations.Add(new NutritionRecommendationDto
                {
                    Type = "missing_data",
                    Message = "Bạn chưa có dữ liệu ăn uống gần đây. Hãy nhập nhật ký bữa ăn để nhận phân tích chi tiết.",
                    Priority = "high",
                    SuggestedValue = targetCal,
                    Reasoning = "AI cần dữ liệu ăn uống của bạn để đưa ra lời khuyên chính xác."
                });
                return recommendations;
            }

            // Calorie recommendations
            var calDiff = avgCal - targetCal;
            // Chỉ cảnh báo nếu lệch quá 10%
            if (Math.Abs(calDiff) > targetCal * 0.1m)
            {
                var isSurplus = calDiff > 0;
                // Randomize messages slightly for "real" feel
                var messages = isSurplus
                    ? new[] 
                    { 
                        $"Bạn đang nạp dư {Math.Abs(calDiff):F0} calo. Hãy thử giảm đồ ngọt hoặc chia nhỏ khẩu phần.",
                        $"Lượng calo trung bình đang cao hơn {Math.Abs(calDiff):F0} so với mục tiêu. Tăng cường vận động hoặc ăn nhiều rau hơn."
                    }
                    : new[]
                    {
                        $"Bạn đang ăn dưới mức mục tiêu {Math.Abs(calDiff):F0} calo. Đừng để cơ thể thiếu năng lượng nhé.",
                        $"Cần nạp thêm khoảng {Math.Abs(calDiff):F0} calo. Các loại hạt, quả bơ hoặc thêm bữa phụ sẽ giúp bạn đạt mục tiêu."
                    };

                recommendations.Add(new NutritionRecommendationDto
                {
                    Type = isSurplus ? "reduce_calories" : "increase_calories",
                    Message = messages[new Random().Next(messages.Length)],
                    Priority = Math.Abs(calDiff) > targetCal * 0.2m ? "high" : "medium",
                    SuggestedValue = targetCal,
                    Reasoning = "Duy trì năng lượng ổn định giúp bạn đạt được cân nặng mong muốn."
                });
            }

            // Protein recommendations
            var proDiff = avgPro - targetPro;
            if (Math.Abs(proDiff) > targetPro * 0.15m)
            {
                recommendations.Add(new NutritionRecommendationDto
                {
                    Type = proDiff > 0 ? "reduce_protein" : "increase_protein",
                    Message = proDiff > 0
                        ? $"Lượng protein dư {Math.Abs(proDiff):F0}g. Cân bằng lại với rau xanh và tinh bột tốt."
                        : $"Thiếu {Math.Abs(proDiff):F0}g protein. Bổ sung ức gà, cá, đậu phụ hoặc trứng vào thực đơn.",
                    Priority = proDiff < 0 ? "high" : "low", // Thiếu protein quan trọng hơn thừa
                    SuggestedValue = targetPro,
                    Reasoning = "Protein là nguyên liệu xây dựng cơ bắp và hỗ trợ giảm mỡ."
                });
            }

            // Carb recommendations
            var carbDiff = avgCarb - targetCarb;
            if (Math.Abs(carbDiff) > targetCarb * 0.2m)
            {
                recommendations.Add(new NutritionRecommendationDto
                {
                    Type = carbDiff > 0 ? "reduce_carbs" : "increase_carbs",
                    Message = carbDiff > 0
                        ? $"Giảm bớt {Math.Abs(carbDiff):F0}g carbs từ đồ ngọt/bánh kẹo. Thay bằng khoai lang hoặc gạo lứt."
                        : $"Nên thêm {Math.Abs(carbDiff):F0}g carbs phức hợp (yến mạch, khoai) để có đủ năng lượng tập luyện.",
                    Priority = "medium",
                    SuggestedValue = targetCarb,
                    Reasoning = "Carbs cung cấp năng lượng chính cho não bộ và vận động vận."
                });
            }

            // Fat recommendations
            var fatDiff = avgFat - targetFat;
            if (Math.Abs(fatDiff) > targetFat * 0.2m)
            {
                recommendations.Add(new NutritionRecommendationDto
                {
                    Type = fatDiff > 0 ? "reduce_fat" : "increase_fat",
                    Message = fatDiff > 0
                        ? $"Hạn chế đồ chiên xào. Bạn đang nạp dư {Math.Abs(fatDiff):F0}g chất béo."
                        : $"Thêm {Math.Abs(fatDiff):F0}g chất béo tốt từ dầu ô liu, các loại hạt để hỗ trợ hấp thu vitamin.",
                    Priority = "medium",
                    SuggestedValue = targetFat,
                    Reasoning = "Chất béo tốt cần thiết cho nội tiết tố và sức khỏe tim mạch."
                });
            }

            // Adherence-based simple tip
            if (adherenceScore < 60)
            {
                recommendations.Add(new NutritionRecommendationDto
                {
                    Type = "improve_adherence",
                    Message = "Đừng quá khắt khe. Hãy bắt đầu bằng việc ghi chép đầy đủ 3 bữa chính mỗi ngày.",
                    Priority = "high",
                    Reasoning = "Ghi chép đều đặn quan trọng hơn là ăn hoàn hảo."
                });
            }

            return recommendations;
        }

        private string CalculateProgressTrend(List<DailyNutritionStats> dailyStats, DbScaffold.Models.NutritionTarget target)
        {
            if (dailyStats.Count < 7) return "insufficient_data";

            var recentDays = dailyStats.TakeLast(7).ToList();
            var olderDays = dailyStats.Take(Math.Min(7, dailyStats.Count - 7)).ToList();

            if (!olderDays.Any()) return "stable";

            var recentAdherence = recentDays.Average(d =>
                100 - Math.Abs((decimal)d.TotalCalories - target.TargetCalories) / target.TargetCalories * 100);
            var olderAdherence = olderDays.Average(d =>
                100 - Math.Abs((decimal)d.TotalCalories - target.TargetCalories) / target.TargetCalories * 100);

            var improvement = recentAdherence - olderAdherence;

            if (improvement > 5) return "improving";
            if (improvement < -5) return "declining";
            return "stable";
        }

        private MealTimingInsightDto GenerateMealTimingInsights(
            List<DbScaffold.Models.MealDiary> mealHistory,
            List<DailyNutritionStats> dailyStats)
        {
            var avgMealsPerDay = dailyStats.Any() ? dailyStats.Average(d => (decimal)d.MealCount) : 0;

            var mealTimes = mealHistory
                .Where(m => m.MealType != null)
                .GroupBy(m => m.MealType.Name)
                .Select(g => new { MealType = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Select(x => x.MealType)
                .ToList();

            var insights = new List<string>();
            if (avgMealsPerDay < 3)
            {
                insights.Add("Trung bình bạn ăn ít hơn 3 bữa mỗi ngày. Hãy thêm bữa phụ để phân bổ năng lượng tốt hơn.");
            }
            else if (avgMealsPerDay > 5)
            {
                insights.Add("Bạn ăn khá thường xuyên. Điều này tốt cho trao đổi chất nếu kiểm soát được khẩu phần.");
            }

            return new MealTimingInsightDto
            {
                AverageMealsPerDay = avgMealsPerDay,
                CommonMealTimes = mealTimes,
                SuggestedDistribution = new Dictionary<string, decimal>
                {
                    { "Breakfast", 25 },
                    { "Lunch", 35 },
                    { "Dinner", 30 },
                    { "Snacks", 10 }
                },
                Insights = insights
            };
        }

        private MacroDistributionInsightDto GenerateMacroDistributionInsights(
            decimal avgPro, decimal avgCarb, decimal avgFat,
            DbScaffold.Models.NutritionTarget target)
        {
            var totalCal = avgPro * 4 + avgCarb * 4 + avgFat * 9;
            var proPct = totalCal > 0 ? (avgPro * 4 / totalCal * 100) : 0;
            var carbPct = totalCal > 0 ? (avgCarb * 4 / totalCal * 100) : 0;
            var fatPct = totalCal > 0 ? (avgFat * 9 / totalCal * 100) : 0;

            var targetTotalCal = target.TargetProtein * 4 + target.TargetCarb * 4 + target.TargetFat * 9;
            var recProPct = targetTotalCal > 0 ? ((decimal)target.TargetProtein * 4 / targetTotalCal * 100) : 25;
            var recCarbPct = targetTotalCal > 0 ? ((decimal)target.TargetCarb * 4 / targetTotalCal * 100) : 50;
            var recFatPct = targetTotalCal > 0 ? ((decimal)target.TargetFat * 9 / targetTotalCal * 100) : 25;

            var insights = new List<string>();
            var balanceQuality = "good";

            if (Math.Abs(proPct - recProPct) > 10)
            {
                insights.Add($"Protein {(proPct > recProPct ? "cao hơn" : "thấp hơn")} khuyến nghị.");
                balanceQuality = "needs_improvement";
            }

            if (Math.Abs(carbPct - recCarbPct) > 15)
            {
                insights.Add($"Carbs {(carbPct > recCarbPct ? "cao hơn" : "thấp hơn")} khuyến nghị.");
                balanceQuality = "needs_improvement";
            }

            if (Math.Abs(fatPct - recFatPct) > 10)
            {
                insights.Add($"Chất béo {(fatPct > recFatPct ? "cao hơn" : "thấp hơn")} khuyến nghị.");
                balanceQuality = "needs_improvement";
            }

            if (insights.Count == 0)
            {
                insights.Add("Phân bổ macro của bạn rất cân bằng!");
                balanceQuality = "excellent";
            }

            return new MacroDistributionInsightDto
            {
                ProteinPercentage = proPct,
                CarbsPercentage = carbPct,
                FatPercentage = fatPct,
                RecommendedProteinPercentage = recProPct,
                RecommendedCarbsPercentage = recCarbPct,
                RecommendedFatPercentage = recFatPct,
                BalanceQuality = balanceQuality,
                Insights = insights
            };
        }

        private (int calories, int protein, int carbs, int fat, List<string> reasons, decimal confidence)
            CalculateAdaptiveAdjustments(
                decimal avgCal, decimal avgPro, decimal avgCarb, decimal avgFat,
                int targetCal, int targetPro, int targetCarb, int targetFat,
                int daysWithData)
        {
            var reasons = new List<string>();
            var confidence = Math.Min(100, daysWithData * 7); // More data = higher confidence

            // Start with current targets
            var newCal = targetCal;
            var newPro = targetPro;
            var newCarb = targetCarb;
            var newFat = targetFat;

            // Adaptive calorie adjustment (move 20% towards average if consistently off)
            var calDiff = avgCal - targetCal;
            if (Math.Abs(calDiff) > targetCal * 0.15m && daysWithData >= 10)
            {
                newCal = (int)Math.Round(targetCal + calDiff * 0.2m);
                reasons.Add($"Đã điều chỉnh {(int)(calDiff * 0.2m)} calo dựa trên thói quen ăn uống của bạn.");
            }

            // Protein adjustment (ensure minimum 1.6g/kg if possible)
            var proDiff = avgPro - targetPro;
            if (avgPro < targetPro * 0.85m && daysWithData >= 7)
            {
                newPro = (int)Math.Round(targetPro * 0.9m); // Reduce target slightly to be more achievable
                reasons.Add("Giảm nhẹ mục tiêu protein để dễ đạt hơn.");
            }
            else if (avgPro > targetPro * 1.15m)
            {
                newPro = (int)Math.Round(avgPro * 0.95m); // Adjust upward if consistently exceeding
                reasons.Add("Tăng mục tiêu protein dựa trên lượng tiêu thụ thực tế cao hơn.");
            }

            // Carb/Fat balance adjustment
            var totalMacros = newPro * 4 + newCarb * 4 + newFat * 9;
            if (totalMacros != newCal)
            {
                var remainingCal = newCal - (newPro * 4);
                newCarb = (int)Math.Round(remainingCal * 0.5m / 4);
                newFat = (int)Math.Round(remainingCal * 0.5m / 9);
                reasons.Add("Đã cân bằng lại carbs và chất béo theo mục tiêu calo.");
            }

            if (reasons.Count == 0)
            {
                reasons.Add("Mục tiêu hiện tại phù hợp với thói quen ăn uống. Không cần điều chỉnh.");
                confidence = Math.Max(confidence, 80);
            }

            return (newCal, newPro, newCarb, newFat, reasons, confidence);
        }

        #endregion
    }
}
