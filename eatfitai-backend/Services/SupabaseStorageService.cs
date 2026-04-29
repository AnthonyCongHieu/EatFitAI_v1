using System.Net.Http.Headers;
using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace EatFitAI.API.Services
{
    public class SupabaseStorageService : ISupabaseStorageService
    {
        private static readonly HashSet<string> PlaceholderValues = new(StringComparer.OrdinalIgnoreCase)
        {
            "SET_IN_ENV_OR_SECRET_STORE",
            "SET_IN_USER_SECRETS",
            "YOUR_SUPABASE_URL",
            "YOUR_SUPABASE_SERVICE_ROLE_KEY"
        };

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<SupabaseStorageService> _logger;
        private readonly SupabaseOptions _options;

        public SupabaseStorageService(
            IHttpClientFactory httpClientFactory,
            IOptions<SupabaseOptions> options,
            ILogger<SupabaseStorageService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _options = options.Value;
        }

        public bool IsConfigured =>
            !IsPlaceholder(_options.Url)
            && !IsPlaceholder(_options.ServiceRoleKey)
            && !string.IsNullOrWhiteSpace(_options.UserFoodBucket);

        public async Task<string> UploadUserFoodImageAsync(
            IFormFile file,
            string objectPath,
            CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
            {
                throw new InvalidOperationException("Supabase storage is not configured.");
            }

            var client = _httpClientFactory.CreateClient();
            var requestUri = BuildObjectEndpoint(_options.UserFoodBucket, objectPath);

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
            request.Headers.TryAddWithoutValidation("apikey", _options.ServiceRoleKey);
            request.Headers.TryAddWithoutValidation("x-upsert", "true");

            await using var stream = file.OpenReadStream();
            request.Content = new StreamContent(stream);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue(
                file.ContentType ?? "application/octet-stream");

            using var response = await client.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Supabase upload failed. Status={StatusCode}, Body={Body}",
                    (int)response.StatusCode,
                    responseBody);
                throw new InvalidOperationException("Supabase upload failed for user food image.");
            }

            return BuildPublicUrl(_options.UserFoodBucket, objectPath);
        }

        public async Task<string> UploadObjectAsync(
            string bucket,
            string objectPath,
            byte[] bytes,
            string contentType,
            string cacheControl,
            CancellationToken cancellationToken = default)
        {
            if (!IsConfigured)
            {
                throw new InvalidOperationException("Supabase storage is not configured.");
            }

            var client = _httpClientFactory.CreateClient();
            var requestUri = BuildObjectEndpoint(bucket, objectPath);

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
            request.Headers.TryAddWithoutValidation("apikey", _options.ServiceRoleKey);
            request.Headers.TryAddWithoutValidation("x-upsert", "true");
            request.Headers.TryAddWithoutValidation("cache-control", NormalizeCacheControlSeconds(cacheControl));
            request.Content = new ByteArrayContent(bytes);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

            using var response = await client.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Supabase upload failed. Status={StatusCode}, Body={Body}",
                    (int)response.StatusCode,
                    responseBody);
                throw new InvalidOperationException("Supabase upload failed for media object.");
            }

            return BuildPublicUrl(bucket, objectPath);
        }

        private string BuildObjectEndpoint(string bucket, string objectPath)
        {
            return $"{_options.Url.TrimEnd('/')}/storage/v1/object/{EncodePathSegment(bucket)}/{EncodeObjectPath(objectPath)}";
        }

        private string BuildPublicUrl(string bucket, string objectPath)
        {
            return $"{_options.Url.TrimEnd('/')}/storage/v1/object/public/{EncodePathSegment(bucket)}/{EncodeObjectPath(objectPath)}";
        }

        private static string EncodeObjectPath(string objectPath)
        {
            return string.Join(
                "/",
                objectPath
                    .Split('/', StringSplitOptions.RemoveEmptyEntries)
                    .Select(EncodePathSegment));
        }

        private static string EncodePathSegment(string segment)
        {
            return Uri.EscapeDataString(segment.Trim());
        }

        private static string NormalizeCacheControlSeconds(string cacheControl)
        {
            var trimmed = (cacheControl ?? string.Empty).Trim();
            if (long.TryParse(trimmed, out var seconds) && seconds > 0)
            {
                return seconds.ToString();
            }

            foreach (var part in trimmed.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var token = part.Trim();
                if (!token.StartsWith("max-age=", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var value = token["max-age=".Length..].Trim();
                if (long.TryParse(value, out seconds) && seconds > 0)
                {
                    return seconds.ToString();
                }
            }

            return "31536000";
        }

        private static bool IsPlaceholder(string? value)
        {
            return string.IsNullOrWhiteSpace(value) || PlaceholderValues.Contains(value.Trim());
        }
    }
}
