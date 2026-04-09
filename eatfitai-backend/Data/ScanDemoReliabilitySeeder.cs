using System.Security.Cryptography;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.EntityFrameworkCore;
using AppModel = EatFitAI.API.Models;
using Db = EatFitAI.API.DbScaffold.Models;

namespace EatFitAI.API.Data;

public sealed class ScanDemoSeedOptions
{
    public string Email { get; init; } = "scan-demo@redacted.local";
    public string Password { get; init; } = "SET_IN_SEED_SCRIPT";
    public string DisplayName { get; init; } = "Scan Demo Reliability";
}

public sealed class ScanDemoSeedResult
{
    public string Email { get; init; } = string.Empty;
    public Guid UserId { get; init; }
    public int MealDiaryCount { get; init; }
    public int BodyMetricCount { get; init; }
    public int NutritionTargetCount { get; init; }
    public int FavoriteFoodCount { get; init; }
    public int RecentFoodCount { get; init; }
}

public static class ScanDemoReliabilitySeeder
{
    private const int PasswordHashIterations = 100_000;
    private const int PasswordSaltSize = 16;
    private const int PasswordKeySize = 32;

    private static readonly DateOnly DemoDateOfBirth = new(1996, 4, 9);

    private sealed record MealSeed(
        int DayOffset,
        string MealTypeName,
        string FoodName,
        decimal Grams,
        string SourceMethod,
        string Note,
        string ServingUnitName = "gram",
        decimal? PortionQuantity = null);

