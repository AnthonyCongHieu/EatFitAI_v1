using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using System.Security.Cryptography;

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
            await SeedAiLabelMapsAsync(context);
            await SeedFoodServingsAsync(context);
            await SeedRecipesAsync(context);  // Thêm seed recipes
            await SeedDefaultUserPasswordsAsync(context, env);
        }

        private static async Task SeedActivityLevelsAsync(EatFitAIDbContext context)
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

        private static async Task SeedServingUnitsAsync(EatFitAIDbContext context)
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

        private static async Task SeedMealTypesAsync(EatFitAIDbContext context)
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

        private static async Task SeedFoodItemsAsync(EatFitAIDbContext context)
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

        private static async Task SeedAiLabelMapsAsync(EatFitAIDbContext context)
        {
            var foodItems = await context.FoodItems
                .Where(food => food.IsActive && !food.IsDeleted)
                .ToListAsync();

            var chicken = foodItems.FirstOrDefault(food =>
                food.FoodName.Contains("Chicken", StringComparison.OrdinalIgnoreCase)
                || (food.FoodNameUnsigned?.Contains("thit ga", StringComparison.OrdinalIgnoreCase) ?? false));
            var beef = foodItems.FirstOrDefault(food =>
                food.FoodName.Contains("Beef", StringComparison.OrdinalIgnoreCase)
                || (food.FoodNameUnsigned?.Contains("thit bo", StringComparison.OrdinalIgnoreCase) ?? false));

            if (beef == null)
            {
                beef = new FoodItem
                {
                    FoodName = "Beef",
                    FoodNameEn = "Beef",
                    FoodNameUnsigned = "beef",
                    CaloriesPer100g = 187m,
                    ProteinPer100g = 20m,
                    CarbPer100g = 0m,
                    FatPer100g = 12m,
                    IsActive = true,
                    IsDeleted = false,
                    IsVerified = true,
                    VerifiedBy = "Seed",
                    CredibilityScore = 90,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.FoodItems.AddAsync(beef);
                await context.SaveChangesAsync();
            }

            var maps = new List<(string Label, int FoodItemId, decimal MinConfidence)>();
            if (chicken != null)
            {
                maps.Add(("chicken", chicken.FoodItemId, 0.05m));
                maps.Add(("raw chicken", chicken.FoodItemId, 0.05m));
            }
            if (beef != null)
            {
                maps.Add(("beef", beef.FoodItemId, 0.05m));
                maps.Add(("raw beef", beef.FoodItemId, 0.05m));
            }

            foreach (var (label, foodItemId, minConfidence) in maps)
            {
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
                    existing.FoodItemId = foodItemId;
                    existing.MinConfidence = Math.Min(existing.MinConfidence, minConfidence);
                }
            }

            await context.SaveChangesAsync();
        }

        private static async Task SeedFoodServingsAsync(EatFitAIDbContext context)
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
            if (await context.Recipes.AnyAsync()) return;

            var foodItems = await context.FoodItems.ToListAsync();
            
            // Helper để tìm food item
            FoodItem? FindFood(string name) => foodItems.FirstOrDefault(f => 
                f.FoodName.Contains(name, StringComparison.OrdinalIgnoreCase));

            var chicken = FindFood("Chicken");
            var rice = FindFood("Rice");
            var egg = FindFood("Egg");
            var broccoli = FindFood("Broccoli");
            var spinach = FindFood("Spinach");
            var salmon = FindFood("Salmon");
            var sweetPotato = FindFood("Sweet Potato");
            var yogurt = FindFood("Yogurt");
            var banana = FindFood("Banana");
            var almonds = FindFood("Almonds");

            var now = DateTime.UtcNow;

            // Recipe 1: Cơm gà xào rau củ
            var recipe1 = new Recipe
            {
                RecipeName = "Cơm gà xào rau củ",
                Description = "Bữa ăn cân bằng với protein từ gà, carbs từ cơm và vitamin từ rau",
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            };
            context.Recipes.Add(recipe1);
            await context.SaveChangesAsync();

            if (chicken != null && rice != null && broccoli != null)
            {
                context.RecipeIngredients.AddRange(new[]
                {
                    new RecipeIngredient { RecipeId = recipe1.RecipeId, FoodItemId = chicken.FoodItemId, Grams = 150 },
                    new RecipeIngredient { RecipeId = recipe1.RecipeId, FoodItemId = rice.FoodItemId, Grams = 200 },
                    new RecipeIngredient { RecipeId = recipe1.RecipeId, FoodItemId = broccoli.FoodItemId, Grams = 100 }
                });
            }

            // Recipe 2: Cá hồi nướng với khoai lang
            var recipe2 = new Recipe
            {
                RecipeName = "Cá hồi nướng với khoai lang",
                Description = "Giàu omega-3 và carbs phức hợp, tốt cho sức khỏe tim mạch",
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            };
            context.Recipes.Add(recipe2);
            await context.SaveChangesAsync();

            if (salmon != null && sweetPotato != null && spinach != null)
            {
                context.RecipeIngredients.AddRange(new[]
                {
                    new RecipeIngredient { RecipeId = recipe2.RecipeId, FoodItemId = salmon.FoodItemId, Grams = 180 },
                    new RecipeIngredient { RecipeId = recipe2.RecipeId, FoodItemId = sweetPotato.FoodItemId, Grams = 200 },
                    new RecipeIngredient { RecipeId = recipe2.RecipeId, FoodItemId = spinach.FoodItemId, Grams = 50 }
                });
            }

            // Recipe 3: Salad trứng healthy
            var recipe3 = new Recipe
            {
                RecipeName = "Salad trứng healthy",
                Description = "Bữa sáng hoặc bữa phụ giàu protein và chất xơ",
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            };
            context.Recipes.Add(recipe3);
            await context.SaveChangesAsync();

            if (egg != null && spinach != null && broccoli != null)
            {
                context.RecipeIngredients.AddRange(new[]
                {
                    new RecipeIngredient { RecipeId = recipe3.RecipeId, FoodItemId = egg.FoodItemId, Grams = 100 }, // 2 eggs
                    new RecipeIngredient { RecipeId = recipe3.RecipeId, FoodItemId = spinach.FoodItemId, Grams = 80 },
                    new RecipeIngredient { RecipeId = recipe3.RecipeId, FoodItemId = broccoli.FoodItemId, Grams = 60 }
                });
            }

            // Recipe 4: Smoothie bowl bổ dưỡng
            var recipe4 = new Recipe
            {
                RecipeName = "Smoothie bowl bổ dưỡng",
                Description = "Bữa sáng nhẹ nhàng với sữa chua, chuối và hạnh nhân",
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            };
            context.Recipes.Add(recipe4);
            await context.SaveChangesAsync();

            if (yogurt != null && banana != null && almonds != null)
            {
                context.RecipeIngredients.AddRange(new[]
                {
                    new RecipeIngredient { RecipeId = recipe4.RecipeId, FoodItemId = yogurt.FoodItemId, Grams = 200 },
                    new RecipeIngredient { RecipeId = recipe4.RecipeId, FoodItemId = banana.FoodItemId, Grams = 120 },
                    new RecipeIngredient { RecipeId = recipe4.RecipeId, FoodItemId = almonds.FoodItemId, Grams = 20 }
                });
            }

            // Recipe 5: Gà nướng cùng rau xanh
            var recipe5 = new Recipe
            {
                RecipeName = "Gà nướng cùng rau xanh",
                Description = "Bữa tối low-carb giàu protein, phù hợp giảm cân",
                CreatedAt = now,
                UpdatedAt = now,
                IsDeleted = false
            };
            context.Recipes.Add(recipe5);
            await context.SaveChangesAsync();

            if (chicken != null && spinach != null && broccoli != null)
            {
                context.RecipeIngredients.AddRange(new[]
                {
                    new RecipeIngredient { RecipeId = recipe5.RecipeId, FoodItemId = chicken.FoodItemId, Grams = 200 },
                    new RecipeIngredient { RecipeId = recipe5.RecipeId, FoodItemId = spinach.FoodItemId, Grams = 100 },
                    new RecipeIngredient { RecipeId = recipe5.RecipeId, FoodItemId = broccoli.FoodItemId, Grams = 100 }
                });
            }

            await context.SaveChangesAsync();
        }
    }
}
