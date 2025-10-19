namespace EatFitAI.Infrastructure.Auth;

public interface IPasswordHasher
{
    byte[] HashPassword(string password);

    bool VerifyPassword(string password, byte[] passwordHash);
}
