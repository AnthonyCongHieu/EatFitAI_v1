using System.Text.Json;

namespace EatFitAI.API.Data;

public static class VietnameseFoodCatalog
{
    public const string FoodSeedFileRelativePath = "Data/SeedData/vietnamese_food_catalog.v1.json";
    public const string RecipeSeedFileRelativePath = "Data/SeedData/vietnamese_recipe_catalog.v1.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static IReadOnlyList<FoodSeed> LoadFoodSeeds(string? contentRootPath = null)
    {
        var path = ResolveSeedFilePath(FoodSeedFileRelativePath, contentRootPath);
        if (path == null)
        {
            return Array.Empty<FoodSeed>();
        }

        using var stream = File.OpenRead(path);
        return JsonSerializer.Deserialize<List<FoodSeed>>(stream, JsonOptions)?
            .Where(seed => !string.IsNullOrWhiteSpace(seed.Slug)
                && !string.IsNullOrWhiteSpace(seed.FoodName))
            .ToList() ?? [];
    }

    public static IReadOnlyList<RecipeSeed> LoadRecipeSeeds(string? contentRootPath = null)
    {
        var path = ResolveSeedFilePath(RecipeSeedFileRelativePath, contentRootPath);
        if (path == null)
        {
            return Array.Empty<RecipeSeed>();
        }

        using var stream = File.OpenRead(path);
        return JsonSerializer.Deserialize<List<RecipeSeed>>(stream, JsonOptions)?
            .Where(seed => !string.IsNullOrWhiteSpace(seed.Slug)
                && !string.IsNullOrWhiteSpace(seed.RecipeName))
            .ToList() ?? [];
    }

    public static string BuildSearchText(FoodSeed seed)
    {
        var values = new List<string?>
        {
            seed.FoodName,
            seed.FoodNameEn,
            seed.Slug.Replace('-', ' ')
        };
        values.AddRange(seed.Aliases);

        var normalized = values
            .Select(AiVisionLabelCatalog.NormalizeKey)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        var searchText = string.Join(' ', normalized);
        return searchText.Length <= 255 ? searchText : searchText[..255];
    }

    private static string? ResolveSeedFilePath(string relativePath, string? contentRootPath)
    {
        var candidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(contentRootPath))
        {
            candidates.Add(Path.Combine(contentRootPath, relativePath));
        }

        candidates.Add(Path.Combine(AppContext.BaseDirectory, relativePath));
        candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), "eatfitai-backend", relativePath));
        candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), relativePath));

        return candidates.FirstOrDefault(File.Exists);
    }

    public sealed class FoodSeed
    {
        public string Slug { get; set; } = string.Empty;
        public string FoodName { get; set; } = string.Empty;
        public string? FoodNameEn { get; set; }
        public List<string> Aliases { get; set; } = [];
        public string Kind { get; set; } = "finished_dish";
        public decimal CaloriesPer100g { get; set; }
        public decimal ProteinPer100g { get; set; }
        public decimal CarbPer100g { get; set; }
        public decimal FatPer100g { get; set; }
        public string DefaultServingUnitName { get; set; } = "gram";
        public decimal DefaultGrams { get; set; } = 100;
        public string? ImageKey { get; set; }
        public bool IsVerified { get; set; }
        public string? VerifiedBy { get; set; }
        public string VerificationStatus { get; set; } = "estimated";
        public int CredibilityScore { get; set; } = 70;
        public decimal NutrientCompletenessScore { get; set; } = 100;
        public List<string> MissingNutrients { get; set; } = [];
    }

    public sealed class RecipeSeed
    {
        public string Slug { get; set; } = string.Empty;
        public string RecipeName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<string> Aliases { get; set; } = [];
        public string? ImageKey { get; set; }
        public int CookTimeMinutes { get; set; }
        public string Difficulty { get; set; } = "Dễ";
        public int ServingCount { get; set; } = 1;
        public int CredibilityScore { get; set; } = 70;
        public List<RecipeIngredientSeed> Ingredients { get; set; } = [];
        public List<string> Instructions { get; set; } = [];
        public List<string> SourceUrls { get; set; } = [];
        public string? VideoUrl { get; set; }
    }

    public sealed class RecipeIngredientSeed
    {
        public List<string> Keys { get; set; } = [];
        public decimal Grams { get; set; }
    }
}
