using EatFitAI.API.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class SchemaBootstrapStartupGateTests
{
    [Fact]
    public void ShouldRunOnStartup_DefaultsFalseInProduction()
    {
        var configuration = BuildConfiguration();
        var environment = new FakeHostEnvironment("Production");

        var shouldRun = SchemaBootstrapStartupGate.ShouldRunOnStartup(configuration, environment);

        Assert.False(shouldRun);
    }

    [Fact]
    public void ShouldRunOnStartup_DefaultsTrueOutsideProduction()
    {
        var configuration = BuildConfiguration();
        var environment = new FakeHostEnvironment("Development");

        var shouldRun = SchemaBootstrapStartupGate.ShouldRunOnStartup(configuration, environment);

        Assert.True(shouldRun);
    }

    [Fact]
    public void ShouldRunOnStartup_UsesExplicitConfiguration()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["SchemaBootstrap:RunOnStartup"] = "true",
        });
        var environment = new FakeHostEnvironment("Production");

        var shouldRun = SchemaBootstrapStartupGate.ShouldRunOnStartup(configuration, environment);

        Assert.True(shouldRun);
    }

    [Fact]
    public void ShouldRunOnStartup_OneShotRequestOverridesProductionDefault()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["SchemaBootstrap:RunOnStartup"] = "false",
        });
        var environment = new FakeHostEnvironment("Production");

        var shouldRun = SchemaBootstrapStartupGate.ShouldRunOnStartup(
            configuration,
            environment,
            oneShotRequested: true);

        Assert.True(shouldRun);
    }

    [Fact]
    public void ShouldAllowRuntimeRepair_DefaultsFalseInProduction()
    {
        var configuration = BuildConfiguration();
        var environment = new FakeHostEnvironment("Production");

        var shouldRun = SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(configuration, environment);

        Assert.False(shouldRun);
    }

    [Fact]
    public void ShouldAllowRuntimeRepair_DefaultsTrueOutsideProduction()
    {
        var configuration = BuildConfiguration();
        var environment = new FakeHostEnvironment("Development");

        var shouldRun = SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(configuration, environment);

        Assert.True(shouldRun);
    }

    [Fact]
    public void ShouldAllowRuntimeRepair_UsesExplicitConfiguration()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["SchemaBootstrap:AllowRuntimeRepair"] = "true",
        });
        var environment = new FakeHostEnvironment("Production");

        var shouldRun = SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(configuration, environment);

        Assert.True(shouldRun);
    }

    [Fact]
    public void ShouldAllowRuntimeRepair_ForceOverridesProductionDefault()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["SchemaBootstrap:AllowRuntimeRepair"] = "false",
        });
        var environment = new FakeHostEnvironment("Production");

        var shouldRun = SchemaBootstrapStartupGate.ShouldAllowRuntimeRepair(
            configuration,
            environment,
            force: true);

        Assert.True(shouldRun);
    }

    private static IConfiguration BuildConfiguration(Dictionary<string, string?>? values = null)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values ?? new Dictionary<string, string?>())
            .Build();
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public FakeHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "EatFitAI";
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
