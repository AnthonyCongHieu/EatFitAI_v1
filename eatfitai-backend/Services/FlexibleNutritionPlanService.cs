using EatFitAI.API.DTOs.Common;

namespace EatFitAI.API.Services;

public interface IFlexibleNutritionPlanService
{
    FlexibleNutritionPlanDto BuildPlan(FlexibleNutritionPlanRequest request);
}

public sealed class FlexibleNutritionPlanService : IFlexibleNutritionPlanService
{
    public FlexibleNutritionPlanDto BuildPlan(FlexibleNutritionPlanRequest request)
    {
        var goal = NormalizeGoal(request.Goal);
        var preference = NormalizePreference(request.Preference);
        var calories = request.TargetCalories > 0 ? request.TargetCalories : 2000;
        var protein = request.TargetProtein > 0 ? request.TargetProtein : 120;
        var carbs = request.TargetCarbs > 0 ? request.TargetCarbs : 220;
        var fat = request.TargetFat > 0 ? request.TargetFat : 60;

        return new FlexibleNutritionPlanDto
        {
            Goal = goal,
            Preference = preference,
            DurationWeeks = 4,
            IsFixedMenu = false,
            DailyTarget = new NutritionTargetPlanDto
            {
                Calories = calories,
                Protein = protein,
                Carbs = carbs,
                Fat = fat
            },
            MealTemplates = BuildMealTemplates(calories),
            Weeks = BuildWeeks(),
            PreferenceTips = BuildPreferenceTips(preference, goal)
        };
    }

    private static string NormalizeGoal(string? value)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "lose" or "cut" or "fat_loss" => "lose",
            "gain" or "bulk" or "muscle_gain" => "gain",
            "maintain" or "maintenance" => "maintain",
            _ => "maintain"
        };
    }

    private static string NormalizePreference(string? value)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "budget" => "budget",
            "eating_out" or "eat_out" => "eating_out",
            "gym" or "high_protein" => "gym",
            "home" or "home_meals" => "home_meals",
            _ => "home_meals"
        };
    }

    private static List<MealTemplateDto> BuildMealTemplates(int calories)
    {
        return new List<MealTemplateDto>
        {
            BuildTemplate("breakfast", "Bữa sáng", calories, 0.20m, 0.25m, "1 nguồn protein, 1 phần tinh bột vừa, thêm trái cây nếu tiện"),
            BuildTemplate("lunch", "Bữa trưa", calories, 0.30m, 0.35m, "1 nguồn protein rõ, 1 phần tinh bột, 1 phần rau"),
            BuildTemplate("dinner", "Bữa tối", calories, 0.30m, 0.35m, "Ưu tiên protein và rau, giữ tinh bột vừa phải nếu trưa đã cao"),
            BuildTemplate("snack", "Ăn vặt", calories, 0.05m, 0.15m, "Snack nhỏ dễ làm: sữa chua, chuối, trứng, sữa hoặc hạt")
        };
    }

    private static MealTemplateDto BuildTemplate(
        string key,
        string label,
        int calories,
        decimal minRatio,
        decimal maxRatio,
        string structure)
    {
        return new MealTemplateDto
        {
            MealKey = key,
            Label = label,
            MinCalories = (int)Math.Round(calories * minRatio, MidpointRounding.AwayFromZero),
            MaxCalories = (int)Math.Round(calories * maxRatio, MidpointRounding.AwayFromZero),
            Structure = structure
        };
    }

    private static List<PlanWeekDto> BuildWeeks()
    {
        return new List<PlanWeekDto>
        {
            new()
            {
                WeekNumber = 1,
                FocusKey = "baseline",
                Title = "Làm quen và lấy baseline",
                Actions = new List<string>
                {
                    "Log ít nhất 4/7 ngày",
                    "Xác nhận các món hay ăn",
                    "Ghi nhận khung giờ ăn thường gặp"
                }
            },
            new()
            {
                WeekNumber = 2,
                FocusKey = "meal_stability",
                Title = "Ổn định bữa chính",
                Actions = new List<string>
                {
                    "Giữ 2-3 bữa chính mỗi ngày",
                    "Tăng protein ở bữa hay thiếu",
                    "Giảm món gây lệch lớn nếu lặp lại nhiều lần"
                }
            },
            new()
            {
                WeekNumber = 3,
                FocusKey = "calorie_macro_range",
                Title = "Giữ calories và macro trong range",
                Actions = new List<string>
                {
                    "Theo dõi meal budget theo bữa",
                    "Dùng recovery flow khi ăn lố hoặc ăn thiếu",
                    "Tăng tỷ lệ complete day"
                }
            },
            new()
            {
                WeekNumber = 4,
                FocusKey = "personalization",
                Title = "Cá nhân hóa nhẹ",
                Actions = new List<string>
                {
                    "Review một hành động quan trọng nhất",
                    "Đề xuất chỉnh target nếu dữ liệu đủ sạch",
                    "Chọn template tuần tiếp theo"
                }
            }
        };
    }

    private static List<string> BuildPreferenceTips(string preference, string goal)
    {
        var tips = preference switch
        {
            "budget" => new List<string>
            {
                "Ưu tiên món tiết kiệm: trứng, đậu hũ, ức gà, cá hộp, sữa chua, cơm nhà.",
                "Chọn món dễ lặp lại để log lại dưới 30 giây."
            },
            "eating_out" => new List<string>
            {
                "Khi ăn ngoài, chọn phần có protein rõ và xin giảm nước sốt nếu món dễ cao calories.",
                "Nếu món không chắc khẩu phần, lưu rough log rồi xác nhận lại sau."
            },
            "gym" => new List<string>
            {
                "Chia protein đều hơn qua bữa sáng, trưa và tối.",
                "Snack nên hỗ trợ protein thay vì chỉ thêm đường nhanh."
            },
            _ => new List<string>
            {
                "Dùng cơm nhà làm template chính, linh hoạt đổi món nhưng giữ cùng khoảng calories.",
                "Không cần theo thực đơn cố định; chỉ cần giữ cấu trúc bữa."
            }
        };

        if (goal == "lose")
        {
            tips.Add("Giảm mỡ bền hơn khi bữa tối không bị ép nhịn mà chỉ nhẹ hơn một chút.");
        }

        return tips;
    }
}

public sealed class FlexibleNutritionPlanRequest
{
    public string? Goal { get; set; }
    public string? Preference { get; set; }
    public int TargetCalories { get; set; }
    public int TargetProtein { get; set; }
    public int TargetCarbs { get; set; }
    public int TargetFat { get; set; }
}
