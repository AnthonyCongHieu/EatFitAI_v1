using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class NutritionCalculatorTests
{
    [Fact]
    public void FromFoodPer100g_CalculatesMacrosPerGramAndRoundsToTwoDecimals()
    {
        var totals = NutritionCalculator.FromFoodPer100g(
            caloriesPer100g: 165m,
            proteinPer100g: 31m,
            carbPer100g: 0m,
            fatPer100g: 3.6m,
            grams: 150m);

        Assert.Equal(247.5m, totals.Calories);
        Assert.Equal(46.5m, totals.Protein);
        Assert.Equal(0m, totals.Carb);
        Assert.Equal(5.4m, totals.Fat);
    }

    [Fact]
    public void FromRecipeIngredients_SumsOnlyValidActiveNutritionSources()
    {
        var ingredients = new[]
        {
            new RecipeIngredient
            {
                Grams = 100m,
                FoodItem = new FoodItem
                {
                    FoodName = "Cơm trắng",
                    CaloriesPer100g = 130m,
                    ProteinPer100g = 2.7m,
                    CarbPer100g = 28m,
                    FatPer100g = 0.3m,
                    IsActive = true,
                    IsDeleted = false
                }
            },
            new RecipeIngredient
            {
                Grams = 50m,
                FoodItem = new FoodItem
                {
                    FoodName = "Ức gà",
                    CaloriesPer100g = 165m,
                    ProteinPer100g = 31m,
                    CarbPer100g = 0m,
                    FatPer100g = 3.6m,
                    IsActive = true,
                    IsDeleted = false
                }
            }
        };

        var totals = NutritionCalculator.FromRecipeIngredients(ingredients);
        var scaled = NutritionCalculator.ScaleToGrams(totals, sourceGrams: 150m, targetGrams: 75m);

        Assert.Equal(212.5m, totals.Calories);
        Assert.Equal(18.2m, totals.Protein);
        Assert.Equal(28m, totals.Carb);
        Assert.Equal(2.1m, totals.Fat);
        Assert.Equal(106.25m, scaled.Calories);
        Assert.Equal(9.1m, scaled.Protein);
    }

    [Fact]
    public void FromRecipeIngredients_RejectsInactiveIngredientFood()
    {
        var ingredients = new[]
        {
            new RecipeIngredient
            {
                Grams = 100m,
                FoodItem = new FoodItem
                {
                    FoodName = "Inactive food",
                    CaloriesPer100g = 100m,
                    ProteinPer100g = 1m,
                    CarbPer100g = 20m,
                    FatPer100g = 1m,
                    IsActive = false,
                    IsDeleted = false
                }
            }
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            NutritionCalculator.FromRecipeIngredients(ingredients));
        Assert.Contains("inactive", exception.Message, StringComparison.OrdinalIgnoreCase);
    }
}
