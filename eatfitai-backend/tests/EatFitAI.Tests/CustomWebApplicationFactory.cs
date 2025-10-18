using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace EatFitAI.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((context, configBuilder) =>
        {
            var tempDb = System.IO.Path.Combine(System.IO.Path.GetTempPath(), $"eatfitai_test_{Guid.NewGuid():N}.db");
            var dict = new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = $"Data Source={tempDb}"
            };
            configBuilder.AddInMemoryCollection(dict!);
        });
    }
}
