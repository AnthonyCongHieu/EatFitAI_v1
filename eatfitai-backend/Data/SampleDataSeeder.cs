using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace EatFitAI.API.Data
{
    public static class SampleDataSeeder
    {
        public static async Task SeedSampleDataAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

            await SeedSampleUsersAsync(context);
            await SeedSampleBodyMetricsAsync(context);
            await SeedSampleMealDiariesAsync(context);
        }

        private static async Task SeedSampleUsersAsync(EatFitAIDbContext context)
        {
            if (await context.Users.AnyAsync()) return;

            var sampleUsers = new[]
            {
                new User
                {
                    UserId = Guid.NewGuid(),
                    Email = "john.doe@example.com",
                    PasswordHash = HashPassword("password123"),
                    DisplayName = "John Doe",
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    UserId = Guid.NewGuid(),
                    Email = "jane.smith@example.com",
                    PasswordHash = HashPassword("password123"),
                    DisplayName = "Jane Smith",
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    UserId = Guid.NewGuid(),
                    Email = "mike.johnson@example.com",
                    PasswordHash = HashPassword("password123"),
                    DisplayName = "Mike Johnson",
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    UserId = Guid.NewGuid(),
                    Email = "sarah.wilson@example.com",
                    PasswordHash = HashPassword("password123"),
                    DisplayName = "Sarah Wilson",
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    UserId = Guid.NewGuid(),
                    Email = "alex.brown@example.com",
                    PasswordHash = HashPassword("password123"),
                    DisplayName = "Alex Brown",
                    CreatedAt = DateTime.UtcNow
                }
            };

            await context.Users.AddRangeAsync(sampleUsers);
            await context.SaveChangesAsync();
        }

        private static async Task SeedSampleBodyMetricsAsync(EatFitAIDbContext context)
        {
            if (await context.BodyMetrics.AnyAsync()) return;

            var users = await context.Users.ToListAsync();
            if (!users.Any()) return;

            var bodyMetrics = new List<BodyMetric>();

            foreach (var user in users)
            {
                // Add multiple body metrics for each user over time
                var baseDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

                for (int i = 0; i < 4; i++)
                {
                    var measuredDate = baseDate.AddDays(i * 7); // Weekly measurements

                    // Generate realistic height and weight variations
                    decimal height = user.DisplayName switch
                    {
                        "John Doe" => 175.0m,
                        "Jane Smith" => 165.0m,
                        "Mike Johnson" => 180.0m,
                        "Sarah Wilson" => 160.0m,
                        "Alex Brown" => 170.0m,
                        _ => 170.0m
                    };

                    decimal baseWeight = user.DisplayName switch
                    {
                        "John Doe" => 75.0m,
                        "Jane Smith" => 60.0m,
                        "Mike Johnson" => 85.0m,
                        "Sarah Wilson" => 55.0m,
                        "Alex Brown" => 70.0m,
                        _ => 70.0m
                    };

                    // Add some weight fluctuation
                    decimal weightVariation = (decimal)(new Random().NextDouble() * 2 - 1); // -1 to +1 kg
                    decimal weight = baseWeight + weightVariation;

                    bodyMetrics.Add(new BodyMetric
                    {
                        UserId = user.UserId,
                        HeightCm = height,
                        WeightKg = weight,
                        MeasuredDate = measuredDate,
                        Note = i == 0 ? "Initial measurement" : null
                    });
                }
            }

            await context.BodyMetrics.AddRangeAsync(bodyMetrics);
            await context.SaveChangesAsync();
        }

        private static async Task SeedSampleMealDiariesAsync(EatFitAIDbContext context)
        {
            if (await context.MealDiaries.AnyAsync()) return;

            var users = await context.Users.ToListAsync();
            var foodItems = await context.FoodItems.ToListAsync();
            var mealTypes = await context.MealTypes.ToListAsync();
            var servingUnits = await context.ServingUnits.ToListAsync();

            if (!users.Any() || !foodItems.Any() || !mealTypes.Any() || !servingUnits.Any()) return;

            var gramUnit = servingUnits.FirstOrDefault(su => su.Name == "gram");
            var cupUnit = servingUnits.FirstOrDefault(su => su.Name == "cup");
            var pieceUnit = servingUnits.FirstOrDefault(su => su.Name == "piece");

            var mealDiaries = new List<MealDiary>();
            var random = new Random();

            foreach (var user in users)
            {
                // Create meal entries for the last 7 days
                for (int dayOffset = 0; dayOffset < 7; dayOffset++)
                {
                    var eatenDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-dayOffset));

                    // Breakfast
                    var breakfastFoods = new[] { "Egg", "Greek Yogurt", "Banana" };
                    foreach (var foodName in breakfastFoods)
                    {
                        var food = foodItems.FirstOrDefault(f => f.FoodName == foodName);
                        if (food != null)
                        {
                            var portion = foodName switch
                            {
                                "Egg" => 50m, // 1 egg
                                "Greek Yogurt" => 200m, // 200g serving
                                "Banana" => 118m, // 1 banana
                                _ => 100m
                            };

                            var servingUnitId = foodName == "Egg" ? pieceUnit?.ServingUnitId : gramUnit?.ServingUnitId;

                            mealDiaries.Add(CreateMealDiaryEntry(
                                user.UserId,
                                eatenDate,
                                mealTypes.First(mt => mt.Name == "Breakfast").MealTypeId,
                                food.FoodItemId,
                                servingUnitId,
                                portion,
                                food,
                                random));
                        }
                    }

                    // Lunch
                    var lunchFoods = new[] { "Chicken Breast", "Brown Rice", "Broccoli" };
                    foreach (var foodName in lunchFoods)
                    {
                        var food = foodItems.FirstOrDefault(f => f.FoodName == foodName);
                        if (food != null)
                        {
                            var portion = foodName switch
                            {
                                "Chicken Breast" => 150m, // 150g chicken breast
                                "Brown Rice" => 150m, // 150g cooked rice
                                "Broccoli" => 100m, // 100g broccoli
                                _ => 100m
                            };

                            mealDiaries.Add(CreateMealDiaryEntry(
                                user.UserId,
                                eatenDate,
                                mealTypes.First(mt => mt.Name == "Lunch").MealTypeId,
                                food.FoodItemId,
                                gramUnit?.ServingUnitId,
                                portion,
                                food,
                                random));
                        }
                    }

                    // Dinner
                    var dinnerFoods = new[] { "Salmon", "Sweet Potato", "Spinach" };
                    foreach (var foodName in dinnerFoods)
                    {
                        var food = foodItems.FirstOrDefault(f => f.FoodName == foodName);
                        if (food != null)
                        {
                            var portion = foodName switch
                            {
                                "Salmon" => 120m, // 120g salmon
                                "Sweet Potato" => 150m, // 150g sweet potato
                                "Spinach" => 80m, // 80g spinach
                                _ => 100m
                            };

                            mealDiaries.Add(CreateMealDiaryEntry(
                                user.UserId,
                                eatenDate,
                                mealTypes.First(mt => mt.Name == "Dinner").MealTypeId,
                                food.FoodItemId,
                                gramUnit?.ServingUnitId,
                                portion,
                                food,
                                random));
                        }
                    }

                    // Snack
                    var snackFoods = new[] { "Almonds", "Banana" };
                    var randomSnack = snackFoods[random.Next(snackFoods.Length)];
                    var snackFood = foodItems.FirstOrDefault(f => f.FoodName == randomSnack);
                    if (snackFood != null)
                    {
                        var portion = randomSnack switch
                        {
                            "Almonds" => 25m, // 25g almonds
                            "Banana" => 118m, // 1 banana
                            _ => 50m
                        };

                        var servingUnitId = randomSnack == "Banana" ? pieceUnit?.ServingUnitId : gramUnit?.ServingUnitId;

                        mealDiaries.Add(CreateMealDiaryEntry(
                            user.UserId,
                            eatenDate,
                            mealTypes.First(mt => mt.Name == "Snack").MealTypeId,
                            snackFood.FoodItemId,
                            servingUnitId,
                            portion,
                            snackFood,
                            random));
                    }
                }
            }

            await context.MealDiaries.AddRangeAsync(mealDiaries);
            await context.SaveChangesAsync();
        }

        private static MealDiary CreateMealDiaryEntry(
            Guid userId,
            DateOnly eatenDate,
            int mealTypeId,
            int foodItemId,
            int? servingUnitId,
            decimal portionGrams,
            FoodItem food,
            Random random)
        {
            // Calculate nutritional values based on portion
            var factor = portionGrams / 100m;
            var calories = food.CaloriesPer100g * factor;
            var protein = food.ProteinPer100g * factor;
            var carb = food.CarbPer100g * factor;
            var fat = food.FatPer100g * factor;

            // Add slight random variation to make data more realistic
            var variation = (decimal)(random.NextDouble() * 0.1 - 0.05); // -5% to +5%
            calories *= (1 + variation);
            protein *= (1 + variation);
            carb *= (1 + variation);
            fat *= (1 + variation);

            return new MealDiary
            {
                UserId = userId,
                EatenDate = eatenDate,
                MealTypeId = mealTypeId,
                FoodItemId = foodItemId,
                ServingUnitId = servingUnitId,
                PortionQuantity = portionGrams,
                Grams = portionGrams,
                Calories = Math.Round(calories, 1),
                Protein = Math.Round(protein, 1),
                Carb = Math.Round(carb, 1),
                Fat = Math.Round(fat, 1),
                Note = random.Next(10) == 0 ? "Tasty!" : null, // 10% chance of having a note
                SourceMethod = "Manual",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }
    }
}