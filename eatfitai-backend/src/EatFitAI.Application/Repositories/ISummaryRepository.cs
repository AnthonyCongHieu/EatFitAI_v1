namespace EatFitAI.Application.Repositories;

public interface ISummaryRepository
{
    Task<(decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)?> GetDaySummaryAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task<IEnumerable<(DateOnly MealDate, decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)>> GetWeekSummaryAsync(Guid userId, DateOnly endDate, CancellationToken cancellationToken = default);
}