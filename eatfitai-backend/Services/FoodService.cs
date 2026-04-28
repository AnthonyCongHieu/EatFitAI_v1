using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Exceptions;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net;
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
        private readonly IMediaUrlResolver _mediaUrlResolver;
        private readonly ILogger<FoodService> _logger;

        public FoodService(
            IFoodItemRepository foodItemRepository,
            IUserFoodItemRepository userFoodItemRepository,
            EatFitAIDbContext context,
            IMapper mapper,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            IMediaUrlResolver mediaUrlResolver,
            ILogger<FoodService> logger)
        {
            _foodItemRepository = foodItemRepository;
            _userFoodItemRepository = userFoodItemRepository;
            _context = context;
            _mapper = mapper;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _mediaUrlResolver = mediaUrlResolver;
            _logger = logger;
        }

        public async Task<IEnumerable<FoodItemDto>> SearchFoodItemsAsync(string searchTerm, int limit = 50)
        {
            var foodItems = await _foodItemRepository.SearchByNameAsync(searchTerm, limit);
            return _mapper.Map<IEnumerable<FoodItemDto>>(foodItems).Select(NormalizeFoodItemDto).ToList();
        }

        public async Task<(FoodItemDto FoodItem, IEnumerable<FoodServingDto> Servings)> GetFoodItemWithServingsAsync(int id)
        {
            var (foodItem, servings) = await _foodItemRepository.GetByIdWithServingsAsync(id);
            if (foodItem == null)
            {
                throw new KeyNotFoundException("Food item not found");
            }

            var foodItemDto = NormalizeFoodItemDto(_mapper.Map<FoodItemDto>(foodItem));
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
                    FoodItem = NormalizeFoodItemDto(_mapper.Map<FoodItemDto>(foodItem)),
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
                ImageVariants = MediaVariantHelper.FromThumbUrl(c.ThumbNail),
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
                    ImageVariants = MediaVariantHelper.FromThumbUrl(u.ThumbnailUrl),
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
                .Select(NormalizeSearchResult)
                .ToList();

            return combined;
        }

        public async Task<IEnumerable<FoodSearchResultDto>> GetRecentFoodsAsync(Guid userId, int limit = 20)
        {
            var normalizedLimit = Math.Clamp(limit, 1, 50);

            var recentCatalogFoods = await _context.UserRecentFoods
                .AsNoTracking()
                .Where(item =>
                    item.UserId == userId &&
                    !item.FoodItem.IsDeleted &&
                    item.FoodItem.IsActive)
                .Select(item => new RecentFoodProjection
                {
                    Source = "catalog",
                    Id = item.FoodItemId,
                    FoodName = item.FoodItem.FoodName,
                    ThumbnailUrl = item.FoodItem.ThumbNail,
                    ImageVariants = MediaVariantHelper.FromThumbUrl(item.FoodItem.ThumbNail),
                    UnitType = "g",
                    CaloriesPer100 = item.FoodItem.CaloriesPer100g,
                    ProteinPer100 = item.FoodItem.ProteinPer100g,
                    CarbPer100 = item.FoodItem.CarbPer100g,
                    FatPer100 = item.FoodItem.FatPer100g,
                    LastUsedAt = item.LastUsedAt,
                    UsedCount = item.UsedCount
                })
                .ToListAsync();

            var recentUserFoods = await _context.MealDiaries
                .AsNoTracking()
                .Where(mealDiary =>
                    mealDiary.UserId == userId &&
                    !mealDiary.IsDeleted &&
                    mealDiary.UserFoodItemId.HasValue)
                .GroupBy(mealDiary => mealDiary.UserFoodItemId!.Value)
                .Select(group => new
                {
                    UserFoodItemId = group.Key,
                    LastUsedAt = group.Max(mealDiary => mealDiary.UpdatedAt),
                    UsedCount = group.Count()
                })
                .Join(
                    _context.UserFoodItems
                        .AsNoTracking()
                        .Where(item => item.UserId == userId && !item.IsDeleted),
                    recent => recent.UserFoodItemId,
                    userFood => userFood.UserFoodItemId,
                    (recent, userFood) => new RecentFoodProjection
                    {
                        Source = "user",
                        Id = userFood.UserFoodItemId,
                        FoodName = userFood.FoodName,
                        ThumbnailUrl = userFood.ThumbnailUrl,
                        ImageVariants = MediaVariantHelper.FromThumbUrl(userFood.ThumbnailUrl),
                        UnitType = string.IsNullOrWhiteSpace(userFood.UnitType) ? "g" : userFood.UnitType,
                        CaloriesPer100 = userFood.CaloriesPer100,
                        ProteinPer100 = userFood.ProteinPer100,
                        CarbPer100 = userFood.CarbPer100,
                        FatPer100 = userFood.FatPer100,
                        LastUsedAt = recent.LastUsedAt,
                        UsedCount = recent.UsedCount
                    })
                .ToListAsync();

            return recentCatalogFoods
                .Concat(recentUserFoods)
                .OrderByDescending(item => item.LastUsedAt)
                .ThenByDescending(item => item.UsedCount)
                .Take(normalizedLimit)
                .Select(item => item.ToDto())
                .Select(NormalizeSearchResult)
                .ToList();
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
            // OpenFoodFacts yêu cầu User-Agent header — thiếu sẽ bị 403
            client.DefaultRequestHeaders.UserAgent.ParseAdd("EatFitAI/1.0 (eatfitai-backend)");

            try
            {
                using var response = await client.GetAsync(requestUrl, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    if (response.StatusCode == HttpStatusCode.NotFound)
                    {
                        _logger.LogInformation(
                            "Barcode provider returned 404 for barcode {Barcode}",
                            barcode);
                        return null;
                    }

                    _logger.LogInformation(
                        "Barcode provider returned {StatusCode} for barcode {Barcode}",
                        (int)response.StatusCode,
                        barcode);
                    throw new BarcodeProviderUnavailableException(
                        $"Barcode provider returned {(int)response.StatusCode} for barcode {barcode}.");
                }

                var payload = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(payload);
                var foodItem = ParseProviderFoodItem(document.RootElement, barcode);
                if (foodItem == null)
                {
                    return null;
                }

                // Luôn lưu FoodItem mới từ provider vào database để có ID thực tế
                var newFoodItemEntity = new FoodItem
                {
                    FoodName = foodItem.FoodName,
                    Barcode = barcode,
                    CaloriesPer100g = foodItem.CaloriesPer100g,
                    ProteinPer100g = foodItem.ProteinPer100g,
                    CarbPer100g = foodItem.CarbPer100g,
                    FatPer100g = foodItem.FatPer100g,
                    ThumbNail = foodItem.ThumbNail,
                    IsActive = true,
                    IsVerified = false,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CredibilityScore = 50
                };
                _context.FoodItems.Add(newFoodItemEntity);
                await _context.SaveChangesAsync(cancellationToken);

                foodItem.FoodItemId = newFoodItemEntity.FoodItemId;

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
                throw new BarcodeProviderUnavailableException(
                    $"Barcode provider lookup failed for {barcode}.",
                    ex);
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

        private FoodItemDto NormalizeFoodItemDto(FoodItemDto dto)
        {
            dto.ThumbNail = _mediaUrlResolver.NormalizePublicUrl(dto.ThumbNail);
            dto.ImageVariants = MediaVariantHelper.FromThumbUrl(dto.ThumbNail);
            return dto;
        }

        private FoodSearchResultDto NormalizeSearchResult(FoodSearchResultDto dto)
        {
            dto.ThumbnailUrl = _mediaUrlResolver.NormalizePublicUrl(dto.ThumbnailUrl);
            dto.ImageVariants = MediaVariantHelper.FromThumbUrl(dto.ThumbnailUrl);
            return dto;
        }

        private sealed class RecentFoodProjection
        {
            public string Source { get; init; } = string.Empty;
            public int Id { get; init; }
            public string FoodName { get; init; } = string.Empty;
            public string? ThumbnailUrl { get; init; }
            public ImageVariantsDto? ImageVariants { get; init; }
            public string UnitType { get; init; } = "g";
            public decimal CaloriesPer100 { get; init; }
            public decimal ProteinPer100 { get; init; }
            public decimal CarbPer100 { get; init; }
            public decimal FatPer100 { get; init; }
            public DateTime LastUsedAt { get; init; }
            public int UsedCount { get; init; }

            public FoodSearchResultDto ToDto()
            {
                return new FoodSearchResultDto
                {
                    Source = Source,
                    Id = Id,
                    FoodName = FoodName,
                    ThumbnailUrl = ThumbnailUrl,
                    ImageVariants = ImageVariants,
                    UnitType = UnitType,
                    CaloriesPer100 = CaloriesPer100,
                    ProteinPer100 = ProteinPer100,
                    CarbPer100 = CarbPer100,
                    FatPer100 = FatPer100
                };
            }
        }
    }
}
