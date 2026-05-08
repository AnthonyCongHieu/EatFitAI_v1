using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DbScaffold.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

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

        private static readonly string[] Yolo11mCleanV1Labels =
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

        private static readonly IReadOnlyDictionary<string, string[]> Yolo11mCleanV1Aliases =
            new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                ["banh_mi"] = ["banh mi"],
                ["goi_cuon"] = ["goi cuon"],
                ["fried_rice"] = ["com chien", "fried rice"],
                ["com_tam"] = ["com tam"],
                ["thit_kho"] = ["thit kho"],
                ["ca_kho"] = ["ca kho"],
                ["bo_kho"] = ["bo kho", "thit bo kho"],
                ["bo_la_lot"] = ["bo la lot"],
                ["bun_bo_hue"] = ["bun bo hue"],
                ["bun_cha"] = ["bun cha"],
                ["bun_dau"] = ["bun dau"],
                ["bun_mam"] = ["bun mam"],
                ["bun_rieu"] = ["bun rieu"],
                ["cha_gio"] = ["cha gio"],
                ["hu_tieu"] = ["hu tieu"],
                ["mi_quang"] = ["mi quang"],
                ["cao_lau"] = ["cao lau"],
                ["chao_long"] = ["chao long"],
                ["sup_cua"] = ["sup cua"],
                ["bitter_melon_soup"] = ["canh kho qua", "bitter melon soup"],
                ["caramelized_fish_clay_pot"] = ["ca kho to", "caramelized fish clay pot"],
                ["chicken_rice"] = ["com ga", "chicken rice"],
                ["pumpkin_soup"] = ["canh bi do", "pumpkin soup"],
                ["purple_yam_soup"] = ["canh khoai mo", "purple yam soup"],
                ["steamed_pork_belly_taro"] = ["thit ba chi hap khoai mon", "steamed pork belly taro"],
                ["sizzling_beef_steak"] = ["bo bit tet", "sizzling beef steak"],
                ["hollow_fried_sesame_donut"] = ["banh tieu", "hollow fried sesame donut"],
                ["nuoc_cham"] = ["nuoc cham"],
                ["rice"] = ["com", "rice"],
                ["noodles"] = ["mi", "noodles"],
                ["chicken"] = ["thit ga", "uc ga", "chicken"],
                ["beef"] = ["thit bo", "beef"],
                ["pork"] = ["thit heo", "thit lon", "pork"],
                ["pork_belly"] = ["thit ba chi", "pork belly"],
                ["pork_rib"] = ["suon heo", "pork rib"],
                ["grilled_pork_belly"] = ["thit ba chi nuong", "grilled pork belly"],
                ["fish"] = ["ca", "fish"],
                ["shrimp"] = ["tom", "shrimp"],
                ["crab"] = ["cua", "crab"],
                ["squid"] = ["muc", "squid"],
                ["egg"] = ["trung", "egg"],
                ["fried_egg"] = ["trung chien", "fried egg"],
                ["tofu"] = ["dau hu", "tofu"],
                ["sweet_potato"] = ["khoai lang", "sweet potato"],
                ["water_spinach"] = ["rau muong", "water spinach"],
                ["bitter_gourd"] = ["kho qua", "bitter gourd"],
                ["bottle_gourd"] = ["bau", "bottle gourd"],
                ["long_beans"] = ["dau dua", "long beans"],
                ["mushroom"] = ["nam", "mushroom"],
                ["green_onion"] = ["hanh la", "green onion"],
                ["shallot"] = ["hanh tim", "shallot"],
                ["chili"] = ["ot", "chili"],
                ["galangal"] = ["rieng", "galangal"],
                ["lemongrass"] = ["sa", "lemongrass"],
                ["lime_leaf"] = ["la chanh", "lime leaf"],
                ["coriander_seed"] = ["hat ngo", "coriander seed"],
                ["fennel_seed"] = ["hat thi la", "fennel seed"],
                ["star_anise"] = ["hoa hoi", "star anise"],
                ["cinnamon"] = ["que", "cinnamon"],
                ["clove"] = ["dinh huong", "clove"],
                ["lime"] = ["chanh", "lime"],
            };

        private static async Task SeedAiLabelMapsAsync(EatFitAIDbContext context)
        {
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
                    if (!existing.FoodItemId.HasValue && foodItemId.HasValue)
                    {
                        existing.FoodItemId = foodItemId;
                    }

                    existing.MinConfidence = Math.Min(existing.MinConfidence, minConfidence);
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

            return label is "beef" or "chicken" ? 0.05m : 0.60m;
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
            if (Yolo11mCleanV1Aliases.TryGetValue(label, out var extraAliases))
            {
                aliases.AddRange(extraAliases);
            }

            return aliases
                .Select(NormalizeCatalogKey)
                .Where(alias => !string.IsNullOrWhiteSpace(alias))
                .Distinct(StringComparer.Ordinal)
                .ToList();
        }

        private static int ScoreCatalogFood(FoodItem food, IReadOnlyCollection<string> aliases)
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

            foreach (var alias in aliases)
            {
                if (names.Any(name => name.Equals(alias, StringComparison.Ordinal)))
                {
                    return 1000;
                }

                if (names.Any(name => name.StartsWith(alias + " ", StringComparison.Ordinal)))
                {
                    return 900;
                }

                if (names.Any(name => name.Contains(" " + alias + " ", StringComparison.Ordinal)
                    || name.EndsWith(" " + alias, StringComparison.Ordinal)))
                {
                    return 800;
                }
            }

            return 0;
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
