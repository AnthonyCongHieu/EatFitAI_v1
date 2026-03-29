using System;

namespace EatFitAI.API.Services
{
    public interface INutritionCalcService
    {
        (int cal, int p, int c, int f) Suggest(
            string sex, int age, double heightCm, double weightKg, double activityLevel, string goal, double? bodyFatPercentage = null);
    }

    public sealed class NutritionCalcService : INutritionCalcService
    {
        public (int cal, int p, int c, int f) Suggest(
            string sex, int age, double heightCm, double weightKg, double activityLevel, string goal, double? bodyFatPercentage = null)
        {
            if (age < 10 || age > 100) throw new ArgumentOutOfRangeException(nameof(age));
            if (heightCm < 120 || heightCm > 220) throw new ArgumentOutOfRangeException(nameof(heightCm));
            if (weightKg < 30 || weightKg > 250) throw new ArgumentOutOfRangeException(nameof(weightKg));

            double bmr;
            if (bodyFatPercentage.HasValue && bodyFatPercentage.Value > 0)
            {
                // Katch-McArdle Formula (more accurate if body fat is known)
                var lbm = weightKg * (1 - (bodyFatPercentage.Value / 100.0));
                bmr = 370 + (21.6 * lbm);
            }
            else
            {
                // Mifflin-St Jeor Equation
                var female = sex.Equals("female", StringComparison.OrdinalIgnoreCase);
                bmr = female
                    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
                    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
            }

            var tdee = bmr * activityLevel;

            var normalizedGoal = goal.ToLowerInvariant() switch
            {
                "lose" => "cut",
                "gain" => "bulk",
                _ => goal.ToLowerInvariant()
            };

            var adj = normalizedGoal switch
            {
                "cut" => 0.80,      // Aggressive cut (-20%)
                "maintain" => 1.00,
                "bulk" => 1.10,     // Lean bulk (+10%)
                _ => 1.00
            };

            var cal = (int)Math.Round(tdee * adj);

            // Macro Split Logic
            // Protein: Higher when cutting to preserve muscle (2.2g/kg), standard otherwise (1.8g/kg)
            var proteinPerKg = normalizedGoal == "cut" ? 2.2 : 1.8;
            var proteinG = (int)Math.Round(proteinPerKg * weightKg);

            // Fat: 25% of calories usually good minimum
            var fatCal = (int)Math.Round(cal * 0.25);
            var fatG = (int)Math.Round(fatCal / 9.0);

            // Carbs: Remainder
            var protCal = proteinG * 4;
            var carbCal = Math.Max(0, cal - protCal - fatCal);
            var carbG = (int)Math.Round(carbCal / 4.0);

            return (cal, proteinG, carbG, fatG);
        }
    }
}

