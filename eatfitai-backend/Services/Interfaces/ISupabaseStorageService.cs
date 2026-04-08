using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.Services.Interfaces
{
    public interface ISupabaseStorageService
    {
        bool IsConfigured { get; }

        Task<string> UploadUserFoodImageAsync(
            IFormFile file,
            string objectPath,
            CancellationToken cancellationToken = default);
    }
}
