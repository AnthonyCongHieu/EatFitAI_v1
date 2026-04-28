namespace EatFitAI.API.Services.Interfaces
{
    public interface IMediaStorageService
    {
        bool IsConfigured { get; }

        Task<string> UploadAsync(
            MediaUploadObject upload,
            CancellationToken cancellationToken = default);

        Task<(string PresignedUrl, string PublicUrl)> GetPresignedUrlAsync(
            string bucket,
            string objectPath,
            string contentType,
            TimeSpan expiresIn,
            CancellationToken cancellationToken = default);
    }

    public sealed class MediaUploadObject
    {
        public required string Bucket { get; init; }
        public required string ObjectPath { get; init; }
        public required byte[] Bytes { get; init; }
        public required string ContentType { get; init; }
        public string CacheControl { get; init; } = "public, max-age=31536000, immutable";
    }
}
