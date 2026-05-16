namespace EatFitAI.API.Data;

public static class CanonicalMasterData
{
    public static readonly IReadOnlyList<ActivityLevelSeed> ActivityLevels =
    [
        new(1, "Sedentary", 1.2m),
        new(2, "Lightly Active", 1.375m),
        new(3, "Moderately Active", 1.55m),
        new(4, "Very Active", 1.725m),
        new(5, "Extremely Active", 1.9m),
    ];

    public static readonly IReadOnlyList<MealTypeSeed> MealTypes =
    [
        new(1, "Breakfast"),
        new(2, "Lunch"),
        new(3, "Dinner"),
        new(4, "Snack"),
    ];

    public static bool TryGetActivityLevelName(int id, out string name)
    {
        var seed = ActivityLevels.FirstOrDefault(item => item.Id == id);
        name = seed?.Name ?? string.Empty;
        return seed != null;
    }

    public static bool TryGetMealTypeName(int id, out string name)
    {
        var seed = MealTypes.FirstOrDefault(item => item.Id == id);
        name = seed?.Name ?? string.Empty;
        return seed != null;
    }

    public static bool TryGetMainMealKey(string? name, out string key)
    {
        key = NormalizeName(name);
        return key is "breakfast" or "lunch" or "dinner";
    }

    public static string NormalizeName(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }

    public sealed record ActivityLevelSeed(int Id, string Name, decimal ActivityFactor);

    public sealed record MealTypeSeed(int Id, string Name);
}
