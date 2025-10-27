using Asp.Versioning.ApiExplorer;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace EatFitAI.Api;

public class ConfigureSwaggerOptions : IConfigureOptions<SwaggerGenOptions>
{
    private readonly IApiVersionDescriptionProvider _provider;

    public ConfigureSwaggerOptions(IApiVersionDescriptionProvider provider)
    {
        _provider = provider;
    }

    public void Configure(SwaggerGenOptions options)
    {
        foreach (var description in _provider.ApiVersionDescriptions)
        {
            options.SwaggerDoc(description.GroupName, new OpenApiInfo
            {
                Title = "EatFitAI API",
                Version = description.ApiVersion.ToString(),
                Description = "API for EatFitAI - Nutrition and Fitness Tracking Application",
                Contact = new OpenApiContact
                {
                    Name = "EatFitAI Team",
                    Email = "support@eatfitai.com"
                }
            });
        }
    }
}