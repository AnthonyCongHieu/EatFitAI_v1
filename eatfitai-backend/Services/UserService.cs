using AutoMapper;
using EatFitAI.API.Data;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Helpers;
using EatFitAI.API.Repositories.Interfaces;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services
{
    public class UserService : IUserService
    {
        private static readonly HashSet<string> AllowedAvatarContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        };

        private readonly IUserRepository _userRepository;
        private readonly EatFitAIDbContext _context;
        private readonly ApplicationDbContext _adminContext;
        private readonly IMapper _mapper;
        private readonly IMediaImageProcessor _mediaImageProcessor;
        private readonly IMediaStorageService _mediaStorageService;
        private readonly IMediaUrlResolver _mediaUrlResolver;
        private readonly IHostEnvironment _environment;
        private readonly SupabaseSchemaBootstrapper _schemaBootstrapper;
        private readonly ILogger<UserService> _logger;

        public UserService(
            IUserRepository userRepository,
            EatFitAIDbContext context,
            ApplicationDbContext adminContext,
            IMapper mapper,
            IMediaImageProcessor mediaImageProcessor,
            IMediaStorageService mediaStorageService,
            IMediaUrlResolver mediaUrlResolver,
            IHostEnvironment environment,
            SupabaseSchemaBootstrapper schemaBootstrapper,
            ILogger<UserService> logger)
        {
            _userRepository = userRepository;
            _context = context;
            _adminContext = adminContext;
            _mapper = mapper;
            _mediaImageProcessor = mediaImageProcessor;
            _mediaStorageService = mediaStorageService;
            _mediaUrlResolver = mediaUrlResolver;
            _environment = environment;
            _schemaBootstrapper = schemaBootstrapper;
            _logger = logger;
        }

        public async Task<UserDto> GetUserByIdAsync(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            return _mapper.Map<UserDto>(user);
        }

        public async Task<UserDto> UpdateUserAsync(Guid userId, UserDto userDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            // Update only allowed fields
            user.DisplayName = userDto.DisplayName;

            await _context.SaveChangesAsync();

            return _mapper.Map<UserDto>(user);
        }

        public async Task<BodyMetricDto> RecordBodyMetricsAsync(Guid userId, BodyMetricDto bodyMetricDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            var bodyMetric = new BodyMetric
            {
                UserId = userId,
                HeightCm = bodyMetricDto.HeightCm,
                WeightKg = bodyMetricDto.WeightKg,
                MeasuredDate = DateOnly.FromDateTime(bodyMetricDto.MeasuredDate),
                Note = bodyMetricDto.Note
            };

            await _context.BodyMetrics.AddAsync(bodyMetric);
            await _context.SaveChangesAsync();

            return _mapper.Map<BodyMetricDto>(bodyMetric);
        }

        public async Task<List<BodyMetricDto>> GetBodyMetricsHistoryAsync(Guid userId, int limit = 30)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            var bodyMetrics = await _context.BodyMetrics
                .Where(bm => bm.UserId == userId)
                .OrderByDescending(bm => bm.MeasuredDate)
                .ThenByDescending(bm => bm.BodyMetricId)
                .Take(limit)
                .ToListAsync();

            return _mapper.Map<List<BodyMetricDto>>(bodyMetrics);
        }


        public async Task<UserProfileDto> GetUserProfileAsync(Guid userId)
        {
            // Include ActivityLevel để lấy ActivityFactor
            var user = await _context.Users
                .Include(u => u.ActivityLevel)
                .FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) throw new KeyNotFoundException("Không tìm thấy người dùng");

            var userProfile = _mapper.Map<UserProfileDto>(user);
            
            // Map thêm các profile fields mới
            userProfile.Gender = user.Gender;
            userProfile.DateOfBirth = user.DateOfBirth;
            userProfile.ActivityLevelId = user.ActivityLevelId;
            userProfile.ActivityFactor = user.ActivityLevel?.ActivityFactor != null 
                ? (double)user.ActivityLevel.ActivityFactor 
                : null;
            userProfile.Goal = user.Goal;

            // Get latest body metrics
            var latestMetric = await _context.BodyMetrics
                .Where(bm => bm.UserId == userId)
                .OrderByDescending(bm => bm.MeasuredDate)
                .ThenByDescending(bm => bm.BodyMetricId)
                .FirstOrDefaultAsync();

            if (latestMetric != null)
            {
                userProfile.CurrentHeightCm = latestMetric.HeightCm;
                userProfile.CurrentWeightKg = latestMetric.WeightKg;
                userProfile.LastMeasuredDate = latestMetric.MeasuredDate;
            }

            // Map streak và target weight fields (Profile 2026)
            userProfile.TargetWeightKg = user.TargetWeightKg;
            userProfile.CurrentStreak = user.CurrentStreak;
            userProfile.LongestStreak = user.LongestStreak;
            userProfile.AvatarUrl = _mediaUrlResolver.NormalizePublicUrl(userProfile.AvatarUrl);

            return userProfile;
        }

        public async Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UserProfileDto userProfileDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("Không tìm thấy người dùng");

            if (userProfileDto.DisplayName != null)
                user.DisplayName = userProfileDto.DisplayName;
            if (userProfileDto.AvatarUrl != null)
                user.AvatarUrl = _mediaUrlResolver.NormalizePublicUrl(userProfileDto.AvatarUrl);
            
            // Update profile fields for AI nutrition
            if (userProfileDto.Gender != null)
                user.Gender = userProfileDto.Gender;
            if (userProfileDto.DateOfBirth.HasValue)
                user.DateOfBirth = userProfileDto.DateOfBirth;
            if (userProfileDto.ActivityLevelId.HasValue)
                user.ActivityLevelId = userProfileDto.ActivityLevelId;
            if (userProfileDto.Goal != null)
                user.Goal = userProfileDto.Goal;
            
            // Update target weight (Profile 2026)
            if (userProfileDto.TargetWeightKg.HasValue)
                user.TargetWeightKg = userProfileDto.TargetWeightKg;
            
            if (userProfileDto.AvatarUrl != null)
            {
                await EnsureAvatarUrlColumnAsync();
            }

            // Check if metrics changed
            if (userProfileDto.CurrentHeightCm.HasValue || userProfileDto.CurrentWeightKg.HasValue)
            {
                 var latestMetric = await _context.BodyMetrics
                    .Where(bm => bm.UserId == userId)
                    .OrderByDescending(bm => bm.MeasuredDate)
                    .ThenByDescending(bm => bm.BodyMetricId)
                    .FirstOrDefaultAsync();
                
                decimal newHeight = userProfileDto.CurrentHeightCm ?? latestMetric?.HeightCm ?? 0m;
                decimal newWeight = userProfileDto.CurrentWeightKg ?? latestMetric?.WeightKg ?? 0m;

                bool isChanged = latestMetric == null ||
                                 latestMetric.HeightCm != newHeight ||
                                 latestMetric.WeightKg != newWeight;

                if (isChanged && (newHeight > 0 || newWeight > 0))
                {
                    var newMetric = new BodyMetric
                    {
                        UserId = userId,
                        HeightCm = newHeight,
                        WeightKg = newWeight,
                        MeasuredDate = DateTimeHelper.GetVietnamToday(),
                        Note = "Cập nhật từ Hồ sơ"
                    };
                    await _context.BodyMetrics.AddAsync(newMetric);
                }
            }

            await _context.SaveChangesAsync();
            return await GetUserProfileAsync(userId);
        }

        public async Task<string> UpdateAvatarAsync(Guid userId, IFormFile file, string? uploadsRoot)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            var avatarUrl = await SaveAvatarAsync(file, userId, uploadsRoot);
            user.AvatarUrl = avatarUrl;
            await EnsureAvatarUrlColumnAsync();
            await _context.SaveChangesAsync();

            return _mediaUrlResolver.NormalizePublicUrl(avatarUrl) ?? avatarUrl;
        }

        public async Task DeleteUserAsync(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            await _schemaBootstrapper.EnsureSchemaAsync();

            if (_adminContext.Database.IsRelational())
            {
                var strategy = _adminContext.Database.CreateExecutionStrategy();
                await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await _adminContext.Database.BeginTransactionAsync();
                    await DeleteUserRowsFromAdminContextAsync(userId);
                    await transaction.CommitAsync();
                });
                return;
            }

            var aiLogIds = await _context.AILogs
                .Where(x => x.UserId == userId)
                .Select(x => x.AILogId)
                .ToListAsync();
            if (aiLogIds.Count > 0)
            {
                await DeleteFromQueryAsync(_context, _context.ImageDetections.Where(x => aiLogIds.Contains(x.AILogId)));
                await DeleteFromQueryAsync(_context, _context.AISuggestions.Where(x => aiLogIds.Contains(x.AILogId)));
            }

            var userDishIds = await _context.UserDishes
                .Where(x => x.UserId == userId)
                .Select(x => x.UserDishId)
                .ToListAsync();
            if (userDishIds.Count > 0)
            {
                await DeleteFromQueryAsync(_context, _context.UserDishIngredients.Where(x => userDishIds.Contains(x.UserDishId)));
            }

            await DeleteFromQueryAsync(_context, _context.AiCorrectionEvents.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.AILogs.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.BodyMetrics.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.MealDiaries.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.NutritionTargets.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.UserDishes.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.UserFavoriteFoods.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.UserFoodItems.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_context, _context.UserRecentFoods.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.TelemetryEvents.Where(x => x.UserId == userId));

            await DeleteFromQueryAsync(_adminContext, _adminContext.PasswordResetCodes.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserAccessControls.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserPreferences.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.WaterIntakes.Where(x => x.UserId == userId));

            // Finally, delete the user
            _userRepository.Remove(user);
            await _context.SaveChangesAsync();
        }

        private async Task DeleteUserRowsFromAdminContextAsync(Guid userId)
        {
            // Delete all related records first (due to ClientSetNull delete behavior).
            // Use server-side deletes because production schemas can have older nullable
            // columns that should not be materialized just to delete.
            var aiLogIds = await _adminContext.AILogs
                .Where(x => x.UserId == userId)
                .Select(x => x.AILogId)
                .ToListAsync();
            if (aiLogIds.Count > 0)
            {
                await DeleteFromQueryAsync(_adminContext, _adminContext.ImageDetections.Where(x => aiLogIds.Contains(x.AILogId)));
                await DeleteFromQueryAsync(_adminContext, _adminContext.AISuggestions.Where(x => aiLogIds.Contains(x.AILogId)));
            }

            var userDishIds = await _adminContext.UserDishes
                .Where(x => x.UserId == userId)
                .Select(x => x.UserDishId)
                .ToListAsync();
            if (userDishIds.Count > 0)
            {
                await DeleteFromQueryAsync(_adminContext, _adminContext.UserDishIngredients.Where(x => userDishIds.Contains(x.UserDishId)));
            }

            await DeleteFromQueryAsync(_adminContext, _adminContext.AiCorrectionEvents.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.AILogs.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.BodyMetrics.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.MealDiaries.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.NutritionTargets.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserDishes.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserFavoriteFoods.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserFoodItems.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserRecentFoods.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.TelemetryEvents.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.PasswordResetCodes.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserAccessControls.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.UserPreferences.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.WaterIntakes.Where(x => x.UserId == userId));
            await DeleteFromQueryAsync(_adminContext, _adminContext.Users.Where(x => x.UserId == userId));
        }

        private static async Task DeleteFromQueryAsync<TEntity>(DbContext context, IQueryable<TEntity> query)
            where TEntity : class
        {
            if (context.Database.IsRelational())
            {
                await query.ExecuteDeleteAsync();
                return;
            }

            var rows = await query.ToListAsync();
            context.RemoveRange(rows);
            await context.SaveChangesAsync();
        }

        private async Task<string> SaveAvatarAsync(IFormFile file, Guid userId, string? uploadsRoot)
        {
            if (file == null || file.Length <= 0)
            {
                throw new ArgumentException("File avatar không hợp lệ.");
            }

            var contentType = file.ContentType ?? string.Empty;
            if (!AllowedAvatarContentTypes.Contains(contentType))
            {
                throw new ArgumentException("Chỉ chấp nhận file JPG, PNG hoặc WEBP.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension))
            {
                extension = contentType.ToLowerInvariant() switch
                {
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    _ => ".jpg",
                };
            }

            if (_mediaStorageService.IsConfigured)
            {
                var mediaId = Guid.NewGuid().ToString("N");
                var variants = await _mediaImageProcessor.CreateVariantsAsync(file);
                var thumbObjectPath = $"avatars/v2/{userId:N}/thumb/{mediaId}.webp";
                var mediumObjectPath = $"avatars/v2/{userId:N}/medium/{mediaId}.webp";

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
                _logger.LogError("Avatar upload bị chặn vì cloud storage chưa được cấu hình cho production.");
                throw new InvalidOperationException(
                    "Cloud storage chưa được cấu hình cho avatar trong môi trường production.");
            }

            var root = uploadsRoot;
            if (string.IsNullOrWhiteSpace(root))
            {
                root = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "avatars");
            }

            Directory.CreateDirectory(root);
            var fileName = $"{userId:N}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var fullPath = Path.Combine(root, fileName);
            await using var stream = File.Create(fullPath);
            await file.CopyToAsync(stream);

            return $"/uploads/avatars/{fileName}";
        }

        private async Task EnsureAvatarUrlColumnAsync(CancellationToken cancellationToken = default)
        {
            if (!_context.Database.IsRelational())
            {
                return;
            }

            var entityType = _context.Model.FindEntityType(typeof(User));
            var tableName = entityType?.GetTableName();
            if (string.IsNullOrWhiteSpace(tableName))
            {
                return;
            }

            var schema = entityType?.GetSchema();
            var storeObject = StoreObjectIdentifier.Table(tableName, schema);
            var avatarProperty = entityType?.FindProperty(nameof(User.AvatarUrl));
            var columnName = avatarProperty?.GetColumnName(storeObject) ?? nameof(User.AvatarUrl);
            var qualifiedTableName = string.IsNullOrWhiteSpace(schema)
                ? $"\"{tableName}\""
                : $"\"{schema}\".\"{tableName}\"";
            var ddl = $"ALTER TABLE {qualifiedTableName} ADD COLUMN IF NOT EXISTS \"{columnName}\" text NULL";

            await _context.Database.ExecuteSqlRawAsync(ddl, cancellationToken);
        }
    }
}