    private static readonly MealSeed[] DemoMeals =
    {
        new(0, "Breakfast", "Egg", 100m, "manual", "Seeded breakfast eggs", "piece", 2m),
        new(0, "Breakfast", "Greek Yogurt", 180m, "manual", "Seeded breakfast yogurt"),
        new(0, "Breakfast", "Banana", 118m, "manual", "Seeded breakfast banana", "piece", 1m),
        new(0, "Lunch", "Chicken Breast", 160m, "vision", "Seeded scan demo lunch protein"),
        new(0, "Lunch", "Brown Rice", 185m, "vision", "Seeded scan demo lunch carbs"),
        new(0, "Lunch", "Broccoli", 120m, "vision", "Seeded scan demo lunch greens"),
        new(0, "Dinner", "Salmon", 170m, "manual", "Seeded dinner salmon"),
        new(0, "Dinner", "Sweet Potato", 180m, "manual", "Seeded dinner sweet potato"),
        new(0, "Dinner", "Spinach", 90m, "manual", "Seeded dinner spinach"),
        new(0, "Snack", "Almonds", 25m, "voice", "Seeded voice snack almonds"),

        new(1, "Breakfast", "Egg", 100m, "manual", "Seeded breakfast eggs", "piece", 2m),
        new(1, "Breakfast", "Banana", 118m, "manual", "Seeded breakfast banana", "piece", 1m),
        new(1, "Lunch", "Chicken Breast", 150m, "manual", "Seeded lunch chicken"),
        new(1, "Lunch", "Brown Rice", 170m, "manual", "Seeded lunch rice"),
        new(1, "Lunch", "Broccoli", 100m, "manual", "Seeded lunch broccoli"),
        new(1, "Dinner", "Salmon", 160m, "manual", "Seeded dinner salmon"),
        new(1, "Dinner", "Sweet Potato", 170m, "manual", "Seeded dinner sweet potato"),
        new(1, "Snack", "Greek Yogurt", 150m, "manual", "Seeded snack yogurt"),

        new(2, "Breakfast", "Greek Yogurt", 200m, "manual", "Seeded breakfast yogurt"),
        new(2, "Breakfast", "Banana", 118m, "manual", "Seeded breakfast banana", "piece", 1m),
        new(2, "Lunch", "Chicken Breast", 155m, "vision", "Seeded scan demo lunch protein"),
        new(2, "Lunch", "Brown Rice", 185m, "vision", "Seeded scan demo lunch carbs"),
        new(2, "Lunch", "Broccoli", 110m, "vision", "Seeded scan demo lunch greens"),
        new(2, "Dinner", "Egg", 100m, "manual", "Seeded dinner eggs", "piece", 2m),
        new(2, "Dinner", "Spinach", 100m, "manual", "Seeded dinner spinach"),
        new(2, "Snack", "Almonds", 20m, "voice", "Seeded voice snack almonds"),

        new(3, "Breakfast", "Egg", 50m, "manual", "Seeded breakfast egg", "piece", 1m),
        new(3, "Breakfast", "Greek Yogurt", 180m, "manual", "Seeded breakfast yogurt"),
        new(3, "Lunch", "Salmon", 160m, "manual", "Seeded lunch salmon"),
        new(3, "Lunch", "Sweet Potato", 180m, "manual", "Seeded lunch sweet potato"),
        new(3, "Lunch", "Spinach", 90m, "manual", "Seeded lunch spinach"),
        new(3, "Dinner", "Chicken Breast", 150m, "manual", "Seeded dinner chicken"),
        new(3, "Dinner", "Brown Rice", 160m, "manual", "Seeded dinner rice"),
        new(3, "Snack", "Banana", 118m, "voice", "Seeded voice snack banana", "piece", 1m),

        new(4, "Breakfast", "Egg", 100m, "manual", "Seeded breakfast eggs", "piece", 2m),
        new(4, "Breakfast", "Banana", 118m, "manual", "Seeded breakfast banana", "piece", 1m),
        new(4, "Lunch", "Chicken Breast", 150m, "vision", "Seeded scan demo lunch protein"),
        new(4, "Lunch", "Brown Rice", 185m, "vision", "Seeded scan demo lunch carbs"),
        new(4, "Lunch", "Broccoli", 120m, "vision", "Seeded scan demo lunch greens"),
        new(4, "Dinner", "Salmon", 165m, "manual", "Seeded dinner salmon"),
        new(4, "Dinner", "Spinach", 100m, "manual", "Seeded dinner spinach"),
        new(4, "Snack", "Greek Yogurt", 150m, "voice", "Seeded voice snack yogurt"),

        new(5, "Breakfast", "Greek Yogurt", 190m, "manual", "Seeded breakfast yogurt"),
        new(5, "Breakfast", "Banana", 118m, "manual", "Seeded breakfast banana", "piece", 1m),
        new(5, "Lunch", "Chicken Breast", 145m, "manual", "Seeded lunch chicken"),
        new(5, "Lunch", "Brown Rice", 175m, "manual", "Seeded lunch rice"),
        new(5, "Lunch", "Broccoli", 95m, "manual", "Seeded lunch broccoli"),
        new(5, "Dinner", "Egg", 100m, "manual", "Seeded dinner eggs", "piece", 2m),
        new(5, "Dinner", "Spinach", 100m, "manual", "Seeded dinner spinach"),
        new(5, "Snack", "Almonds", 20m, "voice", "Seeded voice snack almonds"),

        new(6, "Breakfast", "Egg", 100m, "manual", "Seeded breakfast eggs", "piece", 2m),
        new(6, "Breakfast", "Greek Yogurt", 180m, "manual", "Seeded breakfast yogurt"),
        new(6, "Lunch", "Salmon", 150m, "manual", "Seeded lunch salmon"),
        new(6, "Lunch", "Sweet Potato", 170m, "manual", "Seeded lunch sweet potato"),
        new(6, "Lunch", "Spinach", 90m, "manual", "Seeded lunch spinach"),
        new(6, "Dinner", "Chicken Breast", 150m, "manual", "Seeded dinner chicken"),
        new(6, "Dinner", "Brown Rice", 165m, "manual", "Seeded dinner rice"),
        new(6, "Snack", "Banana", 118m, "voice", "Seeded voice snack banana", "piece", 1m),
    };

