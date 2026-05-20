using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class FlexibleNutritionPlanServiceTests
{
    [Fact]
    public void BuildPlan_LoseBudget_ReturnsFourWeekFlexiblePlan()
    {
        var service = new FlexibleNutritionPlanService();

        var plan = service.BuildPlan(new FlexibleNutritionPlanRequest
        {
            Goal = "lose",
            Preference = "budget",
            TargetCalories = 1900,
            TargetProtein = 140,
            TargetCarbs = 210,
            TargetFat = 55
        });

        Assert.Equal("lose", plan.Goal);
        Assert.Equal("budget", plan.Preference);
        Assert.False(plan.IsFixedMenu);
        Assert.Equal(4, plan.Weeks.Count);
        Assert.Collection(
            plan.Weeks,
            week => Assert.Equal("baseline", week.FocusKey),
            week => Assert.Equal("meal_stability", week.FocusKey),
            week => Assert.Equal("calorie_macro_range", week.FocusKey),
            week => Assert.Equal("personalization", week.FocusKey));
        Assert.Contains(plan.MealTemplates, item => item.MealKey == "lunch" && item.MinCalories == 570 && item.MaxCalories == 665);
        Assert.Contains(plan.PreferenceTips, tip => tip.Contains("tiết kiệm"));
    }

    [Fact]
    public void BuildPlan_UnknownGoalFallsBackToMaintainAndKeepsSoftTemplates()
    {
        var service = new FlexibleNutritionPlanService();

        var plan = service.BuildPlan(new FlexibleNutritionPlanRequest
        {
            Goal = "medical",
            Preference = "eating_out"
        });

        Assert.Equal("maintain", plan.Goal);
        Assert.False(plan.IsFixedMenu);
        Assert.All(plan.MealTemplates, item => Assert.True(item.MaxCalories > item.MinCalories));
        Assert.DoesNotContain(plan.Weeks.SelectMany(week => week.Actions), action => action.Contains("thực đơn cố định"));
    }
}
