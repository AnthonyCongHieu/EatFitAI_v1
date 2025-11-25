using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// Vision detection cache service implementation
    /// Uses in-memory cache with database fallback
    /// </summary>
    public class VisionCacheService : IVisionCacheService
    {
        private readonly EatFitAIDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly ILogger<VisionCacheService> _logger;
        private const int CacheExpirationHours = 24;

        public VisionCacheService(
            EatFitAIDbContext db,
            IMemoryCache cache,
            ILogger<VisionCacheService> logger)
        {
            _db = db;
            _cache = cache;
            _logger = logger;
        }

        public async Task<VisionDetectResultDto?> GetCachedDetectionAsync(
            string imageHash,
            CancellationToken cancellationToken = default)
        {
            // Try memory cache first
            if (_cache.TryGetValue($"vision_{imageHash}", out VisionDetectResultDto? cached))
            {
                _logger.LogInformation("Vision detection served from memory cache: {Hash}", imageHash);
                return cached;
            }

            // Fallback to database (if we had a VisionDetectionCache table)
            // For now, return null
            return null;
        }

        public async Task CacheDetectionAsync(
            string imageHash,
            VisionDetectResultDto result,
            Guid userId,
            CancellationToken cancellationToken = default)
        {
            // Cache in memory
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(CacheExpirationHours),
                SlidingExpiration = TimeSpan.FromHours(6)
            };

            _cache.Set($"vision_{imageHash}", result, cacheOptions);

            _logger.LogInformation("Cached vision detection result: {Hash}", imageHash);

            // Could also save to database here for persistent cache
            await Task.CompletedTask;
        }

        public async Task<List<DetectionHistoryDto>> GetDetectionHistoryAsync(
            Guid userId,
            DetectionHistoryRequest request,
            CancellationToken cancellationToken = default)
        {
            var startDate = DateTime.UtcNow.AddDays(-request.Days);

            // Get AI logs for vision detection
            var logs = await _db.AILogs
                .Where(l => l.UserId == userId 
                    && l.Action == "VisionDetect" 
                    && l.CreatedAt >= startDate)
                .OrderByDescending(l => l.CreatedAt)
                .Take(request.MaxResults)
                .ToListAsync(cancellationToken);

            var history = new List<DetectionHistoryDto>();

            foreach (var log in logs)
            {
                try
                {
                    // Parse output JSON to get detection results
                    var output = JsonSerializer.Deserialize<JsonElement>(log.OutputJson ?? "{}");
                    
                    var detectedLabels = new List<string>();
                    var mappedFoodNames = new List<string>();
                    var unmappedCount = 0;
                    var totalConfidence = 0.0;
                    var count = 0;

                    if (output.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in items.EnumerateArray())
                        {
                            if (item.TryGetProperty("label", out var label))
                            {
                                detectedLabels.Add(label.GetString() ?? "");
                            }
                            if (item.TryGetProperty("confidence", out var conf))
                            {
                                totalConfidence += conf.GetDouble();
                                count++;
                            }
                            if (item.TryGetProperty("foodName", out var foodName) && !string.IsNullOrEmpty(foodName.GetString()))
                            {
                                mappedFoodNames.Add(foodName.GetString() ?? "");
                            }
                        }
                    }

                    if (output.TryGetProperty("unmappedLabels", out var unmapped) && unmapped.ValueKind == JsonValueKind.Array)
                    {
                        unmappedCount = unmapped.GetArrayLength();
                        foreach (var item in unmapped.EnumerateArray())
                        {
                            if (item.ValueKind == JsonValueKind.String)
                            {
                                detectedLabels.Add(item.GetString() ?? "");
                            }
                        }
                    }

                    // Filter if only unmapped requested
                    if (request.OnlyUnmapped && unmappedCount == 0)
                    {
                        continue;
                    }

                    history.Add(new DetectionHistoryDto
                    {
                        DetectionId = log.AILogId,
                        DetectedAt = log.CreatedAt,
                        DetectedLabels = detectedLabels,
                        MappedFoodNames = mappedFoodNames,
                        UnmappedCount = unmappedCount,
                        AverageConfidence = count > 0 ? (decimal)(totalConfidence / count) : 0
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse AI log {LogId}", log.AILogId);
                }
            }

            return history;
        }

        public async Task<Dictionary<string, int>> GetUnmappedLabelsStatsAsync(
            Guid userId,
            int days = 30,
            CancellationToken cancellationToken = default)
        {
            var startDate = DateTime.UtcNow.AddDays(-days);

            var logs = await _db.AILogs
                .Where(l => l.UserId == userId 
                    && l.Action == "VisionDetect" 
                    && l.CreatedAt >= startDate)
                .ToListAsync(cancellationToken);

            var unmappedStats = new Dictionary<string, int>();

            foreach (var log in logs)
            {
                try
                {
                    var output = JsonSerializer.Deserialize<JsonElement>(log.OutputJson ?? "{}");
                    
                    if (output.TryGetProperty("unmappedLabels", out var unmapped) && unmapped.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in unmapped.EnumerateArray())
                        {
                            var label = item.ValueKind == JsonValueKind.String 
                                ? item.GetString() 
                                : item.TryGetProperty("label", out var l) ? l.GetString() : null;

                            if (!string.IsNullOrEmpty(label))
                            {
                                var normalizedLabel = label.Trim().ToLowerInvariant();
                                unmappedStats[normalizedLabel] = unmappedStats.GetValueOrDefault(normalizedLabel, 0) + 1;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse AI log {LogId}", log.AILogId);
                }
            }

            return unmappedStats.OrderByDescending(x => x.Value).ToDictionary(x => x.Key, x => x.Value);
        }

        public async Task<List<FoodItemSuggestionDto>> SuggestFoodItemsForLabelAsync(
            string label,
            CancellationToken cancellationToken = default)
        {
            var normalizedLabel = label.Trim().ToLowerInvariant();

            // Search for similar food items using fuzzy matching
            var foodItems = await _db.FoodItems
                .Where(f => !f.IsDeleted && f.IsActive)
                .ToListAsync(cancellationToken);

            var suggestions = new List<FoodItemSuggestionDto>();

            foreach (var food in foodItems)
            {
                var foodName = food.FoodName.ToLowerInvariant();
                var matchScore = CalculateMatchScore(normalizedLabel, foodName);

                if (matchScore > 0.3m) // Only suggest if match score > 30%
                {
                    suggestions.Add(new FoodItemSuggestionDto
                    {
                        FoodItemId = food.FoodItemId,
                        FoodName = food.FoodName,
                        MatchScore = matchScore * 100,
                        Reasoning = GetMatchReasoning(normalizedLabel, foodName, matchScore)
                    });
                }
            }

            return suggestions
                .OrderByDescending(s => s.MatchScore)
                .Take(5)
                .ToList();
        }

        #region Private Helper Methods

        private decimal CalculateMatchScore(string label, string foodName)
        {
            // Exact match
            if (label == foodName)
                return 1.0m;

            // Contains match
            if (foodName.Contains(label))
                return 0.8m;
            if (label.Contains(foodName))
                return 0.7m;

            // Word-level matching
            var labelWords = label.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var foodWords = foodName.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            var matchingWords = labelWords.Intersect(foodWords).Count();
            var totalWords = Math.Max(labelWords.Length, foodWords.Length);

            if (matchingWords > 0)
                return (decimal)matchingWords / totalWords * 0.6m;

            // Levenshtein distance for fuzzy matching
            var distance = LevenshteinDistance(label, foodName);
            var maxLength = Math.Max(label.Length, foodName.Length);
            var similarity = 1.0m - ((decimal)distance / maxLength);

            return similarity > 0.5m ? similarity * 0.5m : 0;
        }

        private string GetMatchReasoning(string label, string foodName, decimal matchScore)
        {
            if (matchScore >= 0.8m)
                return "Very similar name";
            if (matchScore >= 0.6m)
                return "Contains matching words";
            if (matchScore >= 0.4m)
                return "Partially similar";
            return "Possible match based on name similarity";
        }

        private int LevenshteinDistance(string source, string target)
        {
            if (string.IsNullOrEmpty(source))
                return target?.Length ?? 0;
            if (string.IsNullOrEmpty(target))
                return source.Length;

            var sourceLength = source.Length;
            var targetLength = target.Length;
            var distance = new int[sourceLength + 1, targetLength + 1];

            for (var i = 0; i <= sourceLength; i++)
                distance[i, 0] = i;
            for (var j = 0; j <= targetLength; j++)
                distance[0, j] = j;

            for (var i = 1; i <= sourceLength; i++)
            {
                for (var j = 1; j <= targetLength; j++)
                {
                    var cost = target[j - 1] == source[i - 1] ? 0 : 1;
                    distance[i, j] = Math.Min(
                        Math.Min(distance[i - 1, j] + 1, distance[i, j - 1] + 1),
                        distance[i - 1, j - 1] + cost);
                }
            }

            return distance[sourceLength, targetLength];
        }

        #endregion
    }
}
