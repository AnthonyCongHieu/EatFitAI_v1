using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Services;
using EatFitAI.API.DTOs.AI;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace TestRunner
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== BẮT ĐẦU MANUAL TEST RECIPE SUGGESTION ===");

            // 1. Setup Service Provider & Logger
            var serviceProvider = new ServiceCollection()
                .AddLogging(builder => builder.AddConsole())
                .BuildServiceProvider();

            var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();
            var logger = loggerFactory.CreateLogger<RecipeSuggestionService>();

            // 2. Setup In-Memory Database
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(databaseName: "ManualTestDb_" + Guid.NewGuid())
                .Options;

            using var context = new EatFitAIDbContext(options);

            // 3. Seed Data
            Console.WriteLine("-> Đang tạo dữ liệu mẫu...");
            await SeedData(context);

            // 4. Init Service
            var service = new RecipeSuggestionService(context, logger);

            // 5. Test Case 1: Tìm thấy công thức
            Console.WriteLine("\n[TEST 1] Tìm kiếm với: Trứng, Cà chua");
            var request1 = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "Trứng", "Cà chua" },
                MinMatchedIngredients = 1,
                MaxResults = 5
            };

            var result1 = await service.SuggestRecipesAsync(request1);
            PrintResult(result1);

            // 6. Test Case 2: Không tìm thấy
            Console.WriteLine("\n[TEST 2] Tìm kiếm với: Thịt bò (không có trong DB)");
            var request2 = new RecipeSuggestionRequest
            {
                AvailableIngredients = new List<string> { "Thịt bò" },
                MinMatchedIngredients = 1,
                MaxResults = 5
            };

            var result2 = await service.SuggestRecipesAsync(request2);
            PrintResult(result2);

            Console.WriteLine("\n=== KẾT THÚC TEST ===");
        }

        static async Task SeedData(EatFitAIDbContext context)
        {
            var egg = new FoodItem { FoodItemId = 1, FoodName = "Trứng", CaloriesPer100g = 155, ProteinPer100g = 13, CarbPer100g = 1.1m, FatPer100g = 11, IsActive = true, IsDeleted = false };
            var tomato = new FoodItem { FoodItemId = 2, FoodName = "Cà chua", CaloriesPer100g = 18, ProteinPer100g = 0.9m, CarbPer100g = 3.9m, FatPer100g = 0.2m, IsActive = true, IsDeleted = false };
            var onion = new FoodItem { FoodItemId = 3, FoodName = "Hành tây", CaloriesPer100g = 40, ProteinPer100g = 1.1m, CarbPer100g = 9, FatPer100g = 0.1m, IsActive = true, IsDeleted = false };

            context.FoodItems.AddRange(egg, tomato, onion);

            var recipe = new Recipe
            {
                RecipeId = 1,
                RecipeName = "Trứng xào cà chua",
                Description = "Món ăn đơn giản",
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Recipes.Add(recipe);

            context.RecipeIngredients.AddRange(
                new RecipeIngredient { RecipeId = 1, FoodItemId = 1, Grams = 100 },
                new RecipeIngredient { RecipeId = 1, FoodItemId = 2, Grams = 200 },
                new RecipeIngredient { RecipeId = 1, FoodItemId = 3, Grams = 50 }
            );

            await context.SaveChangesAsync();
            Console.WriteLine("-> Đã seed xong: 1 Recipe (Trứng xào cà chua), 3 Ingredients");
        }

        static void PrintResult(List<RecipeSuggestionDto> results)
        {
            if (results.Count == 0)
            {
                Console.WriteLine("-> Kết quả: KHÔNG TÌM THẤY công thức nào.");
            }
            else
            {
                Console.WriteLine($"-> Kết quả: Tìm thấy {results.Count} công thức.");
                foreach (var r in results)
                {
                    Console.WriteLine($"   - Tên: {r.RecipeName}");
                    Console.WriteLine($"     Match: {r.MatchedIngredientsCount}/{r.TotalIngredientsCount} ({r.MatchPercentage:F1}%)");
                    Console.WriteLine($"     Thiếu: {string.Join(", ", r.MissingIngredients)}");
                }
            }
        }
    }
}
