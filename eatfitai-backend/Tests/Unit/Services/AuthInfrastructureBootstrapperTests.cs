using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AuthInfrastructureBootstrapperTests
{
    [Fact]
    public void SchemaSql_LocksDownPasswordResetCodesWithRls()
    {
        Assert.Contains(
            @"ALTER TABLE ""PasswordResetCode"" ENABLE ROW LEVEL SECURITY",
            AuthInfrastructureBootstrapper.SchemaSql);
        Assert.Contains(
            @"REVOKE ALL ON TABLE ""PasswordResetCode"" FROM anon, authenticated",
            AuthInfrastructureBootstrapper.SchemaSql);
    }
}
