namespace EatFitAI.Application.Repositories;

public interface ISummaryRepository
{
    Task<(decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)?> GetDaySummaryAsync(Guid maNguoiDung, DateOnly ngayAn, CancellationToken cancellationToken = default);
    Task<IEnumerable<(DateOnly MealDate, decimal TotalQuantityGrams, decimal TotalCaloriesKcal, decimal TotalProteinGrams, decimal TotalCarbohydrateGrams, decimal TotalFatGrams)>> GetWeekSummaryAsync(Guid maNguoiDung, DateOnly ngayKetThuc, CancellationToken cancellationToken = default);
}