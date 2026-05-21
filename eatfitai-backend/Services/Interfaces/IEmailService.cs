namespace EatFitAI.API.Services.Interfaces
{
    using EatFitAI.API.DTOs.Support;

    public interface IEmailService
    {
        Task SendResetCodeAsync(string email, string code, DateTime expiresAt);
        Task SendVerificationCodeAsync(string email, string code, DateTime expiresAt);
        Task SendFeedbackAsync(FeedbackEmailMessage message, CancellationToken cancellationToken = default);
    }
}
