using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services;

public static class SchemaBootstrapStartupGate
{
    public static bool ShouldRunOnStartup(
        IConfiguration configuration,
        IHostEnvironment environment,
        bool oneShotRequested = false)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        if (oneShotRequested)
        {
            return true;
        }

        var configured = configuration.GetValue<bool?>("SchemaBootstrap:RunOnStartup");
        return configured ?? !environment.IsProduction();
    }
}
