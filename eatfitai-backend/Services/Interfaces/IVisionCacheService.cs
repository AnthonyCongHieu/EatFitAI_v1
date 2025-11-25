using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using EatFitAI.API.DTOs.AI;

namespace EatFitAI.API.Services.Interfaces
{
    /// <summary>
    /// Vision detection cache service
    /// Caches detection results to reduce external API calls
    /// </summary>
    public interface IVisionCacheService
    {
        /// <summary>
        /// Get cached detection result by image hash
        /// </summary>
        Task<VisionDetectResultDto?> GetCachedDetectionAsync(
            string imageHash,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Cache detection result
        /// </summary>
        Task CacheDetectionAsync(
            string imageHash,
            VisionDetectResultDto result,
            Guid userId,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Get detection history for user
        /// </summary>
        Task<List<DetectionHistoryDto>> GetDetectionHistoryAsync(
            Guid userId,
            DetectionHistoryRequest request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Get unmapped labels statistics
        /// </summary>
        Task<Dictionary<string, int>> GetUnmappedLabelsStatsAsync(
            Guid userId,
            int days = 30,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Suggest food items for unmapped label
        /// </summary>
        Task<List<FoodItemSuggestionDto>> SuggestFoodItemsForLabelAsync(
            string label,
            CancellationToken cancellationToken = default);
    }
}
