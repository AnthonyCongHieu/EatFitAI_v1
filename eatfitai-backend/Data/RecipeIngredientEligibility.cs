using EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Data;

public static class RecipeIngredientEligibility
{
    private static readonly HashSet<string> IngredientLabels = new(StringComparer.Ordinal)
    {
        "bun",
        "banh_trang",
        "rice",
        "noodles",
        "chicken",
        "beef",
        "pork",
        "pork_belly",
        "pork_rib",
        "fish",
        "shrimp",
        "crab",
        "squid",
        "egg",
        "tofu",
        "tempeh",
        "tomato",
        "cucumber",
        "carrot",
        "potato",
        "sweet_potato",
        "spinach",
        "water_spinach",
        "bokchoy",
        "cabbage",
        "cauliflower",
        "broccoli",
        "eggplant",
        "bitter_gourd",
        "bottle_gourd",
        "pumpkin",
        "radish",
        "long_beans",
        "beans",
        "peas",
        "mushroom",
        "chayote",
        "corn",
        "onion",
        "shallot",
        "green_onion",
        "garlic",
        "chili",
        "ginger",
        "galangal",
        "lemongrass",
        "leek",
        "lime_leaf",
        "coriander_seed",
        "fennel_seed",
        "star_anise",
        "cinnamon",
        "clove",
        "turmeric",
        "bell_pepper",
        "lime"
    };

    private static readonly IReadOnlyDictionary<string, string> LabelByNormalizedKey =
        AiVisionLabelCatalog.Entries
            .SelectMany(entry => BuildKeys(entry).Select(key => new { Key = key, entry.Label }))
            .GroupBy(item => item.Key, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First().Label, StringComparer.Ordinal);

    public static bool IsIngredientKey(string? value)
    {
        var label = ResolveCatalogLabel(value);
        return label != null && IngredientLabels.Contains(label);
    }

    public static bool IsFinishedDishKey(string? value)
    {
        var label = ResolveCatalogLabel(value);
        return label != null && !IngredientLabels.Contains(label);
    }

    public static bool IsIngredientFood(FoodItem food)
    {
        return IsIngredientKey(food.FoodName)
            || IsIngredientKey(food.FoodNameUnsigned)
            || IsIngredientKey(food.FoodNameEn);
    }

    public static bool IsFinishedDishFood(FoodItem food)
    {
        return IsFinishedDishKey(food.FoodName)
            || IsFinishedDishKey(food.FoodNameUnsigned)
            || IsFinishedDishKey(food.FoodNameEn);
    }

    private static string? ResolveCatalogLabel(string? value)
    {
        var key = AiVisionLabelCatalog.NormalizeKey(value);
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        return LabelByNormalizedKey.TryGetValue(key, out var label) ? label : null;
    }

    private static IEnumerable<string> BuildKeys(AiVisionLabelCatalog.Entry entry)
    {
        yield return AiVisionLabelCatalog.NormalizeKey(entry.Label);
        yield return AiVisionLabelCatalog.NormalizeKey(entry.DisplayNameVi);
        foreach (var alias in entry.Aliases)
        {
            yield return AiVisionLabelCatalog.NormalizeKey(alias);
        }
    }
}
