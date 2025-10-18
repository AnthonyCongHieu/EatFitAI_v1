using System.Net.Http.Json;
using FluentAssertions;

namespace EatFitAI.Tests.Integration;

public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient(new() { BaseAddress = new Uri("http://localhost") });
    }

    [Fact]
    public async Task Register_Login_Refresh_Succeeds()
    {
        var email = $"user_{Guid.NewGuid():N}@test.local";
        var password = "P@ssw0rd!";

        var regRes = await _client.PostAsJsonAsync("/api/auth/register", new { Email = email, Password = password, HoTen = "Tester" });
        regRes.IsSuccessStatusCode.Should().BeTrue();
        var reg = await regRes.Content.ReadFromJsonAsync<AuthResponse>();
        reg.Should().NotBeNull();
        reg!.AccessToken.Should().NotBeNullOrWhiteSpace();
        reg.RefreshToken.Should().NotBeNullOrWhiteSpace();

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new { Email = email, Password = password });
        loginRes.IsSuccessStatusCode.Should().BeTrue();
        var login = await loginRes.Content.ReadFromJsonAsync<AuthResponse>();
        login.Should().NotBeNull();

        var refreshRes = await _client.PostAsJsonAsync("/api/auth/refresh", new { RefreshToken = reg.RefreshToken });
        refreshRes.IsSuccessStatusCode.Should().BeTrue();
        var refresh = await refreshRes.Content.ReadFromJsonAsync<AuthResponse>();
        refresh.Should().NotBeNull();
        refresh!.RefreshToken.Should().NotBe(reg.RefreshToken);
    }

    private record AuthResponse(string AccessToken, string RefreshToken, string TokenType, int ExpiresIn);
}

