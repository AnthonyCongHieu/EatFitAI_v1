namespace EatFitAI.API.Data;

public static class CatalogImageKeyResolver
{
    private const string FoodCatalogThumbPrefix = "food-images/v2/thumb/";
    private const string FoodCatalogWebpSuffix = ".webp";
    private const string RecipeImageThumbPrefix = "recipe-images/v1/thumb/";

    public static string? ResolveRecipeThumbnailKey(
        string? recipeName,
        string? explicitImageKey = null,
        IEnumerable<string?>? fallbackThumbnailKeys = null)
    {
        var explicitKey = explicitImageKey?.Trim();
        if (IsRecipeThumbnailKey(explicitKey))
        {
            return explicitKey;
        }

        var exactDishLabel = ResolveExactFinishedDishLabel(recipeName);
        if (!string.IsNullOrWhiteSpace(exactDishLabel))
        {
            return BuildFoodCatalogThumbnailKey(exactDishLabel);
        }

        return SelectNonIngredientFallback(fallbackThumbnailKeys ?? []);
    }

    public static string BuildFoodCatalogThumbnailKey(string label) =>
        $"{FoodCatalogThumbPrefix}{label}.webp";

    public static bool IsRecipeThumbnailKey(string? imageKey) =>
        !string.IsNullOrWhiteSpace(imageKey)
        && imageKey.Trim().StartsWith(RecipeImageThumbPrefix, StringComparison.OrdinalIgnoreCase)
        && imageKey.Trim().EndsWith(FoodCatalogWebpSuffix, StringComparison.OrdinalIgnoreCase);

    private static string? ResolveExactFinishedDishLabel(string? recipeName)
    {
        var key = AiVisionLabelCatalog.NormalizeKey(recipeName);
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        return AiVisionLabelCatalog.Entries
            .Where(entry => RecipeIngredientEligibility.IsFinishedDishKey(entry.Label))
            .FirstOrDefault(entry => BuildExactKeys(entry).Contains(key, StringComparer.Ordinal))
            ?.Label;
    }

    private static IEnumerable<string> BuildExactKeys(AiVisionLabelCatalog.Entry entry)
    {
        yield return AiVisionLabelCatalog.NormalizeKey(entry.Label.Replace('_', ' '));
        yield return AiVisionLabelCatalog.NormalizeKey(entry.DisplayNameVi);
        foreach (var alias in entry.Aliases)
        {
            yield return AiVisionLabelCatalog.NormalizeKey(alias);
        }
    }

    private static string? SelectNonIngredientFallback(IEnumerable<string?> thumbnailKeys)
    {
        return thumbnailKeys
            .Select(thumbnail => thumbnail?.Trim())
            .Where(thumbnail => !string.IsNullOrWhiteSpace(thumbnail))
            .Where(thumbnail => IsFinishedDishFoodCatalogThumbnail(thumbnail!))
            .FirstOrDefault();
    }

    private static bool IsFinishedDishFoodCatalogThumbnail(string thumbnail)
    {
        var label = TryGetFoodCatalogLabelFromThumbnail(thumbnail);
        return label != null && RecipeIngredientEligibility.IsFinishedDishKey(label);
    }

    private static string? TryGetFoodCatalogLabelFromThumbnail(string thumbnail)
    {
        var trimmed = thumbnail.Trim();
        if (!trimmed.StartsWith(FoodCatalogThumbPrefix, StringComparison.OrdinalIgnoreCase)
            || !trimmed.EndsWith(FoodCatalogWebpSuffix, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return trimmed[FoodCatalogThumbPrefix.Length..^FoodCatalogWebpSuffix.Length];
    }
}
