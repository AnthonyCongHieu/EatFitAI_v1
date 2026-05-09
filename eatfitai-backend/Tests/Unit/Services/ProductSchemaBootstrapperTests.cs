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

    [Fact]
    public void SchemaSql_EnablesRlsForRuntimeTables()
    {
        Assert.Contains(@"ALTER TABLE ""WaterIntake"" ENABLE ROW LEVEL SECURITY", ProductSchemaBootstrapper.SchemaSql);
        Assert.Contains(@"ALTER TABLE ""TelemetryEvent"" ENABLE ROW LEVEL SECURITY", ProductSchemaBootstrapper.SchemaSql);
        Assert.Contains(@"ALTER TABLE ""GeminiProviderState"" ENABLE ROW LEVEL SECURITY", ProductSchemaBootstrapper.SchemaSql);
        Assert.Contains(@"ALTER TABLE ""__EFMigrationsHistory"" ENABLE ROW LEVEL SECURITY", ProductSchemaBootstrapper.SchemaSql);
        Assert.Contains(@"REVOKE ALL ON TABLE ""WaterIntake"" FROM anon, authenticated", ProductSchemaBootstrapper.SchemaSql);
        Assert.Contains(@"WaterIntake_authenticated_own_read", ProductSchemaBootstrapper.SchemaSql);
        Assert.Contains(@"TelemetryEvent_authenticated_own_insert", ProductSchemaBootstrapper.SchemaSql);
    }
}
