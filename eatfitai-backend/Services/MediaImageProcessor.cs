using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace EatFitAI.API.Services
{
    public class MediaImageProcessor : IMediaImageProcessor
    {
        private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        };

        private readonly MediaImageOptions _options;
        private readonly ILogger<MediaImageProcessor> _logger;

        public MediaImageProcessor(
            IOptions<MediaImageOptions> options,
            ILogger<MediaImageProcessor> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        public async Task<MediaImageVariants> CreateVariantsAsync(
            IFormFile file,
            CancellationToken cancellationToken = default)
        {
            ValidateFile(file);

            await using var stream = file.OpenReadStream();
            using var image = await Image.LoadAsync(stream, cancellationToken);
            StripMetadata(image);

            return new MediaImageVariants
            {
                Thumb = await CreateVariantAsync(
                    image,
                    _options.ThumbMaxWidth,
                    _options.ThumbMaxBytes,
                    cancellationToken),
                Medium = await CreateVariantAsync(
                    image,
                    _options.MediumMaxWidth,
                    _options.MediumMaxBytes,
                    cancellationToken)
            };
        }

        private void ValidateFile(IFormFile file)
        {
            if (file.Length <= 0)
            {
                throw new ArgumentException("File ảnh không hợp lệ.");
            }

            if (file.Length > _options.MaxUploadBytes)
            {
                var maxMb = Math.Max(1, _options.MaxUploadBytes / (1024 * 1024));
                throw new ArgumentException($"Kích thước ảnh vượt quá giới hạn {maxMb} MB.");
            }

            var contentType = file.ContentType ?? string.Empty;
            if (!AllowedImageContentTypes.Contains(contentType))
            {
                throw new ArgumentException("Loại ảnh không được hỗ trợ. Chỉ chấp nhận: jpeg, png, webp.");
            }
        }

        private async Task<MediaImageVariant> CreateVariantAsync(
            Image source,
            int maxWidth,
            int maxBytes,
            CancellationToken cancellationToken)
        {
            var targetWidth = Math.Min(source.Width, maxWidth);
            var minWidth = Math.Min(targetWidth, maxWidth <= _options.ThumbMaxWidth ? 160 : 640);
            byte[]? bestBytes = null;
            int bestWidth = targetWidth;
            int bestHeight = Math.Max(1, (int)Math.Round(source.Height * (targetWidth / (double)source.Width)));

            for (var width = targetWidth; width >= minWidth; width = Math.Max(minWidth, (int)Math.Floor(width * 0.85)))
            {
                var height = Math.Max(1, (int)Math.Round(source.Height * (width / (double)source.Width)));
                using var variant = source.Clone(ctx => ctx.Resize(width, height));
                StripMetadata(variant);

                foreach (var quality in QualitySteps())
                {
                    await using var output = new MemoryStream();
                    await variant.SaveAsWebpAsync(
                        output,
                        new WebpEncoder { Quality = quality },
                        cancellationToken);
                    var bytes = output.ToArray();

                    bestBytes = bytes;
                    bestWidth = width;
                    bestHeight = height;

                    if (bytes.Length <= maxBytes)
                    {
                        return BuildVariant(bytes, width, height);
                    }
                }

                if (width == minWidth)
                {
                    break;
                }
            }

            return BuildVariant(bestBytes ?? Array.Empty<byte>(), bestWidth, bestHeight);
        }

        private MediaImageVariant BuildVariant(byte[] bytes, int width, int height)
        {
            _logger.LogDebug(
                "Created media variant Width={Width} Height={Height} Bytes={Bytes}",
                width,
                height,
                bytes.Length);

            return new MediaImageVariant
            {
                Bytes = bytes,
                ContentType = "image/webp"
            };
        }

        private IEnumerable<int> QualitySteps()
        {
            return new[] { _options.WebpQuality, 72, 68, 60, 52, 45 }
                .Where(quality => quality > 0 && quality <= 100)
                .Distinct()
                .OrderByDescending(quality => quality);
        }

        private static void StripMetadata(Image image)
        {
            image.Metadata.ExifProfile = null;
            image.Metadata.IccProfile = null;
            image.Metadata.XmpProfile = null;
        }
    }
}
