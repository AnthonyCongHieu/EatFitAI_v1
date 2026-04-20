using EatFitAI.API.Services;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class SupabaseSchemaBootstrapperTests
{
    [Fact]
    public void SchemaSql_IncludesRequiredDriftRepairs()
    {
        Assert.Contains("\"UserPreference\"", SupabaseSchemaBootstrapper.SchemaSql, StringComparison.Ordinal);
        Assert.Contains("\"Allergies\"", SupabaseSchemaBootstrapper.SchemaSql, StringComparison.Ordinal);
        Assert.Contains("\"AILog\"", SupabaseSchemaBootstrapper.SchemaSql, StringComparison.Ordinal);
        Assert.Contains("\"DurationMs\"", SupabaseSchemaBootstrapper.SchemaSql, StringComparison.Ordinal);
        Assert.Contains("IF NOT EXISTS", SupabaseSchemaBootstrapper.SchemaSql, StringComparison.Ordinal);
    }
}
