using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Services;

public readonly record struct NutritionTotals(
    decimal Calories,
    decimal Protein,
    decimal Carb,
    decimal Fat);

public static class NutritionCalculator
{
    public static NutritionTotals FromFoodPer100g(
        decimal caloriesPer100g,
        decimal proteinPer100g,
        decimal carbPer100g,
        decimal fatPer100g,
        decimal grams)
    {
        if (grams <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(grams), "Nutrition grams must be greater than zero.");
        }

        var factor = grams / 100m;
        return Round(new NutritionTotals(
            caloriesPer100g * factor,
            proteinPer100g * factor,
            carbPer100g * factor,
            fatPer100g * factor));
    }

    public static NutritionTotals FromRecipeIngredients(IEnumerable<RecipeIngredient> ingredients)
    {
        return FromFoodItemIngredients(
            ingredients.Select(ingredient => new FoodItemIngredient(
                ingredient.FoodItem,
                ingredient.FoodItemId,
                ingredient.Grams,
                "Recipe ingredient")));
    }

    public static NutritionTotals FromUserDishIngredients(IEnumerable<UserDishIngredient> ingredients)
    {
        return FromFoodItemIngredients(
            ingredients.Select(ingredient => new FoodItemIngredient(
                ingredient.FoodItem,
                ingredient.FoodItemId,
                ingredient.Grams,
                "User dish ingredient")));
    }

    public static decimal TotalRecipeGrams(IEnumerable<RecipeIngredient> ingredients)
    {
        return ingredients.Sum(ingredient => ingredient.Grams);
    }

    public static decimal TotalUserDishGrams(IEnumerable<UserDishIngredient> ingredients)
    {
        return ingredients.Sum(ingredient => ingredient.Grams);
    }

    public static NutritionTotals ScaleToGrams(
        NutritionTotals totals,
        decimal sourceGrams,
        decimal targetGrams)
    {
        if (sourceGrams <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sourceGrams), "Source grams must be greater than zero.");
        }

        if (targetGrams <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(targetGrams), "Target grams must be greater than zero.");
        }

        var scaleFactor = targetGrams / sourceGrams;
        return Round(new NutritionTotals(
            totals.Calories * scaleFactor,
            totals.Protein * scaleFactor,
            totals.Carb * scaleFactor,
            totals.Fat * scaleFactor));
    }

    private static NutritionTotals FromFoodItemIngredients(IEnumerable<FoodItemIngredient> ingredients)
    {
        var totals = new NutritionTotals();
        var totalGrams = 0m;

        foreach (var ingredient in ingredients)
        {
            if (ingredient.FoodItem == null)
            {
                throw new InvalidOperationException($"{ingredient.Context} food item {ingredient.FoodItemId} was not found.");
            }

            if (ingredient.FoodItem.IsDeleted || !ingredient.FoodItem.IsActive)
            {
                throw new InvalidOperationException($"{ingredient.Context} food item {ingredient.FoodItemId} is inactive or deleted.");
            }

            if (ingredient.Grams <= 0)
            {
                throw new InvalidOperationException($"{ingredient.Context} grams must be greater than zero.");
            }

            var itemTotals = FromFoodPer100g(
                ingredient.FoodItem.CaloriesPer100g,
                ingredient.FoodItem.ProteinPer100g,
                ingredient.FoodItem.CarbPer100g,
                ingredient.FoodItem.FatPer100g,
                ingredient.Grams);

            totals = new NutritionTotals(
                totals.Calories + itemTotals.Calories,
                totals.Protein + itemTotals.Protein,
                totals.Carb + itemTotals.Carb,
                totals.Fat + itemTotals.Fat);
            totalGrams += ingredient.Grams;
        }

        if (totalGrams <= 0)
        {
            throw new InvalidOperationException("Nutrition source must contain at least one positive-gram ingredient.");
        }

        return Round(totals);
    }

    private static NutritionTotals Round(NutritionTotals totals)
    {
        return new NutritionTotals(
            Math.Round(totals.Calories, 2),
            Math.Round(totals.Protein, 2),
            Math.Round(totals.Carb, 2),
            Math.Round(totals.Fat, 2));
    }

    private sealed record FoodItemIngredient(
        FoodItem? FoodItem,
        int FoodItemId,
        decimal Grams,
        string Context);
}
