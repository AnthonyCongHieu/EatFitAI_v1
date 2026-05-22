using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace EatFitAI.API.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();

            await SeedActivityLevelsAsync(context);
            await SeedServingUnitsAsync(context);
            await SeedMealTypesAsync(context);
            await SeedFoodItemsAsync(context);
            await SeedAiVisionCatalogFoodItemsAsync(context, env.ContentRootPath);
            await SeedAiLabelMapsAsync(context);
            await SeedFoodServingsAsync(context);
            await SeedAiVisionCatalogServingsAsync(context, env.ContentRootPath);
            await SeedVietnameseFoodCatalogAsync(context, env.ContentRootPath);
            await SeedVietnameseFoodServingsAsync(context, env.ContentRootPath);
            await SeedRecipesAsync(context);  // Thêm seed recipes
            await SeedVietnameseRecipesAsync(context, env.ContentRootPath);
            await SeedDefaultUserPasswordsAsync(context, env);
        }

        private static async Task SeedActivityLevelsAsync(EatFitAIDbContext context)
        {
            var existingRows = await context.ActivityLevels.ToListAsync();
            foreach (var seed in CanonicalMasterData.ActivityLevels)
            {
                var existingById = existingRows.FirstOrDefault(item => item.ActivityLevelId == seed.Id);
                var existingByName = existingRows.FirstOrDefault(item =>
                    string.Equals(item.Name, seed.Name, StringComparison.OrdinalIgnoreCase));

                if (existingById != null)
                {
                    if (existingByName != null && existingByName.ActivityLevelId != existingById.ActivityLevelId)
                    {
                        existingByName.ActivityFactor = seed.ActivityFactor;
                        continue;
                    }

                    existingById.Name = seed.Name;
                    existingById.ActivityFactor = seed.ActivityFactor;
                    continue;
                }

                if (existingByName != null)
                {
                    existingByName.ActivityFactor = seed.ActivityFactor;
                    continue;
                }

                var activityLevel = new ActivityLevel
                {
                    ActivityLevelId = seed.Id,
                    Name = seed.Name,
                    ActivityFactor = seed.ActivityFactor,
                };
                existingRows.Add(activityLevel);
                await context.ActivityLevels.AddAsync(activityLevel);
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedServingUnitsAsync(EatFitAIDbContext context)
        {
            var units = new[] { "gram", "milliliter", "cup", "tablespoon", "teaspoon", "piece", "slice", "bowl", "plate" };
            var existingNames = await context.ServingUnits
                .Select(su => su.Name)
                .ToListAsync();

            var toAdd = new List<ServingUnit>();
            foreach (var unitName in units)
            {
                if (!existingNames.Contains(unitName, StringComparer.OrdinalIgnoreCase))
                {
                    toAdd.Add(new ServingUnit { Name = unitName });
                }
            }

            if (toAdd.Count > 0)
            {
                await context.ServingUnits.AddRangeAsync(toAdd);
                await context.SaveChangesAsync();
            }
        }

        private static async Task SeedMealTypesAsync(EatFitAIDbContext context)
        {
            var existingRows = await context.MealTypes.ToListAsync();
            foreach (var seed in CanonicalMasterData.MealTypes)
            {
                var existingById = existingRows.FirstOrDefault(item => item.MealTypeId == seed.Id);
                var existingByName = existingRows.FirstOrDefault(item =>
                    string.Equals(item.Name, seed.Name, StringComparison.OrdinalIgnoreCase));

                if (existingById != null)
                {
                    if (existingByName != null && existingByName.MealTypeId != existingById.MealTypeId)
                    {
                        continue;
                    }

                    existingById.Name = seed.Name;
                    continue;
                }

                if (existingByName != null)
                {
                    continue;
                }

                var mealType = new MealType
                {
                    MealTypeId = seed.Id,
                    Name = seed.Name,
                };
                existingRows.Add(mealType);
                await context.MealTypes.AddAsync(mealType);
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedFoodItemsAsync(EatFitAIDbContext context)
        {
            var now = DateTime.UtcNow;
            var foodItems = new LegacyFoodSeed[]
            {
                new("Ức gà (luộc)", "Chicken breast (cooked)", 165m, 31m, 0m, 3.6m, ["Chicken Breast"]),
                new("Cơm gạo lứt (chín)", "Brown rice (cooked)", 123m, 2.74m, 25.58m, 0.97m, ["Brown Rice"]),
                new("Bông cải xanh", "Broccoli", 34m, 2.8m, 7m, 0.4m, ["Broccoli"]),
                new("Chuối (tươi)", "Banana", 89m, 1.09m, 22.84m, 0.33m, ["Banana"]),
                new("Sữa chua Hy Lạp không béo", "Greek yogurt (plain, nonfat)", 59m, 10.3m, 3.6m, 0.4m, ["Greek Yogurt"]),
                new("Hạt hạnh nhân", "Almonds", 579m, 21.15m, 21.55m, 49.93m, ["Almonds"]),
                new("Cá hồi (sống)", "Salmon (raw)", 208m, 20.42m, 0m, 13.42m, ["Salmon"]),
                new("Khoai lang", "Sweet potato", 86m, 1.6m, 20m, 0.1m, ["Sweet Potato"]),
                new("Rau chân vịt", "Spinach", 23m, 2.9m, 3.6m, 0.4m, ["Spinach"]),
                new("Trứng", "Egg", 155m, 13m, 1.1m, 11m, ["Egg"])
            };

            var activeFoodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();

            var toAdd = new List<FoodItem>();
            foreach (var seed in foodItems)
            {
                var existing = FindLegacySeedFood(seed, activeFoodItems);
                if (existing == null)
                {
                    existing = new FoodItem
                    {
                        CreatedAt = now,
                    };
                    activeFoodItems.Add(existing);
                    toAdd.Add(existing);
                }

                existing.FoodName = seed.FoodName;
                existing.FoodNameEn = seed.FoodNameEn;
                existing.FoodNameUnsigned = BuildLegacySeedSearchText(seed);
                existing.CaloriesPer100g = seed.CaloriesPer100g;
                existing.ProteinPer100g = seed.ProteinPer100g;
                existing.CarbPer100g = seed.CarbPer100g;
                existing.FatPer100g = seed.FatPer100g;
                existing.IsActive = true;
                existing.IsDeleted = false;
                existing.IsVerified = true;
                existing.VerifiedBy = "USDA FoodData Central reference";
                existing.VerificationStatus = "verified_reference";
                existing.CredibilityScore = 88;
                existing.NutrientCompletenessScore = 100;
                existing.MissingNutrients = null;
                existing.LastReviewedAt = now;
                existing.UpdatedAt = now;
            }

            if (toAdd.Count > 0)
            {
                await context.FoodItems.AddRangeAsync(toAdd);
                await context.SaveChangesAsync();
            }
        }

        private sealed record LegacyFoodSeed(
            string FoodName,
            string FoodNameEn,
            decimal CaloriesPer100g,
            decimal ProteinPer100g,
            decimal CarbPer100g,
            decimal FatPer100g,
            IReadOnlyList<string> Aliases);

        private static FoodItem? FindLegacySeedFood(
            LegacyFoodSeed seed,
            IReadOnlyCollection<FoodItem> activeFoodItems)
        {
            var keys = BuildLegacySeedKeys(seed);
            return activeFoodItems.FirstOrDefault(food =>
                keys.Contains(NormalizeCatalogKey(food.FoodName)) ||
                keys.Contains(NormalizeCatalogKey(food.FoodNameUnsigned)) ||
                keys.Contains(NormalizeCatalogKey(food.FoodNameEn)));
        }

        private static string BuildLegacySeedSearchText(LegacyFoodSeed seed)
        {
            var normalized = BuildLegacySeedKeys(seed).ToList();
            var searchText = string.Join(' ', normalized);
            return searchText.Length <= 255 ? searchText : searchText[..255];
        }

        private static HashSet<string> BuildLegacySeedKeys(LegacyFoodSeed seed)
        {
            return new[] { seed.FoodName, seed.FoodNameEn }
                .Concat(seed.Aliases)
                .Select(NormalizeCatalogKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.Ordinal)
                .ToHashSet(StringComparer.Ordinal);
        }

        private static readonly string[] Yolo11mCleanV1Labels =
            AiVisionLabelCatalog.Entries.Select(entry => entry.Label).ToArray();

        private static async Task SeedAiLabelMapsAsync(EatFitAIDbContext context)
        {
            var now = DateTime.UtcNow;
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();

            foreach (var label in Yolo11mCleanV1Labels)
            {
                var foodItem = FindCatalogFood(label, foodItems);
                var foodItemId = foodItem?.FoodItemId;
                var minConfidence = GetSeedMinConfidence(label, foodItemId);
                var existing = await context.AiLabelMaps.FindAsync(label);
                if (existing == null)
                {
                    await context.AiLabelMaps.AddAsync(new AiLabelMap
                    {
                        Label = label,
                        FoodItemId = foodItemId,
                        MinConfidence = minConfidence,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                else
                {
                    if (foodItemId.HasValue && existing.FoodItemId != foodItemId)
                    {
                        existing.FoodItemId = foodItemId;
                    }

                    existing.MinConfidence = Math.Max(existing.MinConfidence, minConfidence);
                }
            }

            await context.SaveChangesAsync();
        }

        private static decimal GetSeedMinConfidence(string label, int? foodItemId)
        {
            if (!foodItemId.HasValue)
            {
                return 0.60m;
            }

            var catalogEntry = AiVisionLabelCatalog.Find(label);
            return catalogEntry?.MinConfidence ?? 0.60m;
        }

        private static FoodItem? FindCatalogFood(string label, IReadOnlyCollection<FoodItem> foodItems)
        {
            var aliases = BuildCatalogAliases(label);

            return foodItems
                .Select(food => new
                {
                    Food = food,
                    Score = ScoreCatalogFood(food, aliases)
                })
                .Where(match => match.Score > 0)
                .OrderByDescending(match => match.Score)
                .ThenByDescending(match => match.Food.CredibilityScore)
                .ThenBy(match => match.Food.FoodName.Length)
                .Select(match => match.Food)
                .FirstOrDefault();
        }

        private static IReadOnlyList<string> BuildCatalogAliases(string label)
        {
            var aliases = new List<string> { label.Replace('_', ' ') };
            var entry = AiVisionLabelCatalog.Find(label);
            if (entry != null)
            {
                aliases.Add(entry.DisplayNameVi);
                aliases.AddRange(entry.Aliases);
            }

            return aliases
                .Select(NormalizeCatalogKey)
                .Where(alias => !string.IsNullOrWhiteSpace(alias))
                .Distinct(StringComparer.Ordinal)
                .ToList();
        }

        private static int ScoreCatalogFood(FoodItem food, IReadOnlyList<string> aliases)
        {
            var names = new[]
            {
                food.FoodName,
                food.FoodNameUnsigned,
                food.FoodNameEn
            }
                .Select(NormalizeCatalogKey)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            var bestScore = 0;
            for (var index = 0; index < aliases.Count; index++)
            {
                var alias = aliases[index];
                var aliasPriority = aliases.Count - index;
                if (names.Any(name => name.Equals(alias, StringComparison.Ordinal)))
                {
                    bestScore = Math.Max(bestScore, 3000 + aliasPriority);
                    continue;
                }

                if (names.Any(name => name.StartsWith(alias + " ", StringComparison.Ordinal)))
                {
                    bestScore = Math.Max(bestScore, 2000 + aliasPriority);
                    continue;
                }

                if (names.Any(name => name.Contains(" " + alias + " ", StringComparison.Ordinal)
                    || name.EndsWith(" " + alias, StringComparison.Ordinal)))
                {
                    bestScore = Math.Max(bestScore, 1000 + aliasPriority);
                }
            }

            return bestScore;
        }

        private static string NormalizeCatalogKey(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var lower = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(lower.Length);
            var lastWasSpace = true;

            foreach (var c in lower)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                var normalized = c == 'đ' ? 'd' : c;
                if (char.IsLetterOrDigit(normalized))
                {
                    builder.Append(normalized);
                    lastWasSpace = false;
                }
                else if (!lastWasSpace)
                {
                    builder.Append(' ');
                    lastWasSpace = true;
                }
            }

            return builder.ToString().Trim().Normalize(NormalizationForm.FormC);
        }

        private static async Task SeedAiVisionCatalogFoodItemsAsync(EatFitAIDbContext context, string contentRootPath)
        {
            var seeds = AiVisionLabelCatalog.LoadFoodSeeds(contentRootPath);
            if (seeds.Count == 0)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();
            foreach (var seed in seeds)
            {
                var entry = AiVisionLabelCatalog.Find(seed.Label);
                if (entry == null)
                {
                    continue;
                }

                var food = FindSeedCatalogFood(seed, entry, foodItems);

                if (food == null)
                {
                    food = new FoodItem
                    {
                        CreatedAt = now,
                    };
                    foodItems.Add(food);
                    await context.FoodItems.AddAsync(food);
                }

                food.FoodName = string.IsNullOrWhiteSpace(seed.FoodName) ? entry.DisplayNameVi : seed.FoodName.Trim();
                food.FoodNameEn = string.IsNullOrWhiteSpace(seed.FoodNameEn) ? null : seed.FoodNameEn.Trim();
                food.FoodNameUnsigned = AiVisionLabelCatalog.NormalizeKey(food.FoodName);
                food.ThumbNail = string.IsNullOrWhiteSpace(food.ThumbNail)
                    ? BuildAiVisionCatalogThumbnailKey(seed.Label)
                    : food.ThumbNail;
                food.CaloriesPer100g = seed.CaloriesPer100g;
                food.ProteinPer100g = seed.ProteinPer100g;
                food.CarbPer100g = seed.CarbPer100g;
                food.FatPer100g = seed.FatPer100g;
                food.IsActive = true;
                food.IsDeleted = false;
                food.IsVerified = seed.IsVerified;
                food.VerifiedBy = seed.VerifiedBy;
                food.VerificationStatus = seed.VerificationStatus;
                food.CredibilityScore = seed.CredibilityScore;
                food.NutrientCompletenessScore = seed.NutrientCompletenessScore;
                food.MissingNutrients = FoodTrustBuilder.SerializeMissingNutrients(seed.MissingNutrients);
                food.LastReviewedAt = now;
                food.UpdatedAt = now;
            }

            await context.SaveChangesAsync();
        }

        private static string BuildAiVisionCatalogThumbnailKey(string label)
        {
            return $"food-images/v2/thumb/{label}.webp";
        }

        private static FoodItem? FindSeedCatalogFood(
            AiVisionLabelCatalog.FoodSeed seed,
            AiVisionLabelCatalog.Entry entry,
            IReadOnlyCollection<FoodItem> foodItems)
        {
            var seedKeys = new[]
            {
                seed.FoodName,
                seed.FoodNameEn,
                entry.DisplayNameVi
            }
                .Select(NormalizeCatalogKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.Ordinal)
                .ToHashSet(StringComparer.Ordinal);

            if (seedKeys.Count == 0)
            {
                return null;
            }

            return foodItems.FirstOrDefault(item =>
                seedKeys.Contains(NormalizeCatalogKey(item.FoodName)) ||
                seedKeys.Contains(NormalizeCatalogKey(item.FoodNameUnsigned)) ||
                seedKeys.Contains(NormalizeCatalogKey(item.FoodNameEn)));
        }

        private static async Task SeedAiVisionCatalogServingsAsync(EatFitAIDbContext context, string contentRootPath)
        {
            var seeds = AiVisionLabelCatalog.LoadFoodSeeds(contentRootPath);
            if (seeds.Count == 0)
            {
                return;
            }

            var servingUnits = await context.ServingUnits.ToListAsync();
            var now = DateTime.UtcNow;
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();

            foreach (var seed in seeds)
            {
                var food = FindCatalogFood(seed.Label, foodItems);
                var servingUnit = servingUnits.FirstOrDefault(unit =>
                    string.Equals(unit.Name, seed.DefaultServingUnitName, StringComparison.OrdinalIgnoreCase));

                if (food == null || servingUnit == null || seed.DefaultGrams <= 0)
                {
                    continue;
                }

                var existing = await context.FoodServings.FirstOrDefaultAsync(serving =>
                    serving.FoodItemId == food.FoodItemId &&
                    serving.ServingUnitId == servingUnit.ServingUnitId);

                if (existing == null)
                {
                    await context.FoodServings.AddAsync(new FoodServing
                    {
                        FoodItemId = food.FoodItemId,
                        ServingUnitId = servingUnit.ServingUnitId,
                        GramsPerUnit = seed.DefaultGrams,
                        Description = $"Mặc định AI scan: {food.FoodName}"
                    });
                }
                else
                {
                    existing.GramsPerUnit = seed.DefaultGrams;
                    existing.Description ??= $"Mặc định AI scan: {food.FoodName}";
                }
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedVietnameseFoodCatalogAsync(EatFitAIDbContext context, string contentRootPath)
        {
            var seeds = VietnameseFoodCatalog.LoadFoodSeeds(contentRootPath);
            if (seeds.Count == 0)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();
            foreach (var seed in seeds)
            {
                var food = FindVietnameseCatalogFood(seed, foodItems);
                var isNew = food == null;

                if (food == null)
                {
                    food = new FoodItem
                    {
                        CreatedAt = now,
                    };
                    foodItems.Add(food);
                    await context.FoodItems.AddAsync(food);
                }

                food.FoodName = seed.FoodName.Trim();
                food.FoodNameEn = string.IsNullOrWhiteSpace(seed.FoodNameEn) ? food.FoodNameEn : seed.FoodNameEn.Trim();
                food.FoodNameUnsigned = VietnameseFoodCatalog.BuildSearchText(seed);
                if (!string.IsNullOrWhiteSpace(seed.ImageKey))
                {
                    food.ThumbNail = seed.ImageKey.Trim();
                }
                else if (string.IsNullOrWhiteSpace(food.ThumbNail))
                {
                    food.ThumbNail = null;
                }

                if (isNew || food.CredibilityScore <= 50)
                {
                    food.CaloriesPer100g = seed.CaloriesPer100g;
                    food.ProteinPer100g = seed.ProteinPer100g;
                    food.CarbPer100g = seed.CarbPer100g;
                    food.FatPer100g = seed.FatPer100g;
                    food.IsVerified = seed.IsVerified;
                    food.VerifiedBy = seed.VerifiedBy;
                    food.VerificationStatus = seed.VerificationStatus;
                    food.CredibilityScore = seed.CredibilityScore;
                    food.NutrientCompletenessScore = seed.NutrientCompletenessScore;
                    food.MissingNutrients = FoodTrustBuilder.SerializeMissingNutrients(seed.MissingNutrients);
                    food.LastReviewedAt = now;
                }

                food.IsActive = true;
                food.IsDeleted = false;
                food.LastReviewedAt ??= now;
                food.UpdatedAt = now;
            }

            await context.SaveChangesAsync();
        }

        private static FoodItem? FindVietnameseCatalogFood(
            VietnameseFoodCatalog.FoodSeed seed,
            IReadOnlyCollection<FoodItem> foodItems)
        {
            var seedKeys = new[]
            {
                seed.FoodName,
                seed.FoodNameEn,
                seed.Slug.Replace('-', ' ')
            }
                .Concat(seed.Aliases)
                .Select(NormalizeCatalogKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.Ordinal)
                .ToHashSet(StringComparer.Ordinal);

            if (seedKeys.Count == 0)
            {
                return null;
            }

            return foodItems.FirstOrDefault(item =>
                seedKeys.Contains(NormalizeCatalogKey(item.FoodName)) ||
                seedKeys.Contains(NormalizeCatalogKey(item.FoodNameUnsigned)) ||
                seedKeys.Contains(NormalizeCatalogKey(item.FoodNameEn)));
        }

        private static async Task SeedVietnameseFoodServingsAsync(EatFitAIDbContext context, string contentRootPath)
        {
            var seeds = VietnameseFoodCatalog.LoadFoodSeeds(contentRootPath);
            if (seeds.Count == 0)
            {
                return;
            }

            var servingUnits = await context.ServingUnits.ToListAsync();
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();

            foreach (var seed in seeds)
            {
                var food = FindVietnameseCatalogFood(seed, foodItems);
                var servingUnit = servingUnits.FirstOrDefault(unit =>
                    string.Equals(unit.Name, seed.DefaultServingUnitName, StringComparison.OrdinalIgnoreCase));

                if (food == null || servingUnit == null || seed.DefaultGrams <= 0)
                {
                    continue;
                }

                var existing = await context.FoodServings.FirstOrDefaultAsync(serving =>
                    serving.FoodItemId == food.FoodItemId &&
                    serving.ServingUnitId == servingUnit.ServingUnitId);

                if (existing == null)
                {
                    await context.FoodServings.AddAsync(new FoodServing
                    {
                        FoodItemId = food.FoodItemId,
                        ServingUnitId = servingUnit.ServingUnitId,
                        GramsPerUnit = seed.DefaultGrams,
                        Description = $"Mặc định catalog món Việt: {food.FoodName}"
                    });
                }
                else
                {
                    existing.GramsPerUnit = seed.DefaultGrams;
                    existing.Description ??= $"Mặc định catalog món Việt: {food.FoodName}";
                }
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedFoodServingsAsync(EatFitAIDbContext context)
        {
            var gramUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "gram");
            var cupUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "cup");
            var pieceUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "piece");
            var tablespoonUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "tablespoon");

            if (gramUnit == null || cupUnit == null || pieceUnit == null || tablespoonUnit == null) return;

            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();
            var existingServings = await context.FoodServings.ToListAsync();

            var foodServings = new List<FoodServing>();

            foreach (var foodItem in foodItems)
            {
                // Add gram serving for all foods
                if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == gramUnit.ServingUnitId))
                {
                    foodServings.Add(new FoodServing
                    {
                        FoodItemId = foodItem.FoodItemId,
                        ServingUnitId = gramUnit.ServingUnitId,
                        GramsPerUnit = 100
                    });
                }

                // Add specific servings based on food type
                switch (foodItem.FoodName)
                {
                    case "Ức gà (luộc)":
                        if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == pieceUnit.ServingUnitId))
                        {
                            foodServings.Add(new FoodServing
                            {
                                FoodItemId = foodItem.FoodItemId,
                                ServingUnitId = pieceUnit.ServingUnitId,
                                GramsPerUnit = 150 // Average chicken breast piece
                            });
                        }
                        break;
                    case "Cơm gạo lứt (chín)":
                        if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == cupUnit.ServingUnitId))
                        {
                            foodServings.Add(new FoodServing
                            {
                                FoodItemId = foodItem.FoodItemId,
                                ServingUnitId = cupUnit.ServingUnitId,
                                GramsPerUnit = 185 // Cooked rice cup
                            });
                        }
                        break;
                    case "Chuối (tươi)":
                        if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == pieceUnit.ServingUnitId))
                        {
                            foodServings.Add(new FoodServing
                            {
                                FoodItemId = foodItem.FoodItemId,
                                ServingUnitId = pieceUnit.ServingUnitId,
                                GramsPerUnit = 118 // Average banana
                            });
                        }
                        break;
                    case "Sữa chua Hy Lạp không béo":
                        if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == cupUnit.ServingUnitId))
                        {
                            foodServings.Add(new FoodServing
                            {
                                FoodItemId = foodItem.FoodItemId,
                                ServingUnitId = cupUnit.ServingUnitId,
                                GramsPerUnit = 245 // Standard yogurt cup
                            });
                        }
                        break;
                    case "Hạt hạnh nhân":
                        if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == tablespoonUnit.ServingUnitId))
                        {
                            foodServings.Add(new FoodServing
                            {
                                FoodItemId = foodItem.FoodItemId,
                                ServingUnitId = tablespoonUnit.ServingUnitId,
                                GramsPerUnit = 12 // 1 tbsp almonds
                            });
                        }
                        break;
                    case "Trứng":
                        if (!existingServings.Any(fs => fs.FoodItemId == foodItem.FoodItemId && fs.ServingUnitId == pieceUnit.ServingUnitId))
                        {
                            foodServings.Add(new FoodServing
                            {
                                FoodItemId = foodItem.FoodItemId,
                                ServingUnitId = pieceUnit.ServingUnitId,
                                GramsPerUnit = 50 // Average egg
                            });
                        }
                        break;
                }
            }

            if (foodServings.Count > 0)
            {
                await context.FoodServings.AddRangeAsync(foodServings);
                await context.SaveChangesAsync();
            }
        }

        private static async Task SeedDefaultUserPasswordsAsync(EatFitAIDbContext context, IHostEnvironment env)
        {
            var defaultPassword = Environment.GetEnvironmentVariable("EATFITAI_SEED_DEFAULT_PASSWORD");
            if (string.IsNullOrWhiteSpace(defaultPassword))
            {
                if (!env.IsDevelopment())
                {
                    return;
                }

                defaultPassword = "EatFit@123";
            }

            var passwordHash = HashPassword(defaultPassword);

            var usersToUpdate = await context.Users
                .Where(u => string.IsNullOrEmpty(u.PasswordHash))
                .ToListAsync();

            if (!usersToUpdate.Any())
            {
                return;
            }

            foreach (var user in usersToUpdate)
            {
                user.PasswordHash = passwordHash;
            }

            await context.SaveChangesAsync();
        }

        private static string HashPassword(string password)
        {
            const int iterations = 100_000;
            const int saltSize = 16;
            const int keySize = 32;

            var salt = RandomNumberGenerator.GetBytes(saltSize);
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                keySize);

            return $"PBKDF2${iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        /// <summary>
        /// Seed sample recipes với món Việt Nam phổ biến
        /// </summary>
        private static async Task SeedRecipesAsync(EatFitAIDbContext context)
        {
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();
            var recipes = await context.Recipes
                .Include(recipe => recipe.RecipeIngredients)
                .ToListAsync();
            var recipesByName = recipes
                .GroupBy(recipe => NormalizeCatalogKey(recipe.RecipeName), StringComparer.Ordinal)
                .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);
            var now = DateTime.UtcNow;

            foreach (var seed in RecipeSeeds)
            {
                var resolvedFoodIngredients = seed.Ingredients
                    .Select(ingredient => new
                    {
                        Food = FindSeedFood(foodItems, ingredient.Keys),
                        ingredient.Grams
                    })
                    .Where(item => item.Food != null)
                    .ToList();
                var resolvedIngredients = resolvedFoodIngredients
                    .Select(item => new RecipeIngredient
                    {
                        FoodItemId = item.Food!.FoodItemId,
                        Grams = item.Grams
                    })
                    .GroupBy(item => item.FoodItemId)
                    .Select(group => new RecipeIngredient
                    {
                        FoodItemId = group.Key,
                        Grams = group.Sum(item => item.Grams)
                    })
                    .ToList();

                if (resolvedIngredients.Count < 2)
                {
                    continue;
                }

                var recipeKey = NormalizeCatalogKey(seed.Name);
                if (!recipesByName.TryGetValue(recipeKey, out var recipe))
                {
                    recipe = new Recipe
                    {
                        RecipeName = seed.Name,
                        CreatedAt = now
                    };
                    recipesByName[recipeKey] = recipe;
                    await context.Recipes.AddAsync(recipe);
                }

                recipe.RecipeName = seed.Name;
                recipe.Description = seed.Description;
                recipe.ImageUrl = ResolveSeedRecipeImageUrl(seed.Name, recipe.ImageUrl, resolvedFoodIngredients
                    .Select(item => item.Food!.ThumbNail)
                    .FirstOrDefault(image => !string.IsNullOrWhiteSpace(image)));
                recipe.CookTimeMinutes = seed.CookTimeMinutes;
                recipe.Difficulty = seed.Difficulty;
                recipe.ServingCount = seed.ServingCount;
                recipe.CredibilityScore = seed.CredibilityScore;
                recipe.UpdatedAt = now;
                recipe.IsDeleted = false;

                if (recipe.RecipeId != 0)
                {
                    context.RecipeIngredients.RemoveRange(recipe.RecipeIngredients.ToList());
                }

                foreach (var ingredient in resolvedIngredients)
                {
                    ingredient.Recipe = recipe;
                    await context.RecipeIngredients.AddAsync(ingredient);
                }
            }

            await context.SaveChangesAsync();
        }

        private static FoodItem? FindSeedFood(IReadOnlyCollection<FoodItem> foodItems, IReadOnlyCollection<string> keys)
        {
            var normalizedKeys = ExpandRecipeIngredientKeys(keys)
                .Select(NormalizeCatalogKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (normalizedKeys.Count == 0)
            {
                return null;
            }

            return foodItems.FirstOrDefault(food => FoodMatchesRecipeKeys(food, normalizedKeys, exactOnly: true))
                ?? foodItems.FirstOrDefault(food => FoodMatchesRecipeKeys(food, normalizedKeys, exactOnly: false));
        }

        private static IEnumerable<string> ExpandRecipeIngredientKeys(IEnumerable<string> keys)
        {
            foreach (var key in keys)
            {
                if (string.IsNullOrWhiteSpace(key))
                {
                    continue;
                }

                yield return key;
                var entry = AiVisionLabelCatalog.Find(key);
                if (entry == null)
                {
                    continue;
                }

                yield return entry.Label;
                yield return entry.DisplayNameVi;
                foreach (var alias in entry.Aliases)
                {
                    yield return alias;
                }
            }
        }

        private static bool FoodMatchesRecipeKeys(FoodItem food, IReadOnlyCollection<string> normalizedKeys, bool exactOnly)
        {
            var foodKeys = new[]
            {
                food.FoodName,
                food.FoodNameUnsigned,
                food.FoodNameEn
            }
                .Select(NormalizeCatalogKey)
                .Where(key => !string.IsNullOrWhiteSpace(key))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            if (foodKeys.Any(normalizedKeys.Contains))
            {
                return true;
            }

            return !exactOnly && foodKeys.Any(foodKey =>
                normalizedKeys.Any(seedKey =>
                    seedKey.Length >= 3 &&
                    (foodKey.Contains(seedKey, StringComparison.Ordinal) ||
                     seedKey.Contains(foodKey, StringComparison.Ordinal))));
        }

        private static string? ResolveSeedRecipeImageUrl(
            string recipeName,
            string? currentImageUrl,
            string? primaryIngredientImageUrl)
        {
            return CatalogImageKeyResolver.ResolveRecipeThumbnailKey(
                recipeName,
                currentImageUrl,
                new[] { primaryIngredientImageUrl });
        }

        private static async Task SeedVietnameseRecipesAsync(EatFitAIDbContext context, string contentRootPath)
        {
            var seeds = VietnameseFoodCatalog.LoadRecipeSeeds(contentRootPath);
            if (seeds.Count == 0)
            {
                return;
            }

            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();
            var recipes = await context.Recipes
                .Include(recipe => recipe.RecipeIngredients)
                .ToListAsync();
            var recipesByName = recipes
                .GroupBy(recipe => NormalizeCatalogKey(recipe.RecipeName), StringComparer.Ordinal)
                .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);
            var now = DateTime.UtcNow;

            foreach (var seed in seeds)
            {
                var resolvedIngredientFoods = seed.Ingredients
                    .Select(ingredient => new
                    {
                        Food = FindSeedFood(foodItems, ingredient.Keys),
                        ingredient.Grams
                    })
                    .Where(item => item.Food != null)
                    .ToList();
                var resolvedIngredients = resolvedIngredientFoods
                    .Select(item => new RecipeIngredient
                    {
                        FoodItemId = item.Food!.FoodItemId,
                        Grams = item.Grams
                    })
                    .GroupBy(item => item.FoodItemId)
                    .Select(group => new RecipeIngredient
                    {
                        FoodItemId = group.Key,
                        Grams = group.Sum(item => item.Grams)
                    })
                    .ToList();

                if (resolvedIngredients.Count < 2)
                {
                    continue;
                }

                var recipeKeys = BuildRecipeSeedLookupKeys(seed).ToList();
                var recipeKey = recipeKeys[0];
                var recipe = recipeKeys
                    .Select(key => recipesByName.TryGetValue(key, out var existing) ? existing : null)
                    .FirstOrDefault(existing => existing != null);
                if (recipe == null)
                {
                    recipe = new Recipe
                    {
                        RecipeName = seed.RecipeName,
                        CreatedAt = now
                    };
                    recipesByName[recipeKey] = recipe;
                    await context.Recipes.AddAsync(recipe);
                }

                recipe.RecipeName = seed.RecipeName;
                recipe.Description = seed.Description;
                recipe.ImageUrl = CatalogImageKeyResolver.ResolveRecipeThumbnailKey(
                    seed.RecipeName,
                    seed.ImageKey,
                    resolvedIngredientFoods.Select(item => item.Food!.ThumbNail));
                recipe.CookTimeMinutes = seed.CookTimeMinutes;
                recipe.Difficulty = seed.Difficulty;
                recipe.ServingCount = seed.ServingCount;
                recipe.CredibilityScore = seed.CredibilityScore;
                if (seed.PrepItems.Count > 0 || seed.Seasonings.Count > 0 || !string.IsNullOrEmpty(seed.CookingMethod))
                {
                    var instructionsObj = new
                    {
                        steps = seed.Instructions,
                        prepItems = seed.PrepItems,
                        seasonings = seed.Seasonings,
                        cookingMethod = seed.CookingMethod ?? "Khác",
                        tips = seed.Tips
                    };
                    recipe.InstructionsJson = JsonSerializer.Serialize(instructionsObj, SeedJsonOptions);
                }
                else
                {
                    recipe.InstructionsJson = SerializeSeedStringList(seed.Instructions);
                }
                recipe.SourceUrlsJson = SerializeSeedStringList(seed.SourceUrls);
                var directYoutubeVideoUrl = IsYoutubeUrl(seed.VideoUrl)
                    ? seed.VideoUrl!.Trim()
                    : null;
                recipe.VideoUrl = directYoutubeVideoUrl;
                recipe.EnhancedAt = seed.Instructions.Count >= 3
                    && seed.SourceUrls.Any(IsHttpsUrl)
                        ? now
                        : null;
                recipe.UpdatedAt = now;
                recipe.IsDeleted = false;
                foreach (var key in recipeKeys)
                {
                    recipesByName[key] = recipe;
                }

                if (recipe.RecipeId != 0)
                {
                    context.RecipeIngredients.RemoveRange(recipe.RecipeIngredients.ToList());
                }

                foreach (var ingredient in resolvedIngredients)
                {
                    ingredient.Recipe = recipe;
                    await context.RecipeIngredients.AddAsync(ingredient);
                }
            }

            await context.SaveChangesAsync();
        }

        private static IEnumerable<string> BuildRecipeSeedLookupKeys(VietnameseFoodCatalog.RecipeSeed seed)
        {
            yield return NormalizeCatalogKey(seed.RecipeName);
            foreach (var alias in seed.Aliases)
            {
                var key = NormalizeCatalogKey(alias);
                if (!string.IsNullOrWhiteSpace(key))
                {
                    yield return key;
                }
            }
        }

        private static string SerializeSeedStringList(IReadOnlyCollection<string> values)
        {
            var cleaned = values
                .Select(value => value?.Trim())
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value!)
                .ToList();
            return JsonSerializer.Serialize(cleaned, SeedJsonOptions);
        }

        private static bool IsHttpsUrl(string? value)
        {
            return Uri.TryCreate(value, UriKind.Absolute, out var uri)
                && uri.Scheme == Uri.UriSchemeHttps
                && !string.IsNullOrWhiteSpace(uri.Host);
        }

        private static bool IsYoutubeUrl(string? value)
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
                || uri.Scheme != Uri.UriSchemeHttps)
            {
                return false;
            }

            var host = uri.Host.StartsWith("www.", StringComparison.OrdinalIgnoreCase)
                ? uri.Host[4..]
                : uri.Host;
            var path = uri.AbsolutePath.Trim('/');

            if (host.Equals("youtu.be", StringComparison.OrdinalIgnoreCase))
            {
                return IsPlausibleYoutubeVideoId(path);
            }

            if (!host.Equals("youtube.com", StringComparison.OrdinalIgnoreCase)
                && !host.Equals("m.youtube.com", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (path.Equals("watch", StringComparison.OrdinalIgnoreCase))
            {
                return IsPlausibleYoutubeVideoId(GetQueryParameter(uri, "v"));
            }

            if (path.StartsWith("embed/", StringComparison.OrdinalIgnoreCase)
                || path.StartsWith("shorts/", StringComparison.OrdinalIgnoreCase))
            {
                var videoId = path.Split('/', StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault();
                return IsPlausibleYoutubeVideoId(videoId);
            }

            return false;
        }

        private static string? GetQueryParameter(Uri uri, string name)
        {
            var query = uri.Query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(query))
            {
                return null;
            }

            foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split('=', 2);
                var key = Uri.UnescapeDataString(parts[0].Replace("+", " "));
                if (!key.Equals(name, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return parts.Length == 2
                    ? Uri.UnescapeDataString(parts[1].Replace("+", " "))
                    : string.Empty;
            }

            return null;
        }

        private static bool IsPlausibleYoutubeVideoId(string? videoId)
        {
            return !string.IsNullOrWhiteSpace(videoId)
                && videoId.Length >= 3
                && videoId.All(ch => char.IsLetterOrDigit(ch) || ch is '_' or '-');
        }

        private static RecipeIngredientSeed I(decimal grams, params string[] keys) => new(keys, grams);

        private static readonly JsonSerializerOptions SeedJsonOptions = new()
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        private sealed record RecipeSeed(
            string Name,
            string Description,
            int CookTimeMinutes,
            string Difficulty,
            int ServingCount,
            int CredibilityScore,
            string Slug,
            IReadOnlyList<RecipeIngredientSeed> Ingredients);

        private sealed record RecipeIngredientSeed(IReadOnlyCollection<string> Keys, decimal Grams);

        private static readonly RecipeSeed[] RecipeSeeds =
        [
            new("Cơm gà xào rau củ", "Bữa chính cân bằng với thịt gà, cơm và rau xanh dễ chuẩn bị.", 25, "Dễ", 1, 82, "com-ga-xao-rau-cu", [I(150, "chicken"), I(180, "rice"), I(100, "broccoli"), I(60, "carrot")]),
            new("Cá nướng khoai lang", "Giàu đạm và chất béo tốt, ăn cùng khoai lang để no lâu.", 30, "Trung bình", 1, 86, "ca-nuong-khoai-lang", [I(180, "fish"), I(200, "sweet_potato"), I(80, "spinach")]),
            new("Salad trứng rau xanh", "Bữa sáng hoặc bữa phụ giàu protein, nhẹ bụng.", 15, "Dễ", 1, 80, "salad-trung-rau-xanh", [I(110, "egg"), I(80, "spinach"), I(80, "cucumber"), I(60, "tomato")]),
            new("Trứng xào cà chua", "Bữa sáng nhanh, dùng nguyên liệu phổ biến và nấu được trong vài phút.", 12, "Dễ", 1, 78, "trung-xao-ca-chua", [I(110, "egg"), I(120, "tomato"), I(20, "green_onion")]),
            new("Gà nướng rau xanh", "Bữa tối ít tinh bột, phù hợp ngày cần ưu tiên protein.", 35, "Dễ", 1, 83, "ga-nuong-rau-xanh", [I(200, "chicken"), I(120, "broccoli"), I(100, "spinach")]),
            new("Ức gà áp chảo sốt cà chua", "Món đạm nạc dùng với cà chua và hành tây, vị thanh.", 22, "Dễ", 1, 82, "uc-ga-ap-chao-sot-ca-chua", [I(180, "chicken"), I(120, "tomato"), I(50, "onion"), I(8, "garlic")]),
            new("Bò xào bông cải xanh", "Bữa chính giàu sắt và protein, nấu nhanh trong chảo nóng.", 20, "Dễ", 1, 82, "bo-xao-bong-cai-xanh", [I(160, "beef"), I(160, "broccoli"), I(60, "bell_pepper"), I(8, "garlic")]),
            new("Đậu hũ sốt nấm cà chua", "Lựa chọn nhẹ nhàng, nhiều chất xơ và phù hợp ngày muốn giảm thịt.", 20, "Dễ", 1, 80, "dau-hu-sot-nam-ca-chua", [I(180, "tofu"), I(120, "mushroom"), I(120, "tomato"), I(40, "green_onion")]),
            new("Tôm xào rau củ", "Tôm chín nhanh, hợp với rau củ giòn để giữ vị ngọt tự nhiên.", 18, "Dễ", 1, 82, "tom-xao-rau-cu", [I(170, "shrimp"), I(100, "broccoli"), I(80, "carrot"), I(60, "bell_pepper")]),
            new("Cá kho cà chua", "Phiên bản cá kho nhẹ vị, ăn cùng cơm vừa đủ.", 35, "Trung bình", 2, 84, "ca-kho-ca-chua", [I(220, "fish"), I(140, "tomato"), I(40, "green_onion"), I(6, "chili")]),
            new("Canh bí đỏ tôm", "Canh ấm bụng, vị ngọt tự nhiên từ bí đỏ và tôm.", 25, "Dễ", 2, 82, "canh-bi-do-tom", [I(220, "pumpkin"), I(120, "shrimp"), I(30, "green_onion")]),
            new("Canh khổ qua thịt nạc", "Món canh Việt thanh vị, hợp bữa tối nhẹ.", 35, "Trung bình", 2, 81, "canh-kho-qua-thit-nac", [I(220, "bitter_gourd"), I(140, "pork"), I(20, "green_onion")]),
            new("Thịt heo kho trứng phiên bản nhẹ", "Giữ hương vị quen thuộc nhưng kiểm soát khẩu phần thịt và trứng.", 45, "Trung bình", 2, 78, "thit-heo-kho-trung-nhe", [I(180, "pork"), I(110, "egg"), I(30, "shallot")]),
            new("Cơm tôm trứng rau củ", "Một đĩa cơm nhanh, có đạm từ tôm và trứng.", 20, "Dễ", 1, 80, "com-tom-trung-rau-cu", [I(160, "rice"), I(120, "shrimp"), I(80, "egg"), I(80, "carrot"), I(40, "green_onion")]),
            new("Bún gà rau thơm", "Bữa bún nhẹ, ưu tiên thịt gà và rau ăn kèm.", 25, "Dễ", 1, 80, "bun-ga-rau-thom", [I(160, "noodles", "bun"), I(150, "chicken"), I(80, "cucumber"), I(30, "green_onion")]),
            new("Phở gà nhanh tại nhà", "Tô phở gà gọn nhẹ cho ngày cần món nước quen thuộc.", 35, "Trung bình", 1, 79, "pho-ga-nhanh-tai-nha", [I(170, "noodles", "pho"), I(160, "chicken"), I(10, "ginger"), I(20, "green_onion")]),
            new("Bò kho rau củ", "Bò kho kiểu gia đình, thêm cà rốt và khoai để cân bằng.", 50, "Trung bình", 2, 80, "bo-kho-rau-cu", [I(220, "beef"), I(140, "carrot"), I(120, "potato"), I(12, "lemongrass")]),
            new("Mì Quảng gà rau củ", "Tô mì đậm vị nhưng giữ khẩu phần tinh bột vừa phải.", 40, "Trung bình", 2, 79, "mi-quang-ga-rau-cu", [I(180, "noodles", "mi_quang"), I(180, "chicken"), I(80, "egg"), I(40, "green_onion")]),
            new("Gỏi cuốn tôm đậu hũ", "Món cuốn tươi, dễ ăn và hợp bữa phụ nhiều đạm.", 25, "Dễ", 2, 83, "goi-cuon-tom-dau-hu", [I(120, "shrimp"), I(140, "tofu"), I(60, "cucumber"), I(40, "banh_trang")]),
            new("Bánh mì trứng rau củ", "Bữa sáng nhanh, thêm rau để đỡ ngấy.", 12, "Dễ", 1, 75, "banh-mi-trung-rau-cu", [I(90, "banh_mi"), I(90, "egg"), I(60, "cucumber"), I(50, "tomato")]),
            new("Trứng chiên cà chua", "Món nhanh, mềm và dễ ăn khi nguyên liệu ít.", 12, "Dễ", 1, 76, "trung-chien-ca-chua", [I(120, "egg", "fried_egg"), I(120, "tomato"), I(20, "green_onion")]),
            new("Rau muống xào tỏi đậu hũ", "Bữa rau xanh đơn giản, thêm đậu hũ để có protein.", 15, "Dễ", 1, 78, "rau-muong-xao-toi-dau-hu", [I(180, "water_spinach"), I(140, "tofu"), I(8, "garlic")]),
            new("Cải thìa xào nấm", "Món rau xào nhanh, vị nhẹ và ít năng lượng.", 15, "Dễ", 1, 78, "cai-thia-xao-nam", [I(180, "bokchoy"), I(120, "mushroom"), I(8, "garlic")]),
            new("Canh bầu tôm", "Canh ngọt mát, phù hợp bữa cơm gia đình.", 22, "Dễ", 2, 80, "canh-bau-tom", [I(240, "bottle_gourd"), I(120, "shrimp"), I(20, "green_onion")]),
            new("Cá áp chảo sả gừng", "Cá chín mềm, thơm sả gừng và không cần nhiều dầu.", 25, "Dễ", 1, 82, "ca-ap-chao-sa-gung", [I(220, "fish"), I(12, "lemongrass"), I(8, "ginger"), I(80, "cucumber")]),
            new("Mực xào ớt chuông", "Món hải sản nhanh, giòn và giàu protein.", 18, "Dễ", 1, 81, "muc-xao-ot-chuong", [I(180, "squid"), I(120, "bell_pepper"), I(50, "onion"), I(8, "garlic")]),
            new("Súp cua trứng", "Món súp mềm, dễ ăn và hợp bữa nhẹ.", 30, "Trung bình", 2, 79, "sup-cua-trung", [I(120, "crab"), I(90, "egg"), I(80, "corn"), I(40, "carrot")]),
            new("Khoai lang trứng luộc", "Bữa sáng tối giản, no lâu và dễ chuẩn bị.", 18, "Dễ", 1, 76, "khoai-lang-trung-luoc", [I(220, "sweet_potato"), I(110, "egg")]),
            new("Salad gà dưa leo cà chua", "Đĩa salad gọn nhẹ, phù hợp ngày cần giảm tinh bột.", 18, "Dễ", 1, 81, "salad-ga-dua-leo-ca-chua", [I(160, "chicken"), I(100, "cucumber"), I(100, "tomato"), I(40, "onion")]),
            new("Cơm chiên gạo lứt rau củ", "Phiên bản cơm chiên tiết chế dầu, nhiều rau hơn.", 20, "Dễ", 1, 77, "com-chien-gao-lut-rau-cu", [I(180, "rice", "Brown Rice"), I(80, "egg"), I(80, "carrot"), I(60, "peas"), I(40, "green_onion")]),
            new("Đậu hũ kho nấm", "Món chay mặn nhẹ, ăn cùng cơm vừa khẩu phần.", 25, "Dễ", 2, 80, "dau-hu-kho-nam", [I(220, "tofu"), I(140, "mushroom"), I(30, "shallot")]),
            new("Lẩu rau nấm đậu hũ", "Nồi lẩu nhẹ cho hai người, tập trung rau và đạm thực vật.", 35, "Dễ", 2, 79, "lau-rau-nam-dau-hu", [I(220, "tofu"), I(160, "mushroom"), I(120, "bokchoy"), I(100, "cabbage")]),
        ];
    }
}
