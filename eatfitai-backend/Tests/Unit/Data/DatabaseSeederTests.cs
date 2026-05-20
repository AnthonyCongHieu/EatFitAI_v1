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
        Assert.Equal("food-images/v2/thumb/pumpkin_soup.webp", canhBiDo.ImageUrl);
        Assert.Equal(25, canhBiDo.CookTimeMinutes);
        Assert.True(canhBiDo.RecipeIngredients.Count >= 2);
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
            Assert.True(map.MinConfidence >= 0.60m, $"Expected '{label}' to avoid low-confidence broad auto-mapping.");
        }
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
    public void VietnameseFoodCatalog_CoversDishListAndResolvableR2Images()
    {
        var seeds = VietnameseFoodCatalog.LoadFoodSeeds(Directory.GetCurrentDirectory());
        var uniqueSlugs = seeds.Select(seed => seed.Slug).ToHashSet(StringComparer.Ordinal);

        Assert.Equal(141, seeds.Count);
        Assert.Equal(141, uniqueSlugs.Count);
        Assert.Equal(107, seeds.Count(seed => !string.IsNullOrWhiteSpace(seed.ImageKey)));

        var canhCaiThao = Assert.Single(seeds, seed => seed.Slug == "canh-cai-thao-thit-bam");
        Assert.Equal("Canh cải thảo thịt bằm", canhCaiThao.FoodName);
        Assert.Contains("Canh cải thừa thịt bằm", canhCaiThao.Aliases);

        Assert.Contains(seeds, seed => seed.FoodName == "Súp cua" && seed.Aliases.Contains("Cua soup"));
        Assert.All(
            seeds,
            seed => Assert.StartsWith(
                "food-images/v2/thumb/",
                CatalogImageKeyResolver.ResolveCatalogThumbnailKey(
                    seed.FoodName,
                    seed.ImageKey,
                    aliases: seed.Aliases)));

        var recipeSeeds = VietnameseFoodCatalog.LoadRecipeSeeds(Directory.GetCurrentDirectory());
        Assert.All(
            recipeSeeds,
            seed => Assert.StartsWith(
                "food-images/v2/thumb/",
                CatalogImageKeyResolver.ResolveCatalogThumbnailKey(seed.RecipeName, seed.ImageKey)));
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
        Assert.Equal("food-images/v2/thumb/com_tam.webp", comTamSuon.ThumbNail);

        var canhCaiThao = await context.FoodItems.SingleAsync(food => food.FoodName == "Canh cải thảo thịt bằm");
        Assert.Contains("canh cai thua thit bam", canhCaiThao.FoodNameUnsigned);
        Assert.Single(await context.FoodItems.Where(food => food.FoodName == "Súp cua").ToListAsync());

        var recipe = await context.Recipes
            .Include(item => item.RecipeIngredients)
            .SingleAsync(item => item.RecipeName == "Cơm tấm sườn");

        Assert.Equal("food-images/v2/thumb/com_tam.webp", recipe.ImageUrl);
        Assert.Null(recipe.EnhancedAt);
        Assert.Contains("monngonmoingay.com", recipe.SourceUrlsJson);
        Assert.Null(recipe.VideoUrl);
        Assert.True(recipe.RecipeIngredients.Count >= 2);
    }

    [Fact]
    public void RecipeIngredientEligibility_UsesVietnameseCatalogKinds()
    {
        Assert.True(RecipeIngredientEligibility.IsFinishedDishKey("Cơm tấm sườn"));
        Assert.False(RecipeIngredientEligibility.IsIngredientKey("Cơm tấm sườn"));

        Assert.True(RecipeIngredientEligibility.IsFinishedDishKey("Canh cải thừa thịt bằm"));
        Assert.True(RecipeIngredientEligibility.IsIngredientKey("Thịt bò"));
    }

    [Fact]
    public void CatalogImageKeyResolver_IgnoresLegacyRecipeImageFallbackKeys()
    {
        var resolved = CatalogImageKeyResolver.ResolveCatalogThumbnailKey(
            "Món thử nghiệm chưa có trong catalog",
            "recipe-images/v1/thumb/missing.webp",
            new[]
            {
                "recipe-images/v1/thumb/also-missing.webp",
                "food-images/v2/thumb/chicken.webp"
            });

        Assert.Equal("food-images/v2/thumb/chicken.webp", resolved);
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
        ["canh"] = "Canh",
        ["chicken"] = "Thịt gà",
        ["fish"] = "Cá",
        ["noodles"] = "Mì/bún/phở",
        ["pork"] = "Thịt heo",
    };

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "EatFitAI.API.Tests";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
