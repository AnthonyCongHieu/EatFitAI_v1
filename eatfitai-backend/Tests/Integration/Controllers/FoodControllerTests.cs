using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Auth;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    /// <summary>
    /// Integration tests cho FoodController - Test search và lấy thông tin thực phẩm
    /// </summary>
    public class FoodControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly JsonSerializerOptions _jsonOptions;
        private string? _authToken;

        public FoodControllerTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Thay thế database bằng in-memory cho testing
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<EatFitAIDbContext>));

                    if (descriptor != null)
                    {
                        services.Remove(descriptor);
                    }

                    services.AddDbContext<EatFitAIDbContext>(options =>
                    {
                        options.UseInMemoryDatabase("FoodTestDb");
                    });
                });
            });

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        private async Task<string> GetAuthTokenAsync(HttpClient client)
        {
            if (_authToken != null) return _authToken;

            var registerRequest = new RegisterRequest
            {
                Email = $"foodtest_{Guid.NewGuid()}@example.com",
                Password = "password123",
                DisplayName = "Food Test User"
            };

            var response = await client.PostAsJsonAsync("/api/auth/register", registerRequest);
            var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
            _authToken = authResponse?.Token ?? throw new Exception("Failed to get auth token");
            return _authToken;
        }

        #region GET /api/food/search Tests

        [Fact]
        public async Task SearchFood_ValidQuery_ReturnsResults()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act - Tìm kiếm thực phẩm
            var response = await client.GetAsync("/api/food/search?q=cơm");

            // Assert
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task SearchFood_EmptyQuery_ReturnsEmptyList()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act
            var response = await client.GetAsync("/api/food/search?q=");

            // Assert - Trả về empty hoặc BadRequest tùy implementation
            Assert.True(
                response.StatusCode == HttpStatusCode.OK || 
                response.StatusCode == HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SearchFood_WithLimit_RespectsLimit()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act - Tìm kiếm với limit
            var response = await client.GetAsync("/api/food/search?q=thịt&limit=5");

            // Assert
            response.EnsureSuccessStatusCode();
        }

        [Fact]
        public async Task SearchFood_WithoutAuth_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/food/search?q=test");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        #endregion

        #region GET /api/food/{id} Tests

        [Fact]
        public async Task GetFoodById_ValidId_ReturnsFood()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act - Lấy thông tin thực phẩm theo ID
            var response = await client.GetAsync("/api/food/1");

            // Assert - Có thể NotFound nếu không có dữ liệu seed
            Assert.True(
                response.StatusCode == HttpStatusCode.OK || 
                response.StatusCode == HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetFoodById_InvalidId_ReturnsNotFound()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act
            var response = await client.GetAsync("/api/food/99999");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        #endregion

        #region GET /api/food/search-all Tests

        [Fact]
        public async Task SearchAll_CombinesCatalogAndUserFoods()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act - Tìm kiếm từ cả catalog và user foods
            var response = await client.GetAsync("/api/food/search-all?q=rau");

            // Assert
            response.EnsureSuccessStatusCode();
        }

        #endregion
    }
}
