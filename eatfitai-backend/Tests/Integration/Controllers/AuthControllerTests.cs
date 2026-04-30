using System.Net;
using System.Net.Http.Json;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.Tests.Integration;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public AuthControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = IntegrationTestHost.CreateFactory(
                factory,
                $"AuthControllerTests_{Guid.NewGuid():N}");
        }

        [Fact]
        public async Task Register_ValidRequest_ReturnsSuccess()
        {
            var client = _factory.CreateClient();
            var request = new RegisterRequest
            {
                Email = $"test_{Guid.NewGuid():N}@example.com",
                Password = "password123",
                DisplayName = "Test User"
            };

            var response = await client.PostAsJsonAsync("/api/auth/register", request);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(result);
            Assert.Equal(request.Email, result.Email);
            Assert.Equal(request.DisplayName, result.DisplayName);
            Assert.False(string.IsNullOrWhiteSpace(result.Token));
        }

        [Fact]
        public async Task Register_ExistingEmail_ReturnsBadRequest()
        {
            var client = _factory.CreateClient();
            var email = $"duplicate_{Guid.NewGuid():N}@example.com";

            var firstRequest = new RegisterRequest
            {
                Email = email,
                Password = "password123",
                DisplayName = "First User"
            };
            await client.PostAsJsonAsync("/api/auth/register", firstRequest);

            var secondRequest = new RegisterRequest
            {
                Email = email,
                Password = "password456",
                DisplayName = "Second User"
            };

            var response = await client.PostAsJsonAsync("/api/auth/register", secondRequest);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Login_ValidCredentials_ReturnsSuccess()
        {
            var client = _factory.CreateClient();
            var email = $"login_{Guid.NewGuid():N}@example.com";

            var registerRequest = new RegisterRequest
            {
                Email = email,
                Password = "password123",
                DisplayName = "Login User"
            };
            await client.PostAsJsonAsync("/api/auth/register", registerRequest);

            var loginRequest = new LoginRequest
            {
                Email = email,
                Password = "password123"
            };

            var response = await client.PostAsJsonAsync("/api/auth/login", loginRequest);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(result);
            Assert.Equal(loginRequest.Email, result.Email);
            Assert.False(string.IsNullOrWhiteSpace(result.Token));
        }

        [Fact]
        public async Task Login_InvalidCredentials_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var request = new LoginRequest
            {
                Email = "nonexistent@example.com",
                Password = "wrongpassword"
            };

            var response = await client.PostAsJsonAsync("/api/auth/login", request);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GoogleLogin_LegacyEndpoint_ReturnsGone()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/auth/google?idToken=legacy-test-token");

            Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
            Assert.True(response.Headers.TryGetValues("X-EatFitAI-Deprecated-Endpoint", out var values));
            Assert.Contains("/api/auth/google/signin", values.Single());
        }

        [Fact]
        public async Task VerifyResetCode_ValidRequest_ReturnsOk()
        {
            var client = _factory.CreateClient();
            var userId = Guid.NewGuid();
            const string email = "verify-reset@example.com";

            await IntegrationTestHost.EnsureAppUserAsync(
                _factory.Services,
                userId,
                email,
                "Verify Reset User",
                passwordHash: "test");
            await IntegrationTestHost.SeedPasswordResetCodeAsync(
                _factory.Services,
                userId,
                "123456");

            var response = await client.PostAsJsonAsync("/api/auth/verify-reset-code", new VerifyResetCodeRequest
            {
                Email = email,
                ResetCode = "123456",
            });

            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task VerifyResetCode_InvalidCode_ReturnsUnauthorized()
        {
            var client = _factory.CreateClient();
            var userId = Guid.NewGuid();
            const string email = "verify-reset-invalid@example.com";

            await IntegrationTestHost.EnsureAppUserAsync(
                _factory.Services,
                userId,
                email,
                "Verify Reset Invalid User",
                passwordHash: "test");
            await IntegrationTestHost.SeedPasswordResetCodeAsync(
                _factory.Services,
                userId,
                "123456");

            var response = await client.PostAsJsonAsync("/api/auth/verify-reset-code", new VerifyResetCodeRequest
            {
                Email = email,
                ResetCode = "654321",
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
