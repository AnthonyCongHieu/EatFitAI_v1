using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace EatFitAI.API.Services
{
    public class FoodService : IFoodService
    {
        private readonly IFoodItemRepository _foodItemRepository;
        private readonly IUserFoodItemRepository _userFoodItemRepository;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<FoodService> _logger;

        public FoodService(
            IFoodItemRepository foodItemRepository,
            IUserFoodItemRepository userFoodItemRepository,
            EatFitAIDbContext context,
            IMapper mapper,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<FoodService> logger)
        {
            _foodItemRepository = foodItemRepository;
            _userFoodItemRepository = userFoodItemRepository;
            _context = context;
            _mapper = mapper;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<IEnumerable<FoodItemDto>> SearchFoodItemsAsync(string searchTerm, int limit = 50)
        {
            var foodItems = await _foodItemRepository.SearchByNameAsync(searchTerm, limit);
            return _mapper.Map<IEnumerable<FoodItemDto>>(foodItems);
        }

        public async Task<(FoodItemDto FoodItem, IEnumerable<FoodServingDto> Servings)> GetFoodItemWithServingsAsync(int id)
        {
            var (foodItem, servings) = await _foodItemRepository.GetByIdWithServingsAsync(id);
            if (foodItem == null)
            {
                throw new KeyNotFoundException("Food item not found");
            }

            var foodItemDto = _mapper.Map<FoodItemDto>(foodItem);
            var servingDtos = _mapper.Map<IEnumerable<FoodServingDto>>(servings);

            return (foodItemDto, servingDtos);
        }

        public async Task<BarcodeLookupResultDto?> LookupByBarcodeAsync(
            string barcode,
            CancellationToken cancellationToken = default)
        {
            var normalizedBarcode = NormalizeBarcode(barcode);
            if (string.IsNullOrWhiteSpace(normalizedBarcode))
            {
                return null;
            }

            var foodItem = await _context.FoodItems
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    item => item.IsActive
                        && !item.IsDeleted
                        && item.Barcode == normalizedBarcode,
                    cancellationToken);

            if (foodItem != null)
            {
                var servings = await _context.FoodServings
                    .AsNoTracking()
                    .Where(serving => serving.FoodItemId == foodItem.FoodItemId)
                    .Include(serving => serving.ServingUnit)
                    .ToListAsync(cancellationToken);

                return new BarcodeLookupResultDto
                {
                    Barcode = normalizedBarcode,
                    Source = "catalog",
                    FoodItem = _mapper.Map<FoodItemDto>(foodItem),
                    Servings = _mapper.Map<IEnumerable<FoodServingDto>>(servings),
                };
            }

            return await LookupBarcodeFromProviderAsync(normalizedBarcode, cancellationToken);
        }

        public async Task<CustomDishResponseDto> CreateCustomDishAsync(Guid userId, CustomDishDto customDishDto)
        {
            if (customDishDto.Ingredients == null || customDishDto.Ingredients.Count == 0)
            {
                throw new ArgumentException("Custom dish must contain at least one ingredient");
            }

            foreach (var ingredient in customDishDto.Ingredients)
            {
                if (ingredient.Grams <= 0)
                {
                    throw new ArgumentException("Custom dish ingredient grams must be greater than 0");
                }

                var foodExists = await _context.FoodItems.AnyAsync(foodItem =>
                    foodItem.FoodItemId == ingredient.FoodItemId &&
                    !foodItem.IsDeleted &&
                    foodItem.IsActive);
                if (!foodExists)
                {
                    throw new KeyNotFoundException($"Food item {ingredient.FoodItemId} was not found");
                }
            }

            await using var transaction = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync()
                : null;

            var userDish = new UserDish
            {
                UserId = userId,
                DishName = customDishDto.DishName,
                Description = customDishDto.Description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            await _context.UserDishes.AddAsync(userDish);
            await _context.SaveChangesAsync();

            // Add ingredients after the parent row exists so the dish/ingredient set stays consistent.
            foreach (var ingredient in customDishDto.Ingredients)
            {
                var userDishIngredient = new UserDishIngredient
                {
                    UserDishId = userDish.UserDishId,
                    FoodItemId = ingredient.FoodItemId,
                    Grams = ingredient.Grams
                };
                await _context.UserDishIngredients.AddAsync(userDishIngredient);
            }

            await _context.SaveChangesAsync();

            // Return response with ingredients
            var response = new CustomDishResponseDto
            {
                UserDishId = userDish.UserDishId,
                DishName = userDish.DishName,
                Description = userDish.Description,
                CreatedAt = userDish.CreatedAt,
                UpdatedAt = userDish.UpdatedAt,
                Ingredients = customDishDto.Ingredients
            };

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            return response;
        }

        public async Task<IEnumerable<FoodSearchResultDto>> SearchAllAsync(string searchTerm, Guid? userId, int limit = 50)
        {
            var catalog = await _foodItemRepository.SearchByNameAsync(searchTerm, limit);

            var catalogResults = catalog.Select(c => new FoodSearchResultDto
            {
                Source = "catalog",
                Id = c.FoodItemId,
                FoodName = c.FoodName,
                // Map ThumbNail -> ThumbnailUrl if present
                ThumbnailUrl = c.ThumbNail,
                UnitType = "g",
                CaloriesPer100 = c.CaloriesPer100g,
                ProteinPer100 = c.ProteinPer100g,
                CarbPer100 = c.CarbPer100g,
                FatPer100 = c.FatPer100g
            });

            IEnumerable<FoodSearchResultDto> userResults = Enumerable.Empty<FoodSearchResultDto>();
            if (userId.HasValue)
            {
                var userItems = await _userFoodItemRepository.SearchByUserAsync(userId.Value, searchTerm, 0, limit);
                userResults = userItems.Select(u => new FoodSearchResultDto
                {
                    Source = "user",
                    Id = u.UserFoodItemId,
                    FoodName = u.FoodName,
                    ThumbnailUrl = u.ThumbnailUrl,
                    UnitType = u.UnitType,
                    CaloriesPer100 = u.CaloriesPer100,
                    ProteinPer100 = u.ProteinPer100,
                    CarbPer100 = u.CarbPer100,
                    FatPer100 = u.FatPer100
                });
            }

            var combined = catalogResults.Concat(userResults)
                .OrderBy(x => x.FoodName)
                .Take(limit)
                .ToList();

            return combined;
        }

        private async Task<BarcodeLookupResultDto?> LookupBarcodeFromProviderAsync(
            string barcode,
            CancellationToken cancellationToken)
        {
            var templateUrl = _configuration["FoodBarcodeProvider:TemplateUrl"];
            if (string.IsNullOrWhiteSpace(templateUrl))
            {
                return null;
            }

            var requestUrl = templateUrl.Replace(
                "{barcode}",
                Uri.EscapeDataString(barcode),
                StringComparison.OrdinalIgnoreCase);

            using var client = _httpClientFactory.CreateClient();

            try
            {
                using var response = await client.GetAsync(requestUrl, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogInformation(
                        "Barcode provider returned {StatusCode} for barcode {Barcode}",
                        (int)response.StatusCode,
                        barcode);
                    return null;
                }

                var payload = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(payload);
                var foodItem = ParseProviderFoodItem(document.RootElement, barcode);
                if (foodItem == null)
                {
                    return null;
                }

                return new BarcodeLookupResultDto
                {
                    Barcode = barcode,
                    Source = "provider",
                    ProviderName = _configuration["FoodBarcodeProvider:Name"] ?? "barcode-provider",
                    FoodItem = foodItem,
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogWarning(ex, "Barcode provider lookup failed for {Barcode}", barcode);
                return null;
            }
        }

        private static FoodItemDto? ParseProviderFoodItem(JsonElement root, string barcode)
        {
            var product = root;
            if (root.ValueKind == JsonValueKind.Object
                && root.TryGetProperty("product", out var productElement)
                && productElement.ValueKind == JsonValueKind.Object)
            {
                product = productElement;
            }

            var name = ReadString(product, "product_name", "product_name_vi", "food_name", "name", "title");
            if (string.IsNullOrWhiteSpace(name))
            {
                return null;
            }

            decimal? ReadNutriment(params string[] keys)
            {
                if (!product.TryGetProperty("nutriments", out var nutriments)
                    || nutriments.ValueKind != JsonValueKind.Object)
                {
                    return null;
                }

                foreach (var key in keys)
                {
                    if (!nutriments.TryGetProperty(key, out var value))
                    {
                        continue;
                    }

                    if (value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var decimalValue))
                    {
                        return decimalValue;
                    }

                    if (value.ValueKind == JsonValueKind.String
                        && decimal.TryParse(value.GetString(), out decimalValue))
                    {
                        return decimalValue;
                    }
                }

                return null;
            }

            return new FoodItemDto
            {
                FoodItemId = 0,
                FoodName = name,
                Barcode = barcode,
                CaloriesPer100g = ReadNutriment("energy-kcal_100g", "energy_kcal_100g", "calories_100g", "calories") ?? 0m,
                ProteinPer100g = ReadNutriment("proteins_100g", "protein_100g", "protein") ?? 0m,
                CarbPer100g = ReadNutriment("carbohydrates_100g", "carbs_100g", "carbs") ?? 0m,
                FatPer100g = ReadNutriment("fat_100g", "fats_100g", "fat") ?? 0m,
                ThumbNail = ReadString(product, "image_url", "image_front_url", "image"),
                Source = "provider",
                IsActive = true,
                IsVerified = false,
                ReliabilityScore = 0.5d,
            };
        }

        private static string? ReadString(JsonElement element, params string[] keys)
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (element.TryGetProperty(key, out var value)
                    && value.ValueKind == JsonValueKind.String)
                {
                    var result = value.GetString()?.Trim();
                    if (!string.IsNullOrWhiteSpace(result))
                    {
                        return result;
                    }
                }
            }

            return null;
        }

        private static string NormalizeBarcode(string barcode)
        {
            return new string(
                barcode
                    .Trim()
                    .Where(char.IsLetterOrDigit)
                    .ToArray());
        }
    }
}
