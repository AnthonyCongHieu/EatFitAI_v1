using System;

namespace EatFitAI.API.Services
{
    public interface INutritionCalcService
    {
        (int cal, int p, int c, int f) Suggest(
            string sex, int age, double heightCm, double weightKg, double activityLevel, string goal);
    }

    public sealed class NutritionCalcService : INutritionCalcService
    {
        public (int cal, int p, int c, int f) Suggest(
            string sex, int age, double heightCm, double weightKg, double activityLevel, string goal)
        {
            if (age < 10 || age > 100) throw new ArgumentOutOfRangeException(nameof(age));
            if (heightCm < 120 || heightCm > 220) throw new ArgumentOutOfRangeException(nameof(heightCm));
            if (weightKg < 30 || weightKg > 250) throw new ArgumentOutOfRangeException(nameof(weightKg));

            var female = sex.Equals("female", StringComparison.OrdinalIgnoreCase);
            var bmr = female
                ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
                : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

            var tdee = bmr * activityLevel;

            var adj = goal.ToLowerInvariant() switch
            {
                "cut" => 0.85,
                "bulk" => 1.10,
                "maintain" => 1.00,
                _ => 1.00
            };

            var cal = (int)Math.Round(tdee * adj);

            var proteinG = (int)Math.Round(1.8 * weightKg);
            var fatCal = (int)Math.Round(cal * 0.25);
            var fatG = (int)Math.Round(fatCal / 9.0);
            var protCal = proteinG * 4;
            var carbCal = Math.Max(0, cal - protCal - fatCal);
            var carbG = (int)Math.Round(carbCal / 4.0);

            return (cal, proteinG, carbG, fatG);
        }
    }
}

