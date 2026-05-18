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

    private static readonly IReadOnlyDictionary<string, string> VietnameseCatalogKindByNormalizedKey =
        VietnameseFoodCatalog.LoadFoodSeeds()
            .SelectMany(seed => BuildKeys(seed).Select(key => new { Key = key, seed.Kind }))
            .Where(item => !string.IsNullOrWhiteSpace(item.Key))
            .GroupBy(item => item.Key, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First().Kind, StringComparer.Ordinal);

    public static bool IsIngredientKey(string? value)
    {
        var label = ResolveCatalogLabel(value);
        if (label != null)
        {
            return IngredientLabels.Contains(label);
        }

        return string.Equals(
            ResolveVietnameseCatalogKind(value),
            "ingredient",
            StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsFinishedDishKey(string? value)
    {
        var label = ResolveCatalogLabel(value);
        if (label != null)
        {
            return !IngredientLabels.Contains(label);
        }

        return string.Equals(
            ResolveVietnameseCatalogKind(value),
            "finished_dish",
            StringComparison.OrdinalIgnoreCase);
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

    private static string? ResolveVietnameseCatalogKind(string? value)
    {
        var key = AiVisionLabelCatalog.NormalizeKey(value);
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        return VietnameseCatalogKindByNormalizedKey.TryGetValue(key, out var kind) ? kind : null;
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

    private static IEnumerable<string> BuildKeys(VietnameseFoodCatalog.FoodSeed seed)
    {
        yield return AiVisionLabelCatalog.NormalizeKey(seed.Slug.Replace('-', ' '));
        yield return AiVisionLabelCatalog.NormalizeKey(seed.FoodName);
        yield return AiVisionLabelCatalog.NormalizeKey(seed.FoodNameEn);
        foreach (var alias in seed.Aliases)
        {
            yield return AiVisionLabelCatalog.NormalizeKey(alias);
        }
    }
}
