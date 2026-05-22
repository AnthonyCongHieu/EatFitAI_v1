using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Data;

public class DatabaseSeederTests
{
    [Fact]
    public async Task SeedAsync_SeedsEveryYolo11mCleanV1LabelMap()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var foodCount = await context.FoodItems.CountAsync();
        var labels = await context.AiLabelMaps
            .Select(map => map.Label)
            .ToListAsync();

        Assert.True(foodCount > 0, $"Expected seed food items before AI label maps; labelCount={labels.Count}.");
        Assert.Equal(ExpectedYolo11mCleanV1Labels.Length, labels.Count);
        foreach (var expectedLabel in ExpectedYolo11mCleanV1Labels)
        {
            Assert.Contains(expectedLabel, labels);
        }

        Assert.DoesNotContain("apple", labels);
    }

    [Fact]
    public async Task SeedAsync_SeedsStableMobileLookupIds()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var activityLevels = await context.ActivityLevels.ToDictionaryAsync(item => item.ActivityLevelId);
        var mealTypes = await context.MealTypes.ToDictionaryAsync(item => item.MealTypeId);

        Assert.Equal("Sedentary", activityLevels[1].Name);
        Assert.Equal("Moderately Active", activityLevels[3].Name);
        Assert.Equal("Breakfast", mealTypes[1].Name);
        Assert.Equal("Snack", mealTypes[4].Name);
    }

    [Fact]
    public async Task SeedAsync_AddsRecipeCatalogWithoutDuplicatingExistingRows()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            await context.Recipes.AddAsync(new Recipe
            {
                RecipeName = "Recipe cũ của hệ thống",
                Description = "Không thuộc catalog seed",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }

        await DatabaseSeeder.SeedAsync(provider);
        await DatabaseSeeder.SeedAsync(provider);

        using var verifyScope = provider.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var seededRecipes = await verifyContext.Recipes
            .Include(recipe => recipe.RecipeIngredients)
            .ToListAsync();

        Assert.True(seededRecipes.Count >= 31);
        Assert.Single(seededRecipes, recipe => recipe.RecipeName == "Recipe cũ của hệ thống");
        Assert.Single(seededRecipes, recipe => recipe.RecipeName == "Cơm gà xào rau củ");

        var canhBiDo = Assert.Single(seededRecipes, recipe => recipe.RecipeName == "Canh bí đỏ tôm");
        Assert.StartsWith("recipe-images/v1/thumb/", canhBiDo.ImageUrl);
        Assert.Equal(25, canhBiDo.CookTimeMinutes);
        Assert.True(canhBiDo.RecipeIngredients.Count >= 2);
    }

    [Fact]
    public async Task SeedAsync_AddsNutritionProxyForUndercoveredRecipeCalories()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var banhKhot = await context.Recipes
            .Include(recipe => recipe.RecipeIngredients)
            .ThenInclude(ingredient => ingredient.FoodItem)
            .SingleAsync(recipe => recipe.RecipeName == "Bánh khọt");

        var totalCalories = banhKhot.RecipeIngredients
            .Where(ingredient => ingredient.FoodItem != null && ingredient.FoodItem.IsActive && !ingredient.FoodItem.IsDeleted)
            .Sum(ingredient => ingredient.Grams * ingredient.FoodItem.CaloriesPer100g / 100m);

        Assert.Contains(
            banhKhot.RecipeIngredients,
            ingredient => ingredient.FoodItem.FoodName == "Bánh khọt" && ingredient.Grams > 100m);
        Assert.InRange(totalCalories, 505m, 507m);
        Assert.DoesNotContain("ớt, hành lá", banhKhot.Description ?? string.Empty, StringComparison.OrdinalIgnoreCase);

        var guardedRecipes = await context.Recipes
            .Include(recipe => recipe.RecipeIngredients)
            .ThenInclude(ingredient => ingredient.FoodItem)
            .Where(recipe => recipe.RecipeName == "Gỏi cuốn" || recipe.RecipeName == "Canh bí đỏ")
            .ToListAsync();

        Assert.Equal(2, guardedRecipes.Count);
        foreach (var recipe in guardedRecipes)
        {
            var calories = recipe.RecipeIngredients
                .Where(ingredient => ingredient.FoodItem != null && ingredient.FoodItem.IsActive && !ingredient.FoodItem.IsDeleted)
                .Sum(ingredient => ingredient.Grams * ingredient.FoodItem.CaloriesPer100g / 100m);

            Assert.True(calories >= 150m, $"{recipe.RecipeName} should not remain below 150 kcal after nutrition proxy seeding; actual={calories}.");
            Assert.DoesNotContain("nguyên liệu chính", recipe.Description ?? string.Empty, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task SeedAsync_RepairsPartialStableLookupRows()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            await context.ActivityLevels.AddAsync(new ActivityLevel
            {
                ActivityLevelId = 3,
                Name = "Legacy Moderate",
                ActivityFactor = 1.0m,
            });
            await context.MealTypes.AddAsync(new MealType
            {
                MealTypeId = 2,
                Name = "Midday",
            });
            await context.SaveChangesAsync();
        }

        await DatabaseSeeder.SeedAsync(provider);

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var activityLevel = await context.ActivityLevels.SingleAsync(item => item.ActivityLevelId == 3);
            var mealType = await context.MealTypes.SingleAsync(item => item.MealTypeId == 2);

            Assert.Equal("Moderately Active", activityLevel.Name);
            Assert.Equal(1.55m, activityLevel.ActivityFactor);
            Assert.Equal("Lunch", mealType.Name);
        }
    }

    [Fact]
    public async Task SeedAsync_MapsBroadLabelsToBroadFoodItems()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var maps = await context.AiLabelMaps
            .Where(map => BroadLabelExpectations.Keys.Contains(map.Label))
            .ToListAsync();
        var foodIds = maps
            .Where(map => map.FoodItemId.HasValue)
            .Select(map => map.FoodItemId!.Value)
            .Distinct()
            .ToList();
        var foods = await context.FoodItems
            .Where(food => foodIds.Contains(food.FoodItemId))
            .ToDictionaryAsync(food => food.FoodItemId);

        foreach (var (label, expectedFoodName) in BroadLabelExpectations)
        {
            var map = Assert.Single(maps, item => item.Label == label);
            Assert.True(map.FoodItemId.HasValue, $"Expected '{label}' to map to a broad FoodItem.");
            Assert.Equal(expectedFoodName, foods[map.FoodItemId!.Value].FoodName);
            Assert.True(map.MinConfidence >= 0.75m, $"Expected '{label}' to require high confidence for broad auto-mapping.");
        }
    }

    [Fact]
    public async Task SeedAsync_DoesNotCreateLegacyEnglishFoodDuplicates()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);
        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var activeNames = await context.FoodItems
            .Where(food => food.IsActive && !food.IsDeleted)
            .Select(food => food.FoodName)
            .ToListAsync();

        foreach (var legacyName in LegacyEnglishFoodNames)
        {
            Assert.DoesNotContain(legacyName, activeNames);
        }

        Assert.Contains("Ức gà (luộc)", activeNames);
        Assert.Contains("Cơm gạo lứt (chín)", activeNames);
        Assert.Contains("Sữa chua Hy Lạp không béo", activeNames);
    }

    [Fact]
    public async Task SeedAsync_DoesNotReviveDeactivatedCatalogFood()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            await context.FoodItems.AddAsync(new FoodItem
            {
                FoodItemId = 999,
                FoodName = "Bông cải xanh",
                FoodNameUnsigned = "bong cai xanh",
                CaloriesPer100g = 34m,
                ProteinPer100g = 2.8m,
                CarbPer100g = 7m,
                FatPer100g = 0.4m,
                IsActive = false,
                IsDeleted = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }

        await DatabaseSeeder.SeedAsync(provider);

        using var verifyScope = provider.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
        var oldRow = await verifyContext.FoodItems.SingleAsync(food => food.FoodItemId == 999);
        var activeBroccoli = await verifyContext.FoodItems
            .Where(food => food.FoodName == "Bông cải xanh" && food.IsActive && !food.IsDeleted)
            .ToListAsync();

        Assert.False(oldRow.IsActive);
        Assert.True(oldRow.IsDeleted);
        Assert.Single(activeBroccoli);
        Assert.DoesNotContain(activeBroccoli, food => food.FoodItemId == 999);
    }

    [Fact]
    public async Task SeedAsync_RaisesLegacyLowConfidenceLabelMaps()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var chicken = await context.AiLabelMaps.SingleAsync(map => map.Label == "chicken");
            chicken.MinConfidence = 0.05m;
            await context.SaveChangesAsync();
        }

        await DatabaseSeeder.SeedAsync(provider);

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var chicken = await context.AiLabelMaps.SingleAsync(map => map.Label == "chicken");
            Assert.True(chicken.MinConfidence >= 0.60m);
        }
    }

    [Fact]
    public async Task SeedAsync_RepairsLegacyWrongFoodItemMaps()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var wrongFood = await context.FoodItems.SingleAsync(food => food.FoodName == "Rau muống");
            var spinach = await context.AiLabelMaps.SingleAsync(map => map.Label == "spinach");
            spinach.FoodItemId = wrongFood.FoodItemId;
            await context.SaveChangesAsync();
        }

        await DatabaseSeeder.SeedAsync(provider);

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            var spinach = await context.AiLabelMaps.SingleAsync(map => map.Label == "spinach");
            var food = await context.FoodItems.SingleAsync(item => item.FoodItemId == spinach.FoodItemId);
            Assert.Equal("Rau chân vịt", food.FoodName);
        }
    }

    [Fact]
    public void AiVisionLabelCatalog_CoversEveryModelLabelWithVietnameseDisplayName()
    {
        Assert.Equal(ExpectedYolo11mCleanV1Labels.Length, AiVisionLabelCatalog.Entries.Count);
        Assert.All(AiVisionLabelCatalog.Entries, entry =>
        {
            Assert.False(string.IsNullOrWhiteSpace(entry.Label));
            Assert.False(string.IsNullOrWhiteSpace(entry.DisplayNameVi));
            Assert.DoesNotContain("Ã", entry.DisplayNameVi);
        });

        var labels = AiVisionLabelCatalog.Entries.Select(entry => entry.Label).ToList();
        foreach (var expectedLabel in ExpectedYolo11mCleanV1Labels)
        {
            Assert.Contains(expectedLabel, labels);
        }

        Assert.DoesNotContain("apple", labels);
    }

    [Fact]
    public void AiVisionSeedData_CoversEveryModelLabel()
    {
        var seeds = AiVisionLabelCatalog.LoadFoodSeeds(Directory.GetCurrentDirectory());
        Assert.Equal(ExpectedYolo11mCleanV1Labels.Length, seeds.Count);

        var labels = seeds.Select(seed => seed.Label).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var expectedLabel in ExpectedYolo11mCleanV1Labels)
        {
            Assert.Contains(expectedLabel, labels);
        }
    }

    [Fact]
    public void VietnameseFoodCatalog_CoversDishListAndDedicatedRecipeImages()
    {
        var seeds = VietnameseFoodCatalog.LoadFoodSeeds(Directory.GetCurrentDirectory());
        var uniqueSlugs = seeds.Select(seed => seed.Slug).ToHashSet(StringComparer.Ordinal);

        Assert.Equal(141, seeds.Count);
        Assert.Equal(141, uniqueSlugs.Count);
        Assert.Equal(107, seeds.Count(seed => !string.IsNullOrWhiteSpace(seed.ImageKey)));

        var canhCaiThia = Assert.Single(seeds, seed => seed.Slug == "canh-cai-thia");
        Assert.Equal("Canh cải thìa", canhCaiThia.FoodName);
        Assert.Contains("Canh cải thảo thịt bằm", canhCaiThia.Aliases);

        Assert.Contains(seeds, seed => seed.FoodName == "Súp cua" && seed.Aliases.Contains("Cua soup"));
        Assert.All(
            seeds.Where(seed => !string.IsNullOrWhiteSpace(seed.ImageKey)),
            seed => Assert.StartsWith("recipe-images/v1/thumb/", seed.ImageKey));
    }

    [Fact]
    public void VietnameseFoodCatalog_UsesDriveRecipeNamesForAmbiguousImages()
    {
        var foodSeeds = VietnameseFoodCatalog.LoadFoodSeeds(Directory.GetCurrentDirectory());
        var recipeSeeds = VietnameseFoodCatalog.LoadRecipeSeeds(Directory.GetCurrentDirectory());

        Assert.DoesNotContain(foodSeeds, seed => seed.Slug == "canh-cai-thao-thit-bam");
        Assert.DoesNotContain(foodSeeds, seed => seed.Slug == "bap-nuong-hanh-mo");
        Assert.DoesNotContain(foodSeeds, seed => seed.Slug == "canh-nam-rau-cu");
        Assert.DoesNotContain(recipeSeeds, seed => seed.Slug == "canh-cai-thao-thit-bam");
        Assert.DoesNotContain(recipeSeeds, seed => seed.Slug == "bap-nuong-hanh-mo");
        Assert.DoesNotContain(recipeSeeds, seed => seed.Slug == "canh-nam-rau-cu");

        var canhCaiThia = Assert.Single(foodSeeds, seed => seed.Slug == "canh-cai-thia");
        Assert.Equal("Canh cải thìa", canhCaiThia.FoodName);
        Assert.Equal("recipe-images/v1/thumb/canh-cai-thia.webp", canhCaiThia.ImageKey);

        var bapXaoMoHanh = Assert.Single(foodSeeds, seed => seed.Slug == "bap-xao-mo-hanh");
        Assert.Equal("Bắp xào mỡ hành", bapXaoMoHanh.FoodName);
        Assert.Equal("recipe-images/v1/thumb/bap-xao-mo-hanh.webp", bapXaoMoHanh.ImageKey);

        var canhRauCu = Assert.Single(foodSeeds, seed => seed.Slug == "canh-rau-cu");
        Assert.Equal("Canh rau củ", canhRauCu.FoodName);
        Assert.Equal("recipe-images/v1/thumb/canh-rau-cu.webp", canhRauCu.ImageKey);

        Assert.Single(recipeSeeds, seed =>
            seed.Slug == "canh-cai-thia"
            && seed.RecipeName == "Canh cải thìa"
            && seed.ImageKey == "recipe-images/v1/thumb/canh-cai-thia.webp");
        Assert.Single(recipeSeeds, seed =>
            seed.Slug == "bap-xao-mo-hanh"
            && seed.RecipeName == "Bắp xào mỡ hành"
            && seed.ImageKey == "recipe-images/v1/thumb/bap-xao-mo-hanh.webp");
        Assert.Single(recipeSeeds, seed =>
            seed.Slug == "canh-rau-cu"
            && seed.RecipeName == "Canh rau củ"
            && seed.ImageKey == "recipe-images/v1/thumb/canh-rau-cu.webp");
    }

    [Fact]
    public void CatalogImageKeyResolver_UsesRecipeImagesAndExactFoodLabelsOnlyForRecipes()
    {
        Assert.Equal(
            "recipe-images/v1/thumb/com-thit-kho-trung.webp",
            CatalogImageKeyResolver.ResolveRecipeThumbnailKey(
                "Cơm thịt kho trứng",
                "recipe-images/v1/thumb/com-thit-kho-trung.webp",
                new[] { "food-images/v2/thumb/rice.webp" }));

        Assert.Equal(
            "food-images/v2/thumb/steamed_pork_belly_taro.webp",
            CatalogImageKeyResolver.ResolveRecipeThumbnailKey(
                "Thịt ba chỉ hấp khoai môn",
                null,
                new[] { "food-images/v2/thumb/pork_belly.webp" }));

        Assert.Null(CatalogImageKeyResolver.ResolveRecipeThumbnailKey(
            "Gà nướng rau xanh",
            null,
            new[] { "food-images/v2/thumb/chicken.webp" }));
        Assert.Null(CatalogImageKeyResolver.ResolveRecipeThumbnailKey(
            "Sườn kho chua ngọt",
            null,
            new[] { "food-images/v2/thumb/pork_rib.webp" }));
    }

    [Fact]
    public void VietnameseRecipeCatalog_ResolvesUniqueNonIngredientImageKeys()
    {
        var seeds = VietnameseFoodCatalog.LoadRecipeSeeds(Directory.GetCurrentDirectory());
        var resolvedImages = seeds
            .Select(seed => new
            {
                seed.RecipeName,
                ImageKey = CatalogImageKeyResolver.ResolveRecipeThumbnailKey(seed.RecipeName, seed.ImageKey)
            })
            .ToList();

        Assert.All(
            resolvedImages,
            item => Assert.False(
                string.IsNullOrWhiteSpace(item.ImageKey),
                $"Expected recipe image for {item.RecipeName}."));

        var duplicateImages = resolvedImages
            .GroupBy(item => item.ImageKey, StringComparer.Ordinal)
            .Where(group => group.Count() > 1)
            .Select(group => $"{group.Key}: {string.Join(", ", group.Select(item => item.RecipeName))}")
            .ToList();
        Assert.Empty(duplicateImages);

        var ingredientImageLabels = new[]
        {
            "rice",
            "chicken",
            "fish",
            "pork_rib",
            "pork_belly"
        };
        Assert.DoesNotContain(
            resolvedImages,
            item => ingredientImageLabels.Any(label =>
                string.Equals(item.ImageKey, $"food-images/v2/thumb/{label}.webp", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task SeedAsync_AddsVietnameseFoodAndRecipeCatalogIncrementally()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();

        await DatabaseSeeder.SeedAsync(provider);
        await DatabaseSeeder.SeedAsync(provider);

        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

        var comTamSuon = await context.FoodItems.SingleAsync(food => food.FoodName == "Cơm tấm sườn");
        Assert.Equal("recipe-images/v1/thumb/com-tam-suon.webp", comTamSuon.ThumbNail);

        var canhCaiThia = await context.FoodItems.SingleAsync(food => food.FoodName == "Canh cải thìa");
        Assert.Contains("canh cai thao thit bam", canhCaiThia.FoodNameUnsigned);
        Assert.Single(await context.FoodItems.Where(food => food.FoodName == "Súp cua").ToListAsync());

        var recipe = await context.Recipes
            .Include(item => item.RecipeIngredients)
            .SingleAsync(item => item.RecipeName == "Cơm tấm sườn");

        Assert.Equal("recipe-images/v1/thumb/com-tam-suon.webp", recipe.ImageUrl);
        Assert.NotNull(recipe.EnhancedAt);
        Assert.Contains("monngonmoingay.com", recipe.SourceUrlsJson);
        Assert.Equal("https://www.youtube.com/watch?v=F5D4X3R9H9m", recipe.VideoUrl);
        Assert.True(recipe.RecipeIngredients.Count >= 2);
    }

    [Fact]
    public async Task SeedAsync_UpgradesRenamedRecipeImageRowsWithoutDuplicatingThem()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var databaseName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<EatFitAIDbContext>(options =>
            options.UseInMemoryDatabase(databaseName, databaseRoot));
        services.AddSingleton<IHostEnvironment>(new FakeHostEnvironment());

        await using var provider = services.BuildServiceProvider();
        var now = DateTime.UtcNow;

        using (var scope = provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
            await context.FoodItems.AddRangeAsync(
                new FoodItem
                {
                    FoodName = "Canh cải thảo thịt bằm",
                    FoodNameUnsigned = "canh cai thao thit bam",
                    ThumbNail = "recipe-images/v1/thumb/canh-cai-thao-thit-bam.webp",
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new FoodItem
                {
                    FoodName = "Bắp nướng hành mỡ",
                    FoodNameUnsigned = "bap nuong hanh mo",
                    ThumbNail = "recipe-images/v1/thumb/bap-nuong-hanh-mo.webp",
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new FoodItem
                {
                    FoodName = "Canh nấm rau củ",
                    FoodNameUnsigned = "canh nam rau cu",
                    ThumbNail = "recipe-images/v1/thumb/canh-nam-rau-cu.webp",
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            await context.Recipes.AddRangeAsync(
                new Recipe
                {
                    RecipeName = "Canh cải thảo thịt bằm",
                    ImageUrl = "recipe-images/v1/thumb/canh-cai-thao-thit-bam.webp",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Recipe
                {
                    RecipeName = "Bắp nướng hành mỡ",
                    ImageUrl = "recipe-images/v1/thumb/bap-nuong-hanh-mo.webp",
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Recipe
                {
                    RecipeName = "Canh nấm rau củ",
                    ImageUrl = "recipe-images/v1/thumb/canh-nam-rau-cu.webp",
                    CreatedAt = now,
                    UpdatedAt = now
                });
            await context.SaveChangesAsync();
        }

        await DatabaseSeeder.SeedAsync(provider);

        using var verifyScope = provider.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

        var renamedFoods = await verifyContext.FoodItems
            .Where(food =>
                food.FoodName == "Canh cải thìa" ||
                food.FoodName == "Bắp xào mỡ hành" ||
                food.FoodName == "Canh rau củ" ||
                food.FoodName == "Canh cải thảo thịt bằm" ||
                food.FoodName == "Bắp nướng hành mỡ" ||
                food.FoodName == "Canh nấm rau củ")
            .ToListAsync();
        Assert.Equal(3, renamedFoods.Count);
        Assert.Single(renamedFoods, food => food.FoodName == "Canh cải thìa" && food.ThumbNail == "recipe-images/v1/thumb/canh-cai-thia.webp");
        Assert.Single(renamedFoods, food => food.FoodName == "Bắp xào mỡ hành" && food.ThumbNail == "recipe-images/v1/thumb/bap-xao-mo-hanh.webp");
        Assert.Single(renamedFoods, food => food.FoodName == "Canh rau củ" && food.ThumbNail == "recipe-images/v1/thumb/canh-rau-cu.webp");

        var renamedRecipes = await verifyContext.Recipes
            .Where(recipe =>
                recipe.RecipeName == "Canh cải thìa" ||
                recipe.RecipeName == "Bắp xào mỡ hành" ||
                recipe.RecipeName == "Canh rau củ" ||
                recipe.RecipeName == "Canh cải thảo thịt bằm" ||
                recipe.RecipeName == "Bắp nướng hành mỡ" ||
                recipe.RecipeName == "Canh nấm rau củ")
            .ToListAsync();
        Assert.Equal(3, renamedRecipes.Count);
        Assert.Single(renamedRecipes, recipe => recipe.RecipeName == "Canh cải thìa" && recipe.ImageUrl == "recipe-images/v1/thumb/canh-cai-thia.webp");
        Assert.Single(renamedRecipes, recipe => recipe.RecipeName == "Bắp xào mỡ hành" && recipe.ImageUrl == "recipe-images/v1/thumb/bap-xao-mo-hanh.webp");
        Assert.Single(renamedRecipes, recipe => recipe.RecipeName == "Canh rau củ" && recipe.ImageUrl == "recipe-images/v1/thumb/canh-rau-cu.webp");
    }

    [Fact]
    public void RecipeIngredientEligibility_UsesVietnameseCatalogKinds()
    {
        Assert.True(RecipeIngredientEligibility.IsFinishedDishKey("Cơm tấm sườn"));
        Assert.False(RecipeIngredientEligibility.IsIngredientKey("Cơm tấm sườn"));

        Assert.True(RecipeIngredientEligibility.IsFinishedDishKey("Canh cải thìa"));
        Assert.True(RecipeIngredientEligibility.IsIngredientKey("Thịt bò"));
    }

    private static readonly string[] ExpectedYolo11mCleanV1Labels =
    [
        "banh_mi",
        "pho",
        "bun",
        "bot_chien",
        "goi_cuon",
        "fried_rice",
        "com_tam",
        "thit_kho",
        "ca_kho",
        "canh",
        "banh_beo",
        "banh_bo",
        "banh_bot_loc",
        "banh_can",
        "banh_canh",
        "banh_chung",
        "banh_cong",
        "banh_cuon",
        "banh_da_lon",
        "banh_duc",
        "banh_khot",
        "banh_tet",
        "banh_xeo",
        "banh_trang",
        "banh_trang_tron",
        "bo_kho",
        "bo_la_lot",
        "bun_bo_hue",
        "bun_cha",
        "bun_dau",
        "bun_mam",
        "bun_rieu",
        "cha_gio",
        "hu_tieu",
        "lau",
        "mi_quang",
        "cao_lau",
        "xoi",
        "chao_long",
        "sup_cua",
        "bitter_melon_soup",
        "caramelized_fish_clay_pot",
        "chicken_rice",
        "pumpkin_soup",
        "purple_yam_soup",
        "steamed_pork_belly_taro",
        "sizzling_beef_steak",
        "hollow_fried_sesame_donut",
        "nuoc_cham",
        "rice",
        "noodles",
        "chicken",
        "beef",
        "pork",
        "pork_belly",
        "pork_rib",
        "grilled_pork_belly",
        "fish",
        "shrimp",
        "crab",
        "squid",
        "egg",
        "fried_egg",
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
        "lime",
    ];

    private static readonly Dictionary<string, string> BroadLabelExpectations = new()
    {
        ["beans"] = "Đậu",
        ["beef"] = "Thịt bò",
        ["bun"] = "Bún",
        ["canh"] = "Canh",
        ["chicken"] = "Thịt gà",
        ["fish"] = "Cá",
        ["lau"] = "Lẩu",
        ["mushroom"] = "Nấm",
        ["noodles"] = "Mì/bún/phở",
        ["nuoc_cham"] = "Nước chấm",
        ["pork"] = "Thịt heo",
    };

    private static readonly string[] LegacyEnglishFoodNames =
    [
        "Chicken Breast",
        "Brown Rice",
        "Broccoli",
        "Banana",
        "Greek Yogurt",
        "Almonds",
        "Salmon",
        "Sweet Potato",
        "Spinach",
        "Egg",
    ];

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "EatFitAI.API.Tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
