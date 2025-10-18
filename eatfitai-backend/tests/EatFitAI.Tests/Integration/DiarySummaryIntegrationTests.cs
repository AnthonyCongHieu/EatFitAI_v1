using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;

namespace EatFitAI.Tests.Integration;

public class DiarySummaryIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public DiarySummaryIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient(new() { BaseAddress = new Uri("http://localhost") });
    }

    [Fact]
    public async Task CreateDiary_And_Summary_ShouldAggregate()
    {
        // Register + login
        var email = $"user_{Guid.NewGuid():N}@test.local";
        var password = "P@ssw0rd!";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new { Email = email, Password = password, HoTen = "Tester" });
        reg.EnsureSuccessStatusCode();
        // Use login token to proceed
        var login = await _client.PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });
        login.EnsureSuccessStatusCode();
        var loginTokens = await login.Content.ReadFromJsonAsync<AuthResponse>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginTokens!.AccessToken);

        // Pick a food from search
        var search = await _client.GetFromJsonAsync<SearchResponse>("/api/foods/search?pageSize=1");
        search!.items.Should().NotBeNullOrEmpty();
        var food = search.items[0];

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var grams = 100m;
        // Create diary entry 100g
        var create = await _client.PostAsJsonAsync("/api/diary", new
        {
            ngayAn = today,
            maBuaAn = "TRUA",
            source = "THUCPHAM",
            itemId = food.Id,
            soLuongGram = grams
        });
        if (!create.IsSuccessStatusCode)
        {
            var body = await create.Content.ReadAsStringAsync();
            var authHeader = create.Headers.WwwAuthenticate.ToString();
            throw new Exception($"Create diary failed {(int)create.StatusCode}: {create.ReasonPhrase} | WWW-Auth: {authHeader} | Body: {body}");
        }
        var entry = await create.Content.ReadFromJsonAsync<DiaryEntryDto>();

        // Summary day should match
        var day = await _client.GetFromJsonAsync<DaySummary>($"/api/summary/day?date={today:yyyy-MM-dd}");
        day!.kcal.Should().Be(entry!.NangLuongKcal);
        day!.proteinG.Should().Be(entry!.ProteinG);
        day!.carbG.Should().Be(entry!.CarbG);
        day!.fatG.Should().Be(entry!.FatG);
    }

    private record AuthResponse(string AccessToken, string RefreshToken, string TokenType, int ExpiresIn);
    private record SearchResponse(int page, int pageSize, int totalItems, int totalPages, FoodItem[] items);
    private record FoodItem(Guid Id, string Ten, string? DonViMacDinh, decimal NangLuongKcalPer100g, decimal ProteinGPer100g, decimal CarbGPer100g, decimal FatGPer100g);
    private record DiaryEntryDto(Guid Id, DateOnly NgayAn, string MaBuaAn, string Source, Guid ItemId, decimal SoLuongGram, decimal NangLuongKcal, decimal ProteinG, decimal CarbG, decimal FatG);
    private record DaySummary(DateOnly date, decimal kcal, decimal proteinG, decimal carbG, decimal fatG);
}
