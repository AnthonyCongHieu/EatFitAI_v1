using System;
using System.Threading;
using System.Threading.Tasks;
using EatFitAI.API.DTOs.AI;

namespace EatFitAI.API.Services.Interfaces
{
    /// <summary>
    /// AI-powered nutrition insight service
    /// Provides personalized recommendations based on user history and progress
    /// </summary>
    public interface INutritionInsightService
    {
        /// <summary>
        /// Get personalized nutrition insights for a user
        /// Analyzes eating patterns, adherence, and provides recommendations
        /// </summary>
        Task<NutritionInsightDto> GetPersonalizedInsightsAsync(
            Guid userId,
            NutritionInsightRequest request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Get adaptive nutrition target suggestions
        /// Automatically adjusts targets based on user progress and adherence
        /// </summary>
        Task<AdaptiveTargetDto> GetAdaptiveTargetAsync(
            Guid userId,
            AdaptiveTargetRequest request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Apply adaptive target adjustments
        /// </summary>
        Task ApplyAdaptiveTargetAsync(
            Guid userId,
            NutritionTargetDto newTarget,
            CancellationToken cancellationToken = default);
    }
}
