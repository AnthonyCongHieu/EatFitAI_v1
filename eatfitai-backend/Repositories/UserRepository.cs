using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories.Interfaces;

namespace EatFitAI.API.Repositories
{
    public class UserRepository : BaseRepository<User>, IUserRepository
    {
        public UserRepository(EatFitAIDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            var normalizedEmail = NormalizeEmail(email);
            if (normalizedEmail.Length == 0)
            {
                return null;
            }

            return await FirstOrDefaultAsync(u => u.Email.Trim().ToLower() == normalizedEmail);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            var normalizedEmail = NormalizeEmail(email);
            if (normalizedEmail.Length == 0)
            {
                return false;
            }

            return await AnyAsync(u => u.Email.Trim().ToLower() == normalizedEmail);
        }

        private static string NormalizeEmail(string email)
        {
            return string.IsNullOrWhiteSpace(email)
                ? string.Empty
                : email.Trim().ToLowerInvariant();
        }
    }
}
