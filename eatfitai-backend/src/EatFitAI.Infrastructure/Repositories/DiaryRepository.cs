using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Diary;
using EatFitAI.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.Infrastructure.Repositories;

public class DiaryRepository : IDiaryRepository
{
    private readonly AppDbContext _context;

    public DiaryRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DiaryEntry?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.DiaryEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);
    }

    public async Task<IEnumerable<DiaryEntry>> GetByDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        return await _context.DiaryEntries
            .Where(e => e.UserId == userId && e.MealDate == date)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(DiaryEntry entry, CancellationToken cancellationToken = default)
    {
        await _context.DiaryEntries.AddAsync(entry, cancellationToken);
    }

    public Task UpdateAsync(DiaryEntry entry, CancellationToken cancellationToken = default)
    {
        _context.DiaryEntries.Update(entry);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(DiaryEntry entry, CancellationToken cancellationToken = default)
    {
        _context.DiaryEntries.Remove(entry);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}