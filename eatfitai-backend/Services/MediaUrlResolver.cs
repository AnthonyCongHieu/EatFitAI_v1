using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace EatFitAI.API.Services
{
    public sealed class MediaUrlResolver : IMediaUrlResolver
    {
        private const string SupabasePublicStorageMarker = "/storage/v1/object/public/";

        private static readonly string[] PlaceholderValues =
        {
            "SET_IN_ENV_OR_SECRET_STORE",
            "YOUR_MEDIA_PUBLIC_BASE_URL",
            "YOUR_R2_PUBLIC_BASE_URL"
        };

        private readonly MediaOptions _mediaOptions;

        public MediaUrlResolver(IOptions<MediaOptions> mediaOptions)
        {
            _mediaOptions = mediaOptions.Value;
        }

        public string? NormalizePublicUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return url;
            }

            var trimmed = url.Trim();
            if (!HasConfiguredPublicBaseUrl()
                || !Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)
                || !TryGetSupabaseStorageObject(uri, out var objectKey))
            {
                return trimmed;
            }

            return $"{_mediaOptions.PublicBaseUrl.TrimEnd('/')}/{EncodeObjectKey(objectKey)}";
        }

        private bool HasConfiguredPublicBaseUrl()
        {
            return !string.IsNullOrWhiteSpace(_mediaOptions.PublicBaseUrl)
                && Uri.TryCreate(_mediaOptions.PublicBaseUrl.Trim(), UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
                && !PlaceholderValues.Contains(_mediaOptions.PublicBaseUrl.Trim(), StringComparer.OrdinalIgnoreCase);
        }

        private static bool TryGetSupabaseStorageObject(Uri uri, out string objectKey)
        {
            objectKey = string.Empty;

            if (!uri.Host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var markerIndex = uri.AbsolutePath.IndexOf(SupabasePublicStorageMarker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex < 0)
            {
                return false;
            }

            var relative = uri.AbsolutePath[(markerIndex + SupabasePublicStorageMarker.Length)..].Trim('/');
            if (string.IsNullOrWhiteSpace(relative))
            {
                return false;
            }

            objectKey = Uri.UnescapeDataString(relative);
            return objectKey.StartsWith("user-food/", StringComparison.OrdinalIgnoreCase)
                || objectKey.StartsWith("food-images/", StringComparison.OrdinalIgnoreCase);
        }

        private static string EncodeObjectKey(string objectKey)
        {
            return Uri.EscapeDataString(objectKey.Trim('/')).Replace("%2F", "/", StringComparison.Ordinal);
        }
    }
}
