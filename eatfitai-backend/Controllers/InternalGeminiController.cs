using System.Security.Cryptography;
using System.Text;
using EatFitAI.API.Data;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("internal/gemini")]
public sealed class InternalGeminiController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InternalGeminiController> _logger;

    public InternalGeminiController(
        ApplicationDbContext context,
        IEncryptionService encryptionService,
        IConfiguration configuration,
        ILogger<InternalGeminiController> logger)
    {
        _context = context;
        _encryptionService = encryptionService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("key-pool")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKeyPool(CancellationToken cancellationToken)
    {
        var authFailure = ValidateInternalToken();
        if (authFailure != null)
        {
            return authFailure;
        }

        var keys = await _context.GeminiKeys
            .AsNoTracking()
            .Where(key => key.IsActive)
            .OrderBy(key => key.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<object>(keys.Count);
        foreach (var key in keys)
        {
            string apiKey;
            try
            {
                apiKey = _encryptionService.Decrypt(key.EncryptedApiKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipping Gemini key {GeminiKeyId} because it could not be decrypted.", key.Id);
                continue;
            }

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Skipping Gemini key {GeminiKeyId} because decrypted key is empty.", key.Id);
                continue;
            }

            var rpdLimit = key.RpdLimit > 0 ? key.RpdLimit : key.DailyQuotaLimit;
            result.Add(new
            {
                keyId = key.Id,
                keyName = key.KeyName,
                apiKey,
                model = key.Model,
                rpmLimit = key.RpmLimit > 0 ? key.RpmLimit : 5,
                tpmLimit = key.TpmLimit > 0 ? key.TpmLimit : 250000,
                rpdLimit = rpdLimit > 0 ? rpdLimit : 20,
                enabled = key.IsActive
            });
        }

        return Ok(new { keys = result });
    }

    private IActionResult? ValidateInternalToken()
    {
        var expected = _configuration["AIProvider:InternalToken"]?.Trim();
        if (string.IsNullOrWhiteSpace(expected))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { error = "internal_token_not_configured" });
        }

        var provided = Request.Headers[AiProviderRequestHelper.InternalTokenHeader].ToString().Trim();
        if (string.IsNullOrWhiteSpace(provided) || !FixedTimeEquals(provided, expected))
        {
            return Unauthorized(new { error = "invalid_internal_token" });
        }

        return null;
    }

    private static bool FixedTimeEquals(string provided, string expected)
    {
        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return providedBytes.Length == expectedBytes.Length
            && CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }
}
