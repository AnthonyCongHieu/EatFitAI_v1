using EatFitAI.API.Helpers;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Helpers;

public class PrivateNetworkUrlPolicyTests
{
    [Theory]
    [InlineData("http://10.0.1.25:5050")]
    [InlineData("http://172.16.0.10:5050")]
    [InlineData("http://172.31.255.10:5050")]
    [InlineData("http://192.168.1.10:5050")]
    public void IsPrivateHttpUrl_AllowsRfc1918HttpUrls(string value)
    {
        Assert.True(PrivateNetworkUrlPolicy.IsPrivateHttpUrl(value));
    }

    [Theory]
    [InlineData("https://10.0.1.25:5050")]
    [InlineData("http://127.0.0.1:5050")]
    [InlineData("http://0.0.0.0:5050")]
    [InlineData("http://169.254.1.10:5050")]
    [InlineData("http://eatfitai-ai-provider.onrender.com")]
    [InlineData("not a url")]
    public void IsPrivateHttpUrl_RejectsNonInternalHttpUrls(string value)
    {
        Assert.False(PrivateNetworkUrlPolicy.IsPrivateHttpUrl(value));
    }
}
