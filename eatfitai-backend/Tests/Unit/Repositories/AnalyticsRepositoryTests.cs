using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Repositories;

public class AnalyticsRepositoryTests : IDisposable
{
    private readonly EatFitAIDbContext _context;
    private readonly AnalyticsRepository _repository;

    public AnalyticsRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new EatFitAIDbContext(options);
        _repository = new AnalyticsRepository(_context);
    }

    [Fact]
    public async Task GetNutritionSummaryAsync_ReturnsTotalsMealTypesAndDailyCaloriesInOneContract()
    {
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var breakfast = new MealType { MealTypeId = 1, Name = "Breakfast" };
        var lunch = new MealType { MealTypeId = 2, Name = "Lunch" };
        _context.MealTypes.AddRange(breakfast, lunch);
        _context.MealDiaries.AddRange(
            CreateDiary(userId, new DateOnly(2026, 5, 18), breakfast, calories: 300, protein: 20, carb: 30, fat: 8),
            CreateDiary(userId, new DateOnly(2026, 5, 18), lunch, calories: 500, protein: 30, carb: 55, fat: 12),
            CreateDiary(userId, new DateOnly(2026, 5, 19), lunch, calories: 450, protein: 25, carb: 50, fat: 10),
            CreateDiary(userId, new DateOnly(2026, 5, 19), lunch, calories: 999, protein: 99, carb: 99, fat: 99, isDeleted: true),
            CreateDiary(otherUserId, new DateOnly(2026, 5, 18), breakfast, calories: 999, protein: 99, carb: 99, fat: 99));
        await _context.SaveChangesAsync();

        var summary = await _repository.GetNutritionSummaryAsync(
            userId,
            new DateTime(2026, 5, 18),
            new DateTime(2026, 5, 19, 23, 59, 59));

        Assert.Equal(1250, summary.TotalCalories);
        Assert.Equal(75, summary.TotalProtein);
        Assert.Equal(135, summary.TotalCarbs);
        Assert.Equal(30, summary.TotalFat);
        Assert.Equal(300, summary.CaloriesByMealType["Breakfast"]);
        Assert.Equal(950, summary.CaloriesByMealType["Lunch"]);
        Assert.Equal(800, summary.DailyCalories["2026-05-18"]);
        Assert.Equal(450, summary.DailyCalories["2026-05-19"]);
    }

    private static MealDiary CreateDiary(
        Guid userId,
        DateOnly eatenDate,
        MealType mealType,
        decimal calories,
        decimal protein,
        decimal carb,
        decimal fat,
        bool isDeleted = false)
    {
        return new MealDiary
        {
            UserId = userId,
            EatenDate = eatenDate,
            MealTypeId = mealType.MealTypeId,
            MealType = mealType,
            Grams = 100,
            Calories = calories,
            Protein = protein,
            Carb = carb,
            Fat = fat,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = isDeleted,
        };
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
