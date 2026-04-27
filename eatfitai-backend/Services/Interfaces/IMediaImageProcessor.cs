using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.Services.Interfaces
{
    public interface IMediaImageProcessor
    {
        Task<MediaImageVariants> CreateVariantsAsync(
            IFormFile file,
            CancellationToken cancellationToken = default);
    }

    public sealed class MediaImageVariants
    {
        public required MediaImageVariant Thumb { get; init; }
        public required MediaImageVariant Medium { get; init; }
    }

    public sealed class MediaImageVariant
    {
        public required byte[] Bytes { get; init; }
        public required string ContentType { get; init; }
    }
}
