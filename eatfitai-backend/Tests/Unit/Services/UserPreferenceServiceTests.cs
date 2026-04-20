using EatFitAI.API.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class UserPreferenceServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly UserPreferenceService _service;
    private readonly Guid _userId = Guid.NewGuid();

    public UserPreferenceServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new ApplicationDbContext(options);
        _service = new UserPreferenceService(_db, new SupabaseSchemaBootstrapper(_db, Microsoft.Extensions.Logging.Abstractions.NullLogger<SupabaseSchemaBootstrapper>.Instance));
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task GetUserPreferenceAsync_WhenMissing_ReturnsDefaults()
    {
        var result = await _service.GetUserPreferenceAsync(_userId);

        Assert.NotNull(result);
        Assert.Equal(3, result.PreferredMealsPerDay);
        Assert.Empty(result.DietaryRestrictions ?? []);
        Assert.Empty(result.Allergies ?? []);
    }

    [Fact]
    public async Task UpdateUserPreferenceAsync_PersistsAndReturnsUpdatedValues()
    {
        await _db.Users.AddAsync(new User
        {
            UserId = _userId,
            Email = "pref@example.com",
            DisplayName = "Pref User",
            CreatedAt = DateTime.UtcNow,
            EmailVerified = true
        });
        await _db.SaveChangesAsync();

        await _service.UpdateUserPreferenceAsync(_userId, new UserPreferenceDto
        {
            DietaryRestrictions = new List<string> { "vegetarian" },
            Allergies = new List<string> { "peanut" },
            PreferredMealsPerDay = 4,
            PreferredCuisine = "vietnamese"
        });

        var result = await _service.GetUserPreferenceAsync(_userId);

        Assert.Equal(4, result.PreferredMealsPerDay);
        Assert.Contains("vegetarian", result.DietaryRestrictions ?? []);
        Assert.Contains("peanut", result.Allergies ?? []);
        Assert.Equal("vietnamese", result.PreferredCuisine);
    }
}
