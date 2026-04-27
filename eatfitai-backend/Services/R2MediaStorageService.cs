using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace EatFitAI.API.Services
{
    public class R2MediaStorageService : IMediaStorageService
    {
        private static readonly HashSet<string> PlaceholderValues = new(StringComparer.OrdinalIgnoreCase)
        {
            "SET_IN_ENV_OR_SECRET_STORE",
            "SET_IN_USER_SECRETS",
            "YOUR_R2_ACCOUNT_ID",
            "YOUR_R2_ACCESS_KEY_ID",
            "YOUR_R2_SECRET_ACCESS_KEY",
            "YOUR_R2_PUBLIC_BASE_URL"
        };

        private readonly MediaOptions _mediaOptions;
        private readonly R2Options _r2Options;
        private readonly ILogger<R2MediaStorageService> _logger;

        public R2MediaStorageService(
            IOptions<MediaOptions> mediaOptions,
            IOptions<R2Options> r2Options,
            ILogger<R2MediaStorageService> logger)
        {
            _mediaOptions = mediaOptions.Value;
            _r2Options = r2Options.Value;
            _logger = logger;
        }

        public bool IsConfigured =>
            HasRealValue(_mediaOptions.PublicBaseUrl)
            && HasRealValue(_r2Options.AccountId)
            && HasRealValue(_r2Options.Bucket)
            && HasRealValue(_r2Options.AccessKeyId)
            && HasRealValue(_r2Options.SecretAccessKey);

        public async Task<string> UploadAsync(
            MediaUploadObject upload,
            CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
            {
                throw new InvalidOperationException("Cloudflare R2 media storage is not configured.");
            }

            var objectKey = BuildObjectKey(upload.Bucket, upload.ObjectPath);
            using var client = CreateClient();
            await using var stream = new MemoryStream(upload.Bytes);
            var request = new PutObjectRequest
            {
                BucketName = _r2Options.Bucket,
                Key = objectKey,
                InputStream = stream,
                ContentType = upload.ContentType,
                AutoCloseStream = false
            };
            request.Headers.CacheControl = upload.CacheControl;

            var response = await client.PutObjectAsync(request, cancellationToken);
            _logger.LogDebug(
                "Uploaded R2 media object Key={Key} Status={StatusCode}",
                objectKey,
                response.HttpStatusCode);

            return BuildPublicUrl(objectKey);
        }

        protected virtual IAmazonS3 CreateClient()
        {
            var credentials = new BasicAWSCredentials(
                _r2Options.AccessKeyId,
                _r2Options.SecretAccessKey);
            var config = new AmazonS3Config
            {
                ServiceURL = $"https://{_r2Options.AccountId}.r2.cloudflarestorage.com",
                ForcePathStyle = true,
                AuthenticationRegion = "auto",
                RegionEndpoint = RegionEndpoint.USEast1
            };

            return new AmazonS3Client(credentials, config);
        }

        private string BuildPublicUrl(string objectKey)
        {
            return $"{_mediaOptions.PublicBaseUrl.TrimEnd('/')}/{Uri.EscapeDataString(objectKey).Replace("%2F", "/", StringComparison.Ordinal)}";
        }

        private static string BuildObjectKey(string bucket, string objectPath)
        {
            return $"{bucket.Trim('/')}/{objectPath.TrimStart('/')}";
        }

        private static bool HasRealValue(string? value)
        {
            return !string.IsNullOrWhiteSpace(value)
                && !PlaceholderValues.Contains(value.Trim());
        }
    }
}
