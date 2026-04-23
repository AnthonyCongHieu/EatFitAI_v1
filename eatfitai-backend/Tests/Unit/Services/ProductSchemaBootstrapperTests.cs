using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class ProductSchemaBootstrapperTests
{
    [Fact]
    public void SchemaSql_UsesParenthesizedUtcDefaultForTelemetryCreatedAt()
    {
        Assert.Contains(
            @"""CreatedAt"" timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')",
            ProductSchemaBootstrapper.SchemaSql);
    }
}
