using System.Net.Http.Headers;
using System.Net.Http.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers;

public class AIControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AIControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = IntegrationTestHost.CreateFactory(
            factory,
            $"AIControllerTests_{Guid.NewGuid():N}");
    }

    [Fact]
    public async Task TeachLabel_LogsCorrectionEvent_AndPreservesTeachFlow()
    {
        var userId = Guid.NewGuid();
        var foodItemId = await SeedUserAndFoodAsync(userId);
        var client = CreateAuthorizedClient(userId);

        var response = await client.PostAsJsonAsync("/api/ai/labels/teach", new TeachLabelRequestDto
        {
            Label = "Bun Bo Hue",
            FoodItemId = foodItemId,
            DetectedConfidence = 0.91,
            SelectedFoodName = "Bun bo Hue",
            Source = "vision_add_meal",
            ClientTimestamp = DateTimeOffset.UtcNow
        });

        response.EnsureSuccessStatusCode();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

        var correction = await context.AiCorrectionEvents
            .OrderByDescending(x => x.AiCorrectionEventId)
            .FirstOrDefaultAsync(x => x.UserId == userId);

        Assert.NotNull(correction);
        Assert.Equal("bun bo hue", correction.Label);
        Assert.Equal(foodItemId, correction.FoodItemId);
        Assert.Equal("vision_add_meal", correction.Source);

        var labelMap = await context.AiLabelMaps.FirstOrDefaultAsync(x => x.Label == "bun bo hue");
        Assert.NotNull(labelMap);
        Assert.Equal(foodItemId, labelMap.FoodItemId);
    }

    [Fact]
    public async Task CorrectionsEndpoints_LogAndAggregateStats()
    {
        var userId = Guid.NewGuid();
        var foodItemId = await SeedUserAndFoodAsync(userId);
        var client = CreateAuthorizedClient(userId);

        var createResponse = await client.PostAsJsonAsync("/api/ai/corrections", new AiCorrectionRequestDto
        {
            Label = "Ga Nuong",
            FoodItemId = foodItemId,
            DetectedConfidence = 0.82,
            SelectedFoodName = "Ga nuong",
            Source = "manual_review",
            ClientTimestamp = DateTimeOffset.UtcNow
        });

        createResponse.EnsureSuccessStatusCode();

        var statsResponse = await client.GetAsync("/api/ai/corrections/stats");
        statsResponse.EnsureSuccessStatusCode();

        var stats = await statsResponse.Content.ReadFromJsonAsync<AiCorrectionStatsDto>();
        Assert.NotNull(stats);
        Assert.True(stats.TotalCorrections >= 1);
        Assert.True(stats.TodayCorrections >= 1);
        Assert.Contains(stats.TopSources, x => x.Value == "manual_review" && x.Count >= 1);
        Assert.Contains(stats.TopCorrectedLabels, x => x.Value == "ga nuong" && x.Count >= 1);
    }

    private HttpClient CreateAuthorizedClient(Guid userId)
    {
        var client = _factory.CreateClient();
        var token = IntegrationTestHost.CreateJwtToken(
            _factory.Services,
            userId,
            $"aitest_{userId:N}@example.com",
            "AI Test User");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<int> SeedUserAndFoodAsync(Guid userId)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();

        if (!await context.Users.AnyAsync(x => x.UserId == userId))
        {
            await context.Users.AddAsync(new User
            {
                UserId = userId,
                Email = $"aitest_{userId:N}@example.com",
                DisplayName = "AI Test User",
                PasswordHash = "test",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true
            });
        }

        var foodItem = new FoodItem
        {
            FoodName = $"AI Food {Guid.NewGuid():N}",
            CaloriesPer100g = 100,
            ProteinPer100g = 10,
            CarbPer100g = 5,
            FatPer100g = 2,
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await context.FoodItems.AddAsync(foodItem);
        await context.SaveChangesAsync();
        return foodItem.FoodItemId;
    }
}
