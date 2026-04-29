using EatFitAI.API.Options;
using EatFitAI.API.Services;
using Microsoft.Extensions.Options;
using Xunit;
using OptionsFactory = Microsoft.Extensions.Options.Options;

namespace EatFitAI.API.Tests.Unit.Services
{
    public class MediaUrlResolverTests
    {
        [Theory]
        [InlineData(
            "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/user-food/v2/user-1/thumb/beef.webp",
            "https://media.example.com/user-food/v2/user-1/thumb/beef.webp")]
        [InlineData(
            "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/food-images/v2/thumb/42.webp",
            "https://media.example.com/food-images/v2/thumb/42.webp")]
        public void NormalizePublicUrl_RewritesSupabasePublicStorageUrlToConfiguredMediaBase(
            string url,
            string expected)
        {
            var resolver = CreateResolver("https://media.example.com/");

            var normalized = resolver.NormalizePublicUrl(url);

            Assert.Equal(expected, normalized);
        }

        [Fact]
        public void NormalizePublicUrl_LeavesExternalUrlsUntouched()
        {
            var resolver = CreateResolver("https://media.example.com");

            var normalized = resolver.NormalizePublicUrl("https://cdn.example.net/food.jpg");

            Assert.Equal("https://cdn.example.net/food.jpg", normalized);
        }

        [Fact]
        public void NormalizePublicUrl_DoesNotRewriteWhenMediaBaseIsMissing()
        {
            var resolver = CreateResolver(string.Empty);
            var supabaseUrl = "https://bjlmndmafrajjysenpbm.supabase.co/storage/v1/object/public/user-food/v2/thumb/beef.webp";

            var normalized = resolver.NormalizePublicUrl(supabaseUrl);

            Assert.Equal(supabaseUrl, normalized);
        }

        private static MediaUrlResolver CreateResolver(string publicBaseUrl)
        {
            IOptions<MediaOptions> options = OptionsFactory.Create(new MediaOptions
            {
                PublicBaseUrl = publicBaseUrl
            });

            return new MediaUrlResolver(options);
        }
    }
}
