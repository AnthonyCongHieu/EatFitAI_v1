using EatFitAI.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/mobile/config")]
public sealed class MobileConfigController : ControllerBase
{
    private readonly MobileRuntimeConfigService _configService;

    public MobileConfigController(MobileRuntimeConfigService configService)
    {
        _configService = configService;
    }

    [HttpGet]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any, NoStore = false)]
    public async Task<IActionResult> GetConfig(
        [FromQuery] string? environment = "production",
        [FromQuery] string? platform = "all",
        [FromQuery] string? channel = "production",
        CancellationToken cancellationToken = default)
    {
        var config = await _configService.GetAsync(environment, platform, channel, cancellationToken);
        Response.Headers.ETag = config.ETag;
        Response.Headers.CacheControl = "public, max-age=300";

        var ifNoneMatch = Request.Headers.IfNoneMatch.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(ifNoneMatch)
            && string.Equals(ifNoneMatch.Trim(), config.ETag, StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status304NotModified);
        }

        return Ok(config);
    }
}
