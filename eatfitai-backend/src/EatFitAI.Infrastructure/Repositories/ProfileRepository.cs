using EatFitAI.Application.Repositories;
using EatFitAI.Domain.Users;
using EatFitAI.Infrastructure.Persistence;

namespace EatFitAI.Infrastructure.Repositories;

public class ProfileRepository : IProfileRepository
{
    private readonly AppDbContext _context;

    public ProfileRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfile?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.HoSoNguoiDung.FindAsync(new object[] { userId }, cancellationToken);
    }

    public Task UpdateAsync(UserProfile profile, CancellationToken cancellationToken = default)
    {
        _context.HoSoNguoiDung.Update(profile);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}