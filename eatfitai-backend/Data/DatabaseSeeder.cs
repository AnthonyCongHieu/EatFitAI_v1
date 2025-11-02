using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            await SeedActivityLevelsAsync(context);
            await SeedServingUnitsAsync(context);
            await SeedMealTypesAsync(context);
            await SeedFoodItemsAsync(context);
            await SeedFoodServingsAsync(context);
        }

        private static async Task SeedActivityLevelsAsync(ApplicationDbContext context)
        {
            if (await context.ActivityLevels.AnyAsync()) return;

            var activityLevels = new[]
            {
                new ActivityLevel { Name = "Sedentary", ActivityFactor = 1.2m },
                new ActivityLevel { Name = "Lightly Active", ActivityFactor = 1.375m },
                new ActivityLevel { Name = "Moderately Active", ActivityFactor = 1.55m },
                new ActivityLevel { Name = "Very Active", ActivityFactor = 1.725m },
                new ActivityLevel { Name = "Extremely Active", ActivityFactor = 1.9m }
            };

            await context.ActivityLevels.AddRangeAsync(activityLevels);
            await context.SaveChangesAsync();
        }

        private static async Task SeedServingUnitsAsync(ApplicationDbContext context)
        {
            if (await context.ServingUnits.AnyAsync()) return;

            var servingUnits = new[]
            {
                new ServingUnit { Name = "gram" },
                new ServingUnit { Name = "milliliter" },
                new ServingUnit { Name = "cup" },
                new ServingUnit { Name = "tablespoon" },
                new ServingUnit { Name = "teaspoon" },
                new ServingUnit { Name = "piece" },
                new ServingUnit { Name = "slice" },
                new ServingUnit { Name = "bowl" },
                new ServingUnit { Name = "plate" }
            };

            await context.ServingUnits.AddRangeAsync(servingUnits);
            await context.SaveChangesAsync();
        }

        private static async Task SeedMealTypesAsync(ApplicationDbContext context)
        {
            if (await context.MealTypes.AnyAsync()) return;

            var mealTypes = new[]
            {
                new MealType { Name = "Breakfast" },
                new MealType { Name = "Lunch" },
                new MealType { Name = "Dinner" },
                new MealType { Name = "Snack" }
            };

            await context.MealTypes.AddRangeAsync(mealTypes);
            await context.SaveChangesAsync();
        }

        private static async Task SeedFoodItemsAsync(ApplicationDbContext context)
        {
            if (await context.FoodItems.AnyAsync()) return;

            var foodItems = new[]
            {
                new FoodItem
                {
                    FoodName = "Chicken Breast",
                    CaloriesPer100g = 165m,
                    ProteinPer100g = 31m,
                    CarbPer100g = 0m,
                    FatPer100g = 3.6m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Brown Rice",
                    CaloriesPer100g = 111m,
                    ProteinPer100g = 2.6m,
                    CarbPer100g = 23m,
                    FatPer100g = 0.9m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Broccoli",
                    CaloriesPer100g = 34m,
                    ProteinPer100g = 2.8m,
                    CarbPer100g = 7m,
                    FatPer100g = 0.4m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Banana",
                    CaloriesPer100g = 89m,
                    ProteinPer100g = 1.1m,
                    CarbPer100g = 23m,
                    FatPer100g = 0.3m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Greek Yogurt",
                    CaloriesPer100g = 59m,
                    ProteinPer100g = 10m,
                    CarbPer100g = 3.6m,
                    FatPer100g = 0.4m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Almonds",
                    CaloriesPer100g = 579m,
                    ProteinPer100g = 21m,
                    CarbPer100g = 22m,
                    FatPer100g = 50m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Salmon",
                    CaloriesPer100g = 208m,
                    ProteinPer100g = 22m,
                    CarbPer100g = 0m,
                    FatPer100g = 13m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Sweet Potato",
                    CaloriesPer100g = 86m,
                    ProteinPer100g = 1.6m,
                    CarbPer100g = 20m,
                    FatPer100g = 0.1m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Spinach",
                    CaloriesPer100g = 23m,
                    ProteinPer100g = 2.9m,
                    CarbPer100g = 3.6m,
                    FatPer100g = 0.4m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                },
                new FoodItem
                {
                    FoodName = "Egg",
                    CaloriesPer100g = 155m,
                    ProteinPer100g = 13m,
                    CarbPer100g = 1.1m,
                    FatPer100g = 11m,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsDeleted = false
                }
            };

            await context.FoodItems.AddRangeAsync(foodItems);
            await context.SaveChangesAsync();
        }

        private static async Task SeedFoodServingsAsync(ApplicationDbContext context)
        {
            if (await context.FoodServings.AnyAsync()) return;

            var gramUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "gram");
            var cupUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "cup");
            var pieceUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "piece");
            var tablespoonUnit = await context.ServingUnits.FirstOrDefaultAsync(su => su.Name == "tablespoon");

            if (gramUnit == null || cupUnit == null || pieceUnit == null || tablespoonUnit == null) return;

            var foodItems = await context.FoodItems.ToListAsync();

            var foodServings = new List<FoodServing>();

            foreach (var foodItem in foodItems)
            {
                // Add gram serving for all foods
                foodServings.Add(new FoodServing
                {
                    FoodItemId = foodItem.FoodItemId,
                    ServingUnitId = gramUnit.ServingUnitId,
                    GramsPerUnit = 100
                });

                // Add specific servings based on food type
                switch (foodItem.FoodName)
                {
                    case "Chicken Breast":
                        foodServings.Add(new FoodServing
                        {
                            FoodItemId = foodItem.FoodItemId,
                            ServingUnitId = pieceUnit.ServingUnitId,
                            GramsPerUnit = 150 // Average chicken breast piece
                        });
                        break;
                    case "Brown Rice":
                        foodServings.Add(new FoodServing
                        {
                            FoodItemId = foodItem.FoodItemId,
                            ServingUnitId = cupUnit.ServingUnitId,
                            GramsPerUnit = 185 // Cooked rice cup
                        });
                        break;
                    case "Banana":
                        foodServings.Add(new FoodServing
                        {
                            FoodItemId = foodItem.FoodItemId,
                            ServingUnitId = pieceUnit.ServingUnitId,
                            GramsPerUnit = 118 // Average banana
                        });
                        break;
                    case "Greek Yogurt":
                        foodServings.Add(new FoodServing
                        {
                            FoodItemId = foodItem.FoodItemId,
                            ServingUnitId = cupUnit.ServingUnitId,
                            GramsPerUnit = 245 // Standard yogurt cup
                        });
                        break;
                    case "Almonds":
                        foodServings.Add(new FoodServing
                        {
                            FoodItemId = foodItem.FoodItemId,
                            ServingUnitId = tablespoonUnit.ServingUnitId,
                            GramsPerUnit = 12 // 1 tbsp almonds
                        });
                        break;
                    case "Egg":
                        foodServings.Add(new FoodServing
                        {
                            FoodItemId = foodItem.FoodItemId,
                            ServingUnitId = pieceUnit.ServingUnitId,
                            GramsPerUnit = 50 // Average egg
                        });
                        break;
                }
            }

            await context.FoodServings.AddRangeAsync(foodServings);
            await context.SaveChangesAsync();
        }
    }
}