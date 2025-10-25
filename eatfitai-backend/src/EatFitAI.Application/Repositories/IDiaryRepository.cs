using EatFitAI.Domain.Diary;

namespace EatFitAI.Application.Repositories;

public interface IDiaryRepository
{
    Task<DiaryEntry?> GetByIdAsync(long id, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<DiaryEntry>> GetByDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default);
    Task AddAsync(DiaryEntry entry, CancellationToken cancellationToken = default);
    Task UpdateAsync(DiaryEntry entry, CancellationToken cancellationToken = default);
    Task DeleteAsync(DiaryEntry entry, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}