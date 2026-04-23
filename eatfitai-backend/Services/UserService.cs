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
        private readonly ISupabaseStorageService _supabaseStorageService;
        private readonly IHostEnvironment _environment;
        private readonly SupabaseSchemaBootstrapper _schemaBootstrapper;
        private readonly ILogger<UserService> _logger;

        public UserService(
            IUserRepository userRepository,
            EatFitAIDbContext context,
            ApplicationDbContext adminContext,
            IMapper mapper,
            ISupabaseStorageService supabaseStorageService,
            IHostEnvironment environment,
            SupabaseSchemaBootstrapper schemaBootstrapper,
            ILogger<UserService> logger)
        {
            _userRepository = userRepository;
            _context = context;
            _adminContext = adminContext;
            _mapper = mapper;
            _supabaseStorageService = supabaseStorageService;
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

            return userProfile;
        }

        public async Task<UserProfileDto> UpdateUserProfileAsync(Guid userId, UserProfileDto userProfileDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("Không tìm thấy người dùng");

            if (userProfileDto.DisplayName != null)
                user.DisplayName = userProfileDto.DisplayName;
            if (userProfileDto.AvatarUrl != null)
                user.AvatarUrl = userProfileDto.AvatarUrl;
            
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

            return avatarUrl;
        }

        public async Task DeleteUserAsync(Guid userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException("Không tìm thấy người dùng");
            }

            await _schemaBootstrapper.EnsureSchemaAsync();

            // Delete all related records first (due to ClientSetNull delete behavior)
            // Delete AILogs
            var aiLogs = await _context.AILogs.Where(x => x.UserId == userId).ToListAsync();
            _context.AILogs.RemoveRange(aiLogs);

            // Delete BodyMetrics
            var bodyMetrics = await _context.BodyMetrics.Where(x => x.UserId == userId).ToListAsync();
            _context.BodyMetrics.RemoveRange(bodyMetrics);

            // Delete MealDiaries
            var mealDiaries = await _context.MealDiaries
                .Where(x => x.UserId == userId)
                .ToListAsync();
            _context.MealDiaries.RemoveRange(mealDiaries);

            // Delete NutritionTargets
            var nutritionTargets = await _context.NutritionTargets.Where(x => x.UserId == userId).ToListAsync();
            _context.NutritionTargets.RemoveRange(nutritionTargets);

            // Delete UserDishes
            var userDishes = await _context.UserDishes.Where(x => x.UserId == userId).ToListAsync();
            _context.UserDishes.RemoveRange(userDishes);

            // Delete UserFavoriteFoods
            var userFavoriteFoods = await _context.UserFavoriteFoods.Where(x => x.UserId == userId).ToListAsync();
            _context.UserFavoriteFoods.RemoveRange(userFavoriteFoods);

            // Delete UserFoodItems
            var userFoodItems = await _context.UserFoodItems.Where(x => x.UserId == userId).ToListAsync();
            _context.UserFoodItems.RemoveRange(userFoodItems);

            // Delete UserRecentFoods
            var userRecentFoods = await _context.UserRecentFoods.Where(x => x.UserId == userId).ToListAsync();
            _context.UserRecentFoods.RemoveRange(userRecentFoods);

            // Delete user preferences from the admin context first so profile delete
            // does not fail on stale preference rows in production.
            var userPreferences = await _adminContext.UserPreferences
                .Where(x => x.UserId == userId)
                .ToListAsync();
            _adminContext.UserPreferences.RemoveRange(userPreferences);

            await _adminContext.SaveChangesAsync();

            // Finally, delete the user
            _userRepository.Remove(user);
            await _context.SaveChangesAsync();
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

            if (_supabaseStorageService.IsConfigured)
            {
                var objectPath = $"avatars/{userId:N}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
                return await _supabaseStorageService.UploadUserFoodImageAsync(file, objectPath);
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

