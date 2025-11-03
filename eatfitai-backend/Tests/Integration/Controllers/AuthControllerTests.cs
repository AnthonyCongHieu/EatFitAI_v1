using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using EatFitAI.API.Controllers;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    public class AuthControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly JsonSerializerOptions _jsonOptions;

        public AuthControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace the database with in-memory database for testing
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<EatFitAIDbContext>));

                    if (descriptor != null)
                    {
                        services.Remove(descriptor);
                    }

                    services.AddDbContext<EatFitAIDbContext>(options =>
                    {
                        options.UseInMemoryDatabase("TestDb");
                    });
                });
            });

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        [Fact]
        public async Task Register_ValidRequest_ReturnsSuccess()
        {
            // Arrange
            var client = _factory.CreateClient();
            var request = new RegisterRequest
            {
                Email = "test@example.com",
                Password = "password123",
                DisplayName = "Test User"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/auth/register", request);

            // Assert
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(result);
            Assert.Equal(request.Email, result.Email);
            Assert.Equal(request.DisplayName, result.DisplayName);
            Assert.NotNull(result.Token);
        }

        [Fact]
        public async Task Register_ExistingEmail_ReturnsBadRequest()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Register first user
            var request1 = new RegisterRequest
            {
                Email = "duplicate@example.com",
                Password = "password123",
                DisplayName = "First User"
            };
            await client.PostAsJsonAsync("/api/auth/register", request1);

            // Try to register with same email
            var request2 = new RegisterRequest
            {
                Email = "duplicate@example.com",
                Password = "password456",
                DisplayName = "Second User"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/auth/register", request2);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Login_ValidCredentials_ReturnsSuccess()
        {
            // Arrange
            var client = _factory.CreateClient();

            // First register a user
            var registerRequest = new RegisterRequest
            {
                Email = "login@example.com",
                Password = "password123",
                DisplayName = "Login User"
            };
            await client.PostAsJsonAsync("/api/auth/register", registerRequest);

            // Now login
            var loginRequest = new LoginRequest
            {
                Email = "login@example.com",
                Password = "password123"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/auth/login", loginRequest);

            // Assert
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
            Assert.NotNull(result);
            Assert.Equal(loginRequest.Email, result.Email);
            Assert.NotNull(result.Token);
        }

        [Fact]
        public async Task Login_InvalidCredentials_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();
            var request = new LoginRequest
            {
                Email = "nonexistent@example.com",
                Password = "wrongpassword"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/auth/login", request);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
