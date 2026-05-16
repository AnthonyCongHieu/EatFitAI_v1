using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AdminControlPlaneBootstrapperTests
{
    [Fact]
    public void SchemaSql_EscapesJsonBracesForRawSqlFormatting()
    {
        var formatted = string.Format(
            provider: null,
            format: AdminControlPlaneBootstrapper.SchemaSql,
            args: Array.Empty<object>());

        Assert.Contains(@"DEFAULT '{}'", formatted);
        Assert.Contains(@"""FeatureFlagsJson""", formatted);
        Assert.Contains(@"{""aiScan"":true,""voice"":true,""recipes"":true,""pushCampaigns"":true}", formatted);
    }
}
