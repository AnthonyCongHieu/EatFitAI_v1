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

    public async Task<DiaryEntry?> GetByIdAsync(long id, Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.NhatKyAnUong
            .FirstOrDefaultAsync(e => e.MaNhatKy == id && e.MaNguoiDung == userId, cancellationToken);
    }

    public async Task<IEnumerable<DiaryEntry>> GetByDateAsync(Guid userId, DateOnly date, CancellationToken cancellationToken = default)
    {
        return await _context.NhatKyAnUong
            .Where(e => e.MaNguoiDung == userId && e.NgayAn == date)
            .OrderBy(e => e.NgayTao)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(DiaryEntry entry, CancellationToken cancellationToken = default)
    {
        await _context.NhatKyAnUong.AddAsync(entry, cancellationToken);
    }

    public Task UpdateAsync(DiaryEntry entry, CancellationToken cancellationToken = default)
    {
        _context.NhatKyAnUong.Update(entry);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(DiaryEntry entry, CancellationToken cancellationToken = default)
    {
        _context.NhatKyAnUong.Remove(entry);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}