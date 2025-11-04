using AutoMapper;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class UserFoodItemService : IUserFoodItemService
    {
        private readonly IUserFoodItemRepository _repo;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;

        public UserFoodItemService(IUserFoodItemRepository repo, EatFitAIDbContext context, IMapper mapper)
        {
            _repo = repo;
            _context = context;
            _mapper = mapper;
        }

        public async Task<(IEnumerable<UserFoodItemDto> Items, int Total)> ListAsync(Guid userId, string? search, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            var skip = (page - 1) * pageSize;

            var items = await _repo.SearchByUserAsync(userId, search, skip, pageSize);
            var total = await _repo.CountByUserAsync(userId, search);
            return (_mapper.Map<IEnumerable<UserFoodItemDto>>(items), total);
        }

        public async Task<UserFoodItemDto> GetAsync(Guid userId, int id)
        {
            var entity = await _repo.GetByIdForUserAsync(userId, id);
            if (entity == null)
                throw new KeyNotFoundException("User food item not found");

            return _mapper.Map<UserFoodItemDto>(entity);
        }

        public async Task<UserFoodItemDto> CreateAsync(Guid userId, CreateUserFoodItemRequest request, string? uploadsRoot)
        {
            ValidateUnitType(request.UnitType);

            var now = DateTime.UtcNow;

            string? thumbnailUrl = null;
            if (request.Thumbnail != null && request.Thumbnail.Length > 0)
            {
                thumbnailUrl = await SaveImageAsync(request.Thumbnail, uploadsRoot);
            }

            var entity = new UserFoodItem
            {
                UserId = userId,
                FoodName = request.FoodName,
                ThumbnailUrl = thumbnailUrl,
                UnitType = request.UnitType,
                CaloriesPer100 = request.CaloriesPer100,
                ProteinPer100 = request.ProteinPer100,
                CarbPer100 = request.CarbPer100,
                FatPer100 = request.FatPer100,
                IsDeleted = false,
                CreatedAt = now,
                UpdatedAt = now
            };

            await _context.UserFoodItems.AddAsync(entity);
            await _context.SaveChangesAsync();

            return _mapper.Map<UserFoodItemDto>(entity);
        }

        public async Task<UserFoodItemDto> UpdateAsync(Guid userId, int id, UpdateUserFoodItemRequest request, string? uploadsRoot)
        {
            var entity = await _repo.GetByIdForUserAsync(userId, id);
            if (entity == null)
                throw new KeyNotFoundException("User food item not found");

            if (request.UnitType != null)
                ValidateUnitType(request.UnitType);

            if (request.FoodName != null) entity.FoodName = request.FoodName;
            if (request.UnitType != null) entity.UnitType = request.UnitType;
            if (request.CaloriesPer100.HasValue) entity.CaloriesPer100 = request.CaloriesPer100.Value;
            if (request.ProteinPer100.HasValue) entity.ProteinPer100 = request.ProteinPer100.Value;
            if (request.CarbPer100.HasValue) entity.CarbPer100 = request.CarbPer100.Value;
            if (request.FatPer100.HasValue) entity.FatPer100 = request.FatPer100.Value;

            if (request.Thumbnail != null && request.Thumbnail.Length > 0)
            {
                var newUrl = await SaveImageAsync(request.Thumbnail, uploadsRoot);
                entity.ThumbnailUrl = newUrl;
            }

            entity.UpdatedAt = DateTime.UtcNow;

            _context.UserFoodItems.Update(entity);
            await _context.SaveChangesAsync();

            return _mapper.Map<UserFoodItemDto>(entity);
        }

        public async Task DeleteAsync(Guid userId, int id)
        {
            var entity = await _repo.GetByIdForUserAsync(userId, id);
            if (entity == null)
                throw new KeyNotFoundException("User food item not found");

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            _context.UserFoodItems.Update(entity);
            await _context.SaveChangesAsync();
        }

        private static void ValidateUnitType(string unitType)
        {
            var normalized = unitType?.Trim().ToLowerInvariant();
            if (normalized != "g" && normalized != "ml")
            {
                throw new ArgumentException("UnitType must be 'g' or 'ml'");
            }
        }

        private static readonly string[] AllowedImageContentTypes = new[]
        {
            "image/jpeg", "image/png", "image/webp", "image/jpg"
        };

        private static async Task<string> SaveImageAsync(IFormFile file, string? uploadsRoot)
        {
            if (uploadsRoot == null)
            {
                // default to wwwroot/uploads/user-food
                uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "user-food");
            }

            if (!AllowedImageContentTypes.Contains(file.ContentType))
            {
                throw new ArgumentException("Unsupported image type. Allowed: jpeg, png, webp.");
            }

            Directory.CreateDirectory(uploadsRoot);

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext))
            {
                // fallback ext by content type
                ext = file.ContentType switch
                {
                    "image/jpeg" or "image/jpg" => ".jpg",
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    _ => ".img"
                };
            }

            var fileName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsRoot, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return URL path served via StaticFiles (wwwroot)
            var urlPath = $"/uploads/user-food/{fileName}";
            return urlPath;
        }
    }
}

