using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Repositories
{
    public class UserRepositoryTests
    {
        [Fact]
        public async Task GetByEmailAsync_UsesNormalizedEmailLookup()
        {
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new EatFitAIDbContext(options);
            var user = new User
            {
                UserId = Guid.NewGuid(),
                Email = "Reset.User@Example.com",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true,
            };
            await context.Users.AddAsync(user);
            await context.SaveChangesAsync();

            var repository = new UserRepository(context);

            var result = await repository.GetByEmailAsync(" reset.user@example.com ");

            Assert.NotNull(result);
            Assert.Equal(user.UserId, result.UserId);
        }

        [Fact]
        public async Task EmailExistsAsync_UsesNormalizedEmailLookup()
        {
            var options = new DbContextOptionsBuilder<EatFitAIDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            await using var context = new EatFitAIDbContext(options);
            await context.Users.AddAsync(new User
            {
                UserId = Guid.NewGuid(),
                Email = "Existing.User@Example.com",
                PasswordHash = "hash",
                CreatedAt = DateTime.UtcNow,
                EmailVerified = true,
            });
            await context.SaveChangesAsync();

            var repository = new UserRepository(context);

            var exists = await repository.EmailExistsAsync(" existing.user@example.com ");

            Assert.True(exists);
        }
    }
}
