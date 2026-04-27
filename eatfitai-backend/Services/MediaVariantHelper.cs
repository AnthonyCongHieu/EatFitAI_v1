using EatFitAI.API.DTOs.Food;

namespace EatFitAI.API.Services
{
    public static class MediaVariantHelper
    {
        private const string ThumbSegment = "/v2/thumb/";
        private const string MediumSegment = "/v2/medium/";
        private const string RelativeThumbSegment = "v2/thumb/";
        private const string RelativeMediumSegment = "v2/medium/";

        public static ImageVariantsDto? FromThumbUrl(string? thumbUrl)
        {
            if (string.IsNullOrWhiteSpace(thumbUrl))
            {
                return null;
            }

            var trimmed = thumbUrl.Trim();
            var mediumUrl = DeriveMediumUrl(trimmed);
            if (mediumUrl == null)
            {
                return null;
            }

            return new ImageVariantsDto
            {
                ThumbUrl = trimmed,
                MediumUrl = mediumUrl
            };
        }

        private static string? DeriveMediumUrl(string thumbUrl)
        {
            if (thumbUrl.Contains(ThumbSegment, StringComparison.OrdinalIgnoreCase))
            {
                return ReplaceIgnoreCase(thumbUrl, ThumbSegment, MediumSegment);
            }

            if (thumbUrl.StartsWith(RelativeThumbSegment, StringComparison.OrdinalIgnoreCase))
            {
                return ReplaceIgnoreCase(thumbUrl, RelativeThumbSegment, RelativeMediumSegment);
            }

            return null;
        }

        private static string ReplaceIgnoreCase(string value, string oldValue, string newValue)
        {
            var index = value.IndexOf(oldValue, StringComparison.OrdinalIgnoreCase);
            return index < 0
                ? value
                : string.Concat(value.AsSpan(0, index), newValue, value.AsSpan(index + oldValue.Length));
        }
    }
}
