using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// Service for caching frequently accessed lookup tables
    /// Improves performance by reducing database queries for static/semi-static data
    /// </summary>
    public interface ILookupCacheService
    {
        Task<IEnumerable<MealType>> GetMealTypesAsync();
        Task<IEnumerable<ActivityLevel>> GetActivityLevelsAsync();
        Task<IEnumerable<ServingUnit>> GetServingUnitsAsync();
        void InvalidateCache();
    }

    public class LookupCacheService : ILookupCacheService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMemoryCache _cache;
        private readonly ILogger<LookupCacheService> _logger;

        private const string MEAL_TYPES_KEY = "LookupCache_MealTypes";
        private const string ACTIVITY_LEVELS_KEY = "LookupCache_ActivityLevels";
        private const string SERVING_UNITS_KEY = "LookupCache_ServingUnits";
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(24);

        public LookupCacheService(
            IServiceScopeFactory scopeFactory,
            IMemoryCache cache,
            ILogger<LookupCacheService> logger)
        {
            _scopeFactory = scopeFactory;
            _cache = cache;
            _logger = logger;
        }

        public async Task<IEnumerable<MealType>> GetMealTypesAsync()
        {
            return await _cache.GetOrCreateAsync(MEAL_TYPES_KEY, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                _logger.LogInformation("Loading MealTypes into cache");
                
                // Tạo scope riêng để lấy DbContext (vì service này là Singleton)
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
                
                return await context.MealTypes
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? Enumerable.Empty<MealType>();
        }

        public async Task<IEnumerable<ActivityLevel>> GetActivityLevelsAsync()
        {
            return await _cache.GetOrCreateAsync(ACTIVITY_LEVELS_KEY, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                _logger.LogInformation("Loading ActivityLevels into cache");
                
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
                
                return await context.ActivityLevels
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? Enumerable.Empty<ActivityLevel>();
        }

        public async Task<IEnumerable<ServingUnit>> GetServingUnitsAsync()
        {
            return await _cache.GetOrCreateAsync(SERVING_UNITS_KEY, async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheDuration;
                _logger.LogInformation("Loading ServingUnits into cache");
                
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<EatFitAIDbContext>();
                
                return await context.ServingUnits
                    .AsNoTracking()
                    .ToListAsync();
            }) ?? Enumerable.Empty<ServingUnit>();
        }

        /// <summary>
        /// Invalidate all lookup caches
        /// Call this when lookup data is modified (rare)
        /// </summary>
        public void InvalidateCache()
        {
            _cache.Remove(MEAL_TYPES_KEY);
            _cache.Remove(ACTIVITY_LEVELS_KEY);
            _cache.Remove(SERVING_UNITS_KEY);
            _logger.LogInformation("Lookup caches invalidated");
        }
    }
}
