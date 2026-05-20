namespace EatFitAI.API.Data;

public static class CatalogImageKeyResolver
{
    private const string FoodCatalogThumbPrefix = "food-images/v2/thumb/";
    private const string FoodCatalogWebpSuffix = ".webp";
    private const string LegacyRecipeImagePrefix = "recipe-images/";

    public static string? ResolveCatalogThumbnailKey(
        string? displayName,
        string? explicitImageKey = null,
        IEnumerable<string?>? fallbackThumbnailKeys = null,
        IEnumerable<string?>? aliases = null)
    {
        var explicitKey = explicitImageKey?.Trim();
        if (!string.IsNullOrWhiteSpace(explicitKey)
            && !IsLegacyRecipeImageKey(explicitKey))
        {
            return explicitKey;
        }

        var label = ResolveCatalogLabel(displayName, aliases);
        if (!string.IsNullOrWhiteSpace(label))
        {
            return BuildFoodCatalogThumbnailKey(label);
        }

        return SelectFallbackThumbnail(fallbackThumbnailKeys ?? []);
    }

    public static string BuildFoodCatalogThumbnailKey(string label) =>
        $"{FoodCatalogThumbPrefix}{label}.webp";

    public static bool IsLegacyRecipeImageKey(string imageKey) =>
        imageKey.StartsWith(LegacyRecipeImagePrefix, StringComparison.OrdinalIgnoreCase);

    private static string? ResolveCatalogLabel(
        string? displayName,
        IEnumerable<string?>? aliases)
    {
        var values = new[] { displayName }
            .Concat(aliases ?? [])
            .Select((value, index) => new
            {
                Index = index,
                Key = AiVisionLabelCatalog.NormalizeKey(value)
            })
            .Where(item => !string.IsNullOrWhiteSpace(item.Key))
            .ToList();

        if (values.Count == 0)
        {
            return null;
        }

        var label = values
            .SelectMany(value => AiVisionLabelCatalog.Entries
                .SelectMany(entry => BuildLabelPhrases(entry)
                    .Select(phrase => new
                    {
                        Entry = entry,
                        TextIndex = value.Index,
                        Phrase = phrase,
                        PhraseIndex = IndexOfNormalizedPhrase(value.Key, phrase)
                    })))
            .Where(candidate => candidate.PhraseIndex >= 0)
            .OrderBy(candidate => candidate.TextIndex)
            .ThenBy(candidate => candidate.PhraseIndex)
            .ThenByDescending(candidate => candidate.Phrase.Length)
            .ThenBy(candidate => candidate.Entry.IsGeneric)
            .Select(candidate => candidate.Entry.Label)
            .FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(label))
        {
            return label;
        }

        return values
            .Select(value => ResolveKeywordFallbackLabel(value.Key))
            .FirstOrDefault(fallbackLabel => !string.IsNullOrWhiteSpace(fallbackLabel));
    }

    private static string? ResolveKeywordFallbackLabel(string key)
    {
        if (ContainsNormalizedPhrase(key, "bo ne")) return "sizzling_beef_steak";
        if (ContainsNormalizedPhrase(key, "donut")) return "hollow_fried_sesame_donut";
        if (ContainsNormalizedPhrase(key, "cuon") && ContainsNormalizedPhrase(key, "rau cu")) return "goi_cuon";
        if (ContainsNormalizedPhrase(key, "salad")) return "cucumber";
        if (ContainsNormalizedPhrase(key, "rau cu")) return "broccoli";
        if (ContainsNormalizedPhrase(key, "suon")) return "pork_rib";

        return null;
    }

    private static bool ContainsNormalizedPhrase(string value, string phrase) =>
        IndexOfNormalizedPhrase(value, phrase) >= 0;

    private static IEnumerable<string> BuildLabelPhrases(AiVisionLabelCatalog.Entry entry)
    {
        var phrases = new[]
            {
                entry.DisplayNameVi,
                entry.Label.Replace('_', ' ')
            }
            .Concat(entry.Aliases)
            .Select(AiVisionLabelCatalog.NormalizeKey)
            .Where(phrase => !string.IsNullOrWhiteSpace(phrase))
            .Distinct(StringComparer.Ordinal);

        foreach (var phrase in phrases)
        {
            yield return phrase;
        }
    }

    private static int IndexOfNormalizedPhrase(string value, string phrase)
    {
        var index = value.IndexOf(phrase, StringComparison.Ordinal);
        while (index >= 0)
        {
            var beforeBoundary = index == 0 || value[index - 1] == ' ';
            var afterIndex = index + phrase.Length;
            var afterBoundary = afterIndex == value.Length || value[afterIndex] == ' ';
            if (beforeBoundary && afterBoundary)
            {
                return index;
            }

            index = value.IndexOf(phrase, index + 1, StringComparison.Ordinal);
        }

        return -1;
    }

    private static string? SelectFallbackThumbnail(IEnumerable<string?> thumbnailKeys)
    {
        return thumbnailKeys
            .Select(thumbnail => thumbnail?.Trim())
            .Where(thumbnail => !string.IsNullOrWhiteSpace(thumbnail))
            .Where(thumbnail => !IsLegacyRecipeImageKey(thumbnail!))
            .OrderBy(thumbnail => IsGenericFoodCatalogThumbnail(thumbnail!) ? 1 : 0)
            .FirstOrDefault();
    }

    private static bool IsGenericFoodCatalogThumbnail(string thumbnail)
    {
        var label = TryGetFoodCatalogLabelFromThumbnail(thumbnail);
        return label != null && AiVisionLabelCatalog.Find(label)?.IsGeneric == true;
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
