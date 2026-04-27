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
        private static readonly string[] AllowedImageContentTypes =
        {
            "image/jpeg", "image/png", "image/webp", "image/jpg"
        };

        private readonly IUserFoodItemRepository _repo;
        private readonly EatFitAIDbContext _context;
        private readonly IMapper _mapper;
        private readonly IMediaImageProcessor _mediaImageProcessor;
        private readonly IMediaStorageService _mediaStorageService;
        private readonly IMediaUrlResolver _mediaUrlResolver;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<UserFoodItemService> _logger;

        public UserFoodItemService(
            IUserFoodItemRepository repo,
            EatFitAIDbContext context,
            IMapper mapper,
            IMediaImageProcessor mediaImageProcessor,
            IMediaStorageService mediaStorageService,
            IMediaUrlResolver mediaUrlResolver,
            IWebHostEnvironment environment,
            ILogger<UserFoodItemService> logger)
        {
            _repo = repo;
            _context = context;
            _mapper = mapper;
            _mediaImageProcessor = mediaImageProcessor;
            _mediaStorageService = mediaStorageService;
            _mediaUrlResolver = mediaUrlResolver;
            _environment = environment;
            _logger = logger;
        }

        public async Task<(IEnumerable<UserFoodItemDto> Items, int Total)> ListAsync(Guid userId, string? search, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 20;
            var skip = (page - 1) * pageSize;

            var items = await _repo.SearchByUserAsync(userId, search, skip, pageSize);
            var total = await _repo.CountByUserAsync(userId, search);
            return (_mapper.Map<IEnumerable<UserFoodItemDto>>(items).Select(NormalizeMediaUrls).ToList(), total);
        }

        public async Task<UserFoodItemDto> GetAsync(Guid userId, int id)
        {
            var entity = await _repo.GetByIdForUserAsync(userId, id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy món ăn tự tạo");

            return NormalizeMediaUrls(_mapper.Map<UserFoodItemDto>(entity));
        }

        public async Task<UserFoodItemDto> CreateAsync(Guid userId, CreateUserFoodItemRequest request, string? uploadsRoot)
        {
            ValidateUnitType(request.UnitType);

            var now = DateTime.UtcNow;

            // Kiểm tra xem món ăn với cùng tên đã tồn tại chưa (bao gồm cả đã xóa mềm)
            var existingItem = await _repo.GetByUserAndNameAsync(userId, request.FoodName);

            string? thumbnailUrl = null;
            if (request.Thumbnail != null && request.Thumbnail.Length > 0)
            {
                thumbnailUrl = await SaveImageAsync(request.Thumbnail, userId, uploadsRoot);
            }

            if (existingItem != null)
            {
                // Đã tồn tại → cập nhật thông tin dinh dưỡng và khôi phục nếu đã bị xóa mềm
                existingItem.UnitType = request.UnitType;
                existingItem.CaloriesPer100 = request.CaloriesPer100;
                existingItem.ProteinPer100 = request.ProteinPer100;
                existingItem.CarbPer100 = request.CarbPer100;
                existingItem.FatPer100 = request.FatPer100;
                existingItem.IsDeleted = false; // Khôi phục nếu đã bị soft-delete
                existingItem.UpdatedAt = now;

                if (thumbnailUrl != null)
                {
                    existingItem.ThumbnailUrl = thumbnailUrl;
                }

                await _context.SaveChangesAsync();

                return NormalizeMediaUrls(_mapper.Map<UserFoodItemDto>(existingItem));
            }

            // Chưa tồn tại → tạo mới
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

            return NormalizeMediaUrls(_mapper.Map<UserFoodItemDto>(entity));
        }

        public async Task<UserFoodItemDto> UpdateAsync(Guid userId, int id, UpdateUserFoodItemRequest request, string? uploadsRoot)
        {
            var entity = await _repo.GetByIdForUserAsync(userId, id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy món ăn tự tạo");

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
                var newUrl = await SaveImageAsync(request.Thumbnail, userId, uploadsRoot);
                entity.ThumbnailUrl = newUrl;
            }

            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NormalizeMediaUrls(_mapper.Map<UserFoodItemDto>(entity));
        }

        public async Task DeleteAsync(Guid userId, int id)
        {
            var entity = await _repo.GetByIdForUserAsync(userId, id);
            if (entity == null)
                throw new KeyNotFoundException("Không tìm thấy món ăn tự tạo");

            entity.IsDeleted = true;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private static void ValidateUnitType(string unitType)
        {
            var normalized = unitType?.Trim().ToLowerInvariant();
            if (normalized != "g" && normalized != "ml")
            {
                throw new ArgumentException("Đơn vị phải là 'g' hoặc 'ml'");
            }
        }

        private UserFoodItemDto NormalizeMediaUrls(UserFoodItemDto dto)
        {
            dto.ThumbnailUrl = _mediaUrlResolver.NormalizePublicUrl(dto.ThumbnailUrl);
            dto.ImageVariants = MediaVariantHelper.FromThumbUrl(dto.ThumbnailUrl);
            return dto;
        }

        private async Task<string> SaveImageAsync(IFormFile file, Guid userId, string? uploadsRoot)
        {
            if (!AllowedImageContentTypes.Contains(file.ContentType))
            {
                throw new ArgumentException("Loại ảnh không được hỗ trợ. Chỉ chấp nhận: jpeg, png, webp.");
            }

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext))
            {
                ext = file.ContentType switch
                {
                    "image/jpeg" or "image/jpg" => ".jpg",
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    _ => ".img"
                };
            }

            if (_mediaStorageService.IsConfigured)
            {
                var mediaId = Guid.NewGuid().ToString("N");
                var variants = await _mediaImageProcessor.CreateVariantsAsync(file);
                var thumbObjectPath = $"v2/{userId:N}/thumb/{mediaId}.webp";
                var mediumObjectPath = $"v2/{userId:N}/medium/{mediaId}.webp";

                var thumbUrl = await _mediaStorageService.UploadAsync(new MediaUploadObject
                {
                    Bucket = "user-food",
                    ObjectPath = thumbObjectPath,
                    Bytes = variants.Thumb.Bytes,
                    ContentType = variants.Thumb.ContentType
                });
                await _mediaStorageService.UploadAsync(new MediaUploadObject
                {
                    Bucket = "user-food",
                    ObjectPath = mediumObjectPath,
                    Bytes = variants.Medium.Bytes,
                    ContentType = variants.Medium.ContentType
                });

                return thumbUrl;
            }

            if (_environment.IsProduction())
            {
                _logger.LogError(
                    "Supabase storage is not configured in Production. Rejecting user food thumbnail upload.");
                throw new InvalidOperationException(
                    "Cloud storage is not configured for user food thumbnail uploads.");
            }

            _logger.LogWarning(
                "Supabase storage is not configured. Falling back to local filesystem for user food thumbnail uploads.");

            if (uploadsRoot == null)
            {
                uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "user-food");
            }

            Directory.CreateDirectory(uploadsRoot);

            var fileName = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsRoot, fileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var urlPath = $"/uploads/user-food/{fileName}";
            return urlPath;
        }
    }
}


