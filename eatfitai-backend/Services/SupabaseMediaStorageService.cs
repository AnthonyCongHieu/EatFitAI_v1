using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services
{
    public class SupabaseMediaStorageService : IMediaStorageService
    {
        private readonly ISupabaseStorageService _supabaseStorageService;

        public SupabaseMediaStorageService(ISupabaseStorageService supabaseStorageService)
        {
            _supabaseStorageService = supabaseStorageService;
        }

        public bool IsConfigured => _supabaseStorageService.IsConfigured;

        public Task<string> UploadAsync(
            MediaUploadObject upload,
            CancellationToken cancellationToken = default)
        {
            return _supabaseStorageService.UploadObjectAsync(
                upload.Bucket,
                upload.ObjectPath,
                upload.Bytes,
                upload.ContentType,
                upload.CacheControl,
                cancellationToken);
        }

        public Task<(string PresignedUrl, string PublicUrl)> GetPresignedUrlAsync(
            string bucket,
            string objectPath,
            string contentType,
            TimeSpan expiresIn,
            CancellationToken cancellationToken = default)
        {
            throw new NotSupportedException("Presigned URLs are currently only supported via R2 storage provider.");
        }
    }
}
