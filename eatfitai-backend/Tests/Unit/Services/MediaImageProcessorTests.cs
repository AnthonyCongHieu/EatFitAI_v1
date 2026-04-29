using EatFitAI.API.Options;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class MediaImageProcessorTests
    {
        [Fact]
        public async Task CreateVariantsAsync_CreatesSmallWebpThumbAndMedium()
        {
            var processor = new MediaImageProcessor(
                Microsoft.Extensions.Options.Options.Create(new MediaImageOptions()),
                NullLogger<MediaImageProcessor>.Instance);
            await using var stream = new MemoryStream(CreatePngBytes(1600, 900));
            var formFile = new FormFile(stream, 0, stream.Length, "thumbnail", "rice.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };

            var variants = await processor.CreateVariantsAsync(formFile);

            Assert.Equal("image/webp", variants.Thumb.ContentType);
            Assert.Equal("image/webp", variants.Medium.ContentType);
            Assert.True(variants.Thumb.Bytes.Length <= 100 * 1024);
            Assert.True(variants.Medium.Bytes.Length <= 350 * 1024);

            using var thumb = Image.Load(variants.Thumb.Bytes);
            using var medium = Image.Load(variants.Medium.Bytes);
            Assert.True(thumb.Width <= 320);
            Assert.True(medium.Width <= 1080);
        }

        [Fact]
        public async Task CreateVariantsAsync_RejectsFilesLargerThanUploadLimit()
        {
            var processor = new MediaImageProcessor(
                Microsoft.Extensions.Options.Options.Create(new MediaImageOptions { MaxUploadBytes = 8 * 1024 * 1024 }),
                NullLogger<MediaImageProcessor>.Instance);
            await using var stream = new MemoryStream(new byte[(8 * 1024 * 1024) + 1]);
            var formFile = new FormFile(stream, 0, stream.Length, "thumbnail", "too-large.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };

            var ex = await Assert.ThrowsAsync<ArgumentException>(() => processor.CreateVariantsAsync(formFile));

            Assert.Contains("8 MB", ex.Message);
        }

        private static byte[] CreatePngBytes(int width, int height)
        {
            using var image = new Image<Rgba32>(width, height, Color.White);
            image.Mutate(ctx => ctx.BackgroundColor(Color.LightGreen));
            using var output = new MemoryStream();
            image.SaveAsPng(output);
            return output.ToArray();
        }
    }
}