    public static async Task<ScanDemoSeedResult> SeedAsync(
        IServiceProvider serviceProvider,
        ScanDemoSeedOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= new ScanDemoSeedOptions();

        var db = serviceProvider.GetRequiredService<EatFitAIDbContext>();
        var appDb = serviceProvider.GetRequiredService<ApplicationDbContext>();
        var logger = serviceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger("ScanDemoReliabilitySeeder");

        var today = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        var moderateActivity = await db.ActivityLevels
            .FirstOrDefaultAsync(level => level.Name == "Moderately Active", cancellationToken)
            ?? throw new InvalidOperationException("Missing ActivityLevel 'Moderately Active'.");

        var user = await db.Users.FirstOrDefaultAsync(
            item => item.Email == options.Email,
            cancellationToken);

        var isNewUser = user == null;
        if (user == null)
        {
            user = new Db.User
            {
                UserId = Guid.NewGuid(),
                Email = options.Email,
                CreatedAt = DateTime.UtcNow,
            };
            await db.Users.AddAsync(user, cancellationToken);
        }

        user.PasswordHash = HashPassword(options.Password);
        user.DisplayName = options.DisplayName;
        user.EmailVerified = true;
        user.VerificationCode = null;
        user.VerificationCodeExpiry = null;
        user.OnboardingCompleted = true;
        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        user.Gender = "male";
        user.DateOfBirth = DemoDateOfBirth;
        user.ActivityLevelId = moderateActivity.ActivityLevelId;
        user.Goal = "maintain";
        user.TargetWeightKg = 68m;
        user.CurrentStreak = 7;
        user.LongestStreak = Math.Max(user.LongestStreak, 14);
        user.LastLogDate = DateTime.UtcNow.Date;

        await db.SaveChangesAsync(cancellationToken);

        await CleanupUserDataAsync(db, appDb, user.UserId, cancellationToken);

        var mealTypes = await db.MealTypes.ToListAsync(cancellationToken);
        var servingUnits = await db.ServingUnits.ToListAsync(cancellationToken);
        var foodItems = await db.FoodItems
            .Where(item => !item.IsDeleted)
            .ToListAsync(cancellationToken);

        var nutritionTargets = CreateNutritionTargets(user.UserId, moderateActivity.ActivityLevelId, today);
        var bodyMetrics = CreateBodyMetrics(user.UserId, today);
        var mealDiaries = CreateMealDiaries(user.UserId, today, mealTypes, servingUnits, foodItems);
        var favoriteFoods = CreateFavoriteFoods(user.UserId, foodItems, today);
        var recentFoods = CreateRecentFoods(user.UserId, foodItems, today);

        db.NutritionTargets.AddRange(nutritionTargets);
        db.BodyMetrics.AddRange(bodyMetrics);
        db.MealDiaries.AddRange(mealDiaries);
        db.UserFavoriteFoods.AddRange(favoriteFoods);
        db.UserRecentFoods.AddRange(recentFoods);

        appDb.UserPreferences.Add(new AppModel.UserPreference
        {
            UserId = user.UserId,
            DietaryRestrictions = "[]",
            Allergies = "[]",
            PreferredMealsPerDay = 4,
            PreferredCuisine = "vietnamese",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(cancellationToken);
        await appDb.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Seeded scan demo reliability account {Email}. NewUser={IsNewUser}, Meals={MealCount}, Targets={TargetCount}",
            options.Email,
            isNewUser,
            mealDiaries.Count,
            nutritionTargets.Count);

        return new ScanDemoSeedResult
        {
            Email = options.Email,
            UserId = user.UserId,
            MealDiaryCount = mealDiaries.Count,
            BodyMetricCount = bodyMetrics.Count,
            NutritionTargetCount = nutritionTargets.Count,
            FavoriteFoodCount = favoriteFoods.Count,
            RecentFoodCount = recentFoods.Count,
        };
    }

    private static async Task CleanupUserDataAsync(
        EatFitAIDbContext db,
        ApplicationDbContext appDb,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var userDishIds = await db.UserDishes
            .Where(item => item.UserId == userId)
            .Select(item => item.UserDishId)
            .ToListAsync(cancellationToken);

        var aiLogIds = await db.AILogs
            .Where(item => item.UserId == userId)
            .Select(item => item.AILogId)
            .ToListAsync(cancellationToken);

        if (userDishIds.Count > 0)
        {
            var dishIngredients = await db.UserDishIngredients
                .Where(item => userDishIds.Contains(item.UserDishId))
                .ToListAsync(cancellationToken);
            db.UserDishIngredients.RemoveRange(dishIngredients);
        }

        if (aiLogIds.Count > 0)
        {
            var imageDetections = await db.ImageDetections
                .Where(item => aiLogIds.Contains(item.AILogId))
                .ToListAsync(cancellationToken);
            var aiSuggestions = await db.AISuggestions
                .Where(item => aiLogIds.Contains(item.AILogId))
                .ToListAsync(cancellationToken);
            db.ImageDetections.RemoveRange(imageDetections);
            db.AISuggestions.RemoveRange(aiSuggestions);
        }

        var userPreference = await appDb.UserPreferences
            .FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (userPreference != null)
        {
            appDb.UserPreferences.Remove(userPreference);
        }

        db.AiCorrectionEvents.RemoveRange(
            await db.AiCorrectionEvents.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.AILogs.RemoveRange(
            await db.AILogs.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.MealDiaries.RemoveRange(
            await db.MealDiaries.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.NutritionTargets.RemoveRange(
            await db.NutritionTargets.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.BodyMetrics.RemoveRange(
            await db.BodyMetrics.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.UserFavoriteFoods.RemoveRange(
            await db.UserFavoriteFoods.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.UserRecentFoods.RemoveRange(
            await db.UserRecentFoods.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.UserFoodItems.RemoveRange(
            await db.UserFoodItems.Where(item => item.UserId == userId).ToListAsync(cancellationToken));
        db.UserDishes.RemoveRange(
            await db.UserDishes.Where(item => item.UserId == userId).ToListAsync(cancellationToken));

        await db.SaveChangesAsync(cancellationToken);
        await appDb.SaveChangesAsync(cancellationToken);
    }

    private static List<Db.NutritionTarget> CreateNutritionTargets(Guid userId, int activityLevelId, DateOnly today) =>
        new()
        {
            new Db.NutritionTarget
            {
                UserId = userId,
                ActivityLevelId = activityLevelId,
                TargetCalories = 2250,
                TargetProtein = 145,
                TargetCarb = 255,
                TargetFat = 70,
                EffectiveFrom = today.AddDays(-60),
                EffectiveTo = today.AddDays(-15),
            },
            new Db.NutritionTarget
            {
                UserId = userId,
                ActivityLevelId = activityLevelId,
                TargetCalories = 2150,
                TargetProtein = 140,
                TargetCarb = 240,
                TargetFat = 68,
                EffectiveFrom = today.AddDays(-14),
                EffectiveTo = null,
            },
        };

    private static List<Db.BodyMetric> CreateBodyMetrics(Guid userId, DateOnly today) =>
        new()
        {
            new Db.BodyMetric { UserId = userId, HeightCm = 170m, WeightKg = 71.2m, MeasuredDate = today.AddDays(-21), Note = "Seeded weekly check-in" },
            new Db.BodyMetric { UserId = userId, HeightCm = 170m, WeightKg = 70.8m, MeasuredDate = today.AddDays(-14), Note = "Seeded weekly check-in" },
            new Db.BodyMetric { UserId = userId, HeightCm = 170m, WeightKg = 70.4m, MeasuredDate = today.AddDays(-7), Note = "Seeded weekly check-in" },
            new Db.BodyMetric { UserId = userId, HeightCm = 170m, WeightKg = 70.0m, MeasuredDate = today, Note = "Seeded current profile" },
        };

    private static List<Db.MealDiary> CreateMealDiaries(
        Guid userId,
        DateOnly today,
        IReadOnlyList<Db.MealType> mealTypes,
        IReadOnlyList<Db.ServingUnit> servingUnits,
        IReadOnlyList<Db.FoodItem> foodItems)
    {
        var entries = new List<Db.MealDiary>();
        foreach (var seed in DemoMeals)
        {
            var mealType = mealTypes.FirstOrDefault(item => item.Name == seed.MealTypeName)
                ?? throw new InvalidOperationException($"Missing meal type '{seed.MealTypeName}'.");
            var foodItem = foodItems.FirstOrDefault(item => item.FoodName == seed.FoodName)
                ?? throw new InvalidOperationException($"Missing food item '{seed.FoodName}'.");
            var servingUnit = servingUnits.FirstOrDefault(item => item.Name == seed.ServingUnitName)
                ?? throw new InvalidOperationException($"Missing serving unit '{seed.ServingUnitName}'.");

            var eatenDate = today.AddDays(-seed.DayOffset);
            var createdAt = CreateTimestamp(eatenDate, mealType.Name);
            var factor = seed.Grams / 100m;

            entries.Add(new Db.MealDiary
            {
                UserId = userId,
                EatenDate = eatenDate,
                MealTypeId = mealType.MealTypeId,
                FoodItemId = foodItem.FoodItemId,
                ServingUnitId = servingUnit.ServingUnitId,
                PortionQuantity = seed.PortionQuantity ?? seed.Grams,
                Grams = seed.Grams,
                Calories = Math.Round(foodItem.CaloriesPer100g * factor, 1),
                Protein = Math.Round(foodItem.ProteinPer100g * factor, 1),
                Carb = Math.Round(foodItem.CarbPer100g * factor, 1),
                Fat = Math.Round(foodItem.FatPer100g * factor, 1),
                Note = seed.Note,
                PhotoUrl = null,
                SourceMethod = seed.SourceMethod,
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
                IsDeleted = false,
            });
        }

        return entries;
    }

    private static List<Db.UserFavoriteFood> CreateFavoriteFoods(
        Guid userId,
        IReadOnlyList<Db.FoodItem> foodItems,
        DateOnly today)
    {
        var createdAt = CreateTimestamp(today, "Snack");
        return new List<Db.UserFavoriteFood>
        {
            new()
            {
                UserId = userId,
                FoodItemId = GetFoodItemId(foodItems, "Chicken Breast"),
                CreatedAt = createdAt.AddMinutes(-20),
            },
            new()
            {
                UserId = userId,
                FoodItemId = GetFoodItemId(foodItems, "Banana"),
                CreatedAt = createdAt.AddMinutes(-10),
            },
        };
    }

    private static List<Db.UserRecentFood> CreateRecentFoods(
        Guid userId,
        IReadOnlyList<Db.FoodItem> foodItems,
        DateOnly today)
    {
        var lastUsedAt = CreateTimestamp(today, "Dinner");
        return new List<Db.UserRecentFood>
        {
            new() { UserId = userId, FoodItemId = GetFoodItemId(foodItems, "Brown Rice"), LastUsedAt = lastUsedAt, UsedCount = 7 },
            new() { UserId = userId, FoodItemId = GetFoodItemId(foodItems, "Chicken Breast"), LastUsedAt = lastUsedAt.AddMinutes(-5), UsedCount = 6 },
            new() { UserId = userId, FoodItemId = GetFoodItemId(foodItems, "Banana"), LastUsedAt = lastUsedAt.AddMinutes(-10), UsedCount = 6 },
            new() { UserId = userId, FoodItemId = GetFoodItemId(foodItems, "Broccoli"), LastUsedAt = lastUsedAt.AddMinutes(-15), UsedCount = 5 },
            new() { UserId = userId, FoodItemId = GetFoodItemId(foodItems, "Greek Yogurt"), LastUsedAt = lastUsedAt.AddMinutes(-20), UsedCount = 5 },
        };
    }

    private static int GetFoodItemId(IReadOnlyList<Db.FoodItem> foodItems, string foodName) =>
        foodItems.FirstOrDefault(item => item.FoodName == foodName)?.FoodItemId
        ?? throw new InvalidOperationException($"Missing food item '{foodName}'.");

    private static DateTime CreateTimestamp(DateOnly eatenDate, string mealTypeName)
    {
        var time = mealTypeName switch
        {
            "Breakfast" => new TimeOnly(7, 30),
            "Lunch" => new TimeOnly(12, 15),
            "Dinner" => new TimeOnly(18, 45),
            "Snack" => new TimeOnly(15, 30),
            _ => new TimeOnly(12, 0),
        };

        return DateTime.SpecifyKind(eatenDate.ToDateTime(time), DateTimeKind.Utc);
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(PasswordSaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            PasswordHashIterations,
            HashAlgorithmName.SHA256,
            PasswordKeySize);

        return $"PBKDF2${PasswordHashIterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }
}
