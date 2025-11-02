using EatFitAI.API.Data;
using EatFitAI.API.Models;
using EatFitAI.API.Repositories.Interfaces;

namespace EatFitAI.API.Repositories
{
    public class UserRepository : BaseRepository<User>, IUserRepository
    {
        public UserRepository(ApplicationDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await AnyAsync(u => u.Email == email);
        }
    }
}