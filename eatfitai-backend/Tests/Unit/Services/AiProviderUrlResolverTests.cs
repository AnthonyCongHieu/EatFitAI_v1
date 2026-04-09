using EatFitAI.API.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AiProviderUrlResolverTests
{
    [Fact]
    public void GetVisionBaseUrl_TrimsWhitespaceAndTrailingSlash()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "  https://eatfitai-ai-provider.onrender.com/  ",
            })
            .Build();

        var result = AiProviderUrlResolver.GetVisionBaseUrl(configuration);

        Assert.Equal("https://eatfitai-ai-provider.onrender.com", result);
    }

    [Fact]
    public void GetVoiceBaseUrl_FallsBackToNormalizedVisionBaseUrl()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://eatfitai-ai-provider.onrender.com/ ",
            })
            .Build();

        var result = AiProviderUrlResolver.GetVoiceBaseUrl(configuration);

        Assert.Equal("https://eatfitai-ai-provider.onrender.com", result);
    }

    [Fact]
    public void GetVisionBaseUrl_InvalidValue_Throws()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AIProvider:VisionBaseUrl"] = "https://bad host",
            })
            .Build();

        var ex = Assert.Throws<InvalidOperationException>(() => AiProviderUrlResolver.GetVisionBaseUrl(configuration));

        Assert.Equal("AIProvider:VisionBaseUrl is invalid after normalization.", ex.Message);
    }
}
