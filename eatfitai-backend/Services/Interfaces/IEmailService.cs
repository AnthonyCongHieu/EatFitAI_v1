namespace EatFitAI.API.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendResetCodeAsync(string email, string code, DateTime expiresAt);
    }
}
