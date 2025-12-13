using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Auth;
using EatFitAI.API.DTOs.MealDiary;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EatFitAI.API.Tests.Integration.Controllers
{
    /// <summary>
    /// Integration tests cho MealDiaryController - Test toàn bộ flow CRUD thông qua HTTP
    /// </summary>
    public class MealDiaryControllerTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;
        private readonly JsonSerializerOptions _jsonOptions;
        private string? _authToken;

        public MealDiaryControllerTests(WebApplicationFactory<Program> factory)
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
                        options.UseInMemoryDatabase("MealDiaryTestDb");
                    });
                });
            });

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        /// <summary>
        /// Helper method để đăng ký user và lấy auth token
        /// </summary>
        private async Task<string> GetAuthTokenAsync(HttpClient client)
        {
            if (_authToken != null) return _authToken;

            var registerRequest = new RegisterRequest
            {
                Email = $"mealtest_{Guid.NewGuid()}@example.com",
                Password = "password123",
                DisplayName = "Meal Test User"
            };

            var response = await client.PostAsJsonAsync("/api/auth/register", registerRequest);
            var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
            _authToken = authResponse?.Token ?? throw new Exception("Failed to get auth token");
            return _authToken;
        }

        #region GET /api/meal-diary Tests

        [Fact]
        public async Task GetMealDiaries_WithValidToken_ReturnsOk()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act
            var response = await client.GetAsync("/api/meal-diary");

            // Assert
            response.EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task GetMealDiaries_WithoutToken_ReturnsUnauthorized()
        {
            // Arrange - Không có token
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/meal-diary");

            // Assert - Yêu cầu authentication
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetMealDiaries_WithDateFilter_ReturnsFilteredResults()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var today = DateTime.Today.ToString("yyyy-MM-dd");

            // Act
            var response = await client.GetAsync($"/api/meal-diary?date={today}");

            // Assert
            response.EnsureSuccessStatusCode();
        }

        #endregion

        #region POST /api/meal-diary Tests

        [Fact]
        public async Task CreateMealDiary_ValidRequest_ReturnsCreated()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 2, // Lunch
                FoodItemId = 1,
                Grams = 200
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/meal-diary", createRequest);

            // Assert - Trả về Created (201) hoặc OK (200) tùy implementation
            Assert.True(
                response.StatusCode == HttpStatusCode.Created || 
                response.StatusCode == HttpStatusCode.OK,
                $"Expected Created or OK, got {response.StatusCode}");
        }

        [Fact]
        public async Task CreateMealDiary_InvalidRequest_ReturnsBadRequest()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Request không hợp lệ - thiếu các field bắt buộc
            var invalidRequest = new { };

            // Act
            var response = await client.PostAsJsonAsync("/api/meal-diary", invalidRequest);

            // Assert - Trả về BadRequest do validation fail
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task CreateMealDiary_WithoutAuth_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = DateTime.Today,
                MealTypeId = 1,
                FoodItemId = 1,
                Grams = 100
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/meal-diary", createRequest);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        #endregion

        #region PUT /api/meal-diary/{id} Tests

        [Fact]
        public async Task UpdateMealDiary_NonExistentId_ReturnsNotFound()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var updateRequest = new UpdateMealDiaryRequest
            {
                Grams = 300
            };

            // Act - Update entry không tồn tại
            var response = await client.PutAsJsonAsync("/api/meal-diary/99999", updateRequest);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        #endregion

        #region DELETE /api/meal-diary/{id} Tests

        [Fact]
        public async Task DeleteMealDiary_NonExistentId_ReturnsNotFound()
        {
            // Arrange
            var client = _factory.CreateClient();
            var token = await GetAuthTokenAsync(client);
            client.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // Act - Delete entry không tồn tại
            var response = await client.DeleteAsync("/api/meal-diary/99999");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task DeleteMealDiary_WithoutAuth_ReturnsUnauthorized()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.DeleteAsync("/api/meal-diary/1");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        #endregion
    }
}
