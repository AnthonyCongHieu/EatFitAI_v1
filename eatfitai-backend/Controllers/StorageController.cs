using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class StorageController : ControllerBase
    {
        private readonly IMediaStorageService _mediaStorage;
        private readonly ILogger<StorageController> _logger;

        public StorageController(
            IMediaStorageService mediaStorage,
            ILogger<StorageController> logger)
        {
            _mediaStorage = mediaStorage;
            _logger = logger;
        }

        [HttpPost("presigned-url")]
        public async Task<IActionResult> GeneratePresignedUrl([FromBody] PresignedUrlRequest request, CancellationToken cancellationToken)
        {
            try
            {
                if (!_mediaStorage.IsConfigured)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, "Storage is not configured.");
                }

                if (string.IsNullOrWhiteSpace(request.Filename) || string.IsNullOrWhiteSpace(request.ContentType) || string.IsNullOrWhiteSpace(request.Folder))
                {
                    return BadRequest("Filename, ContentType, and Folder are required.");
                }

                // Generate a unique object path to prevent overwrites
                var uniqueFilename = $"{Guid.NewGuid():N}_{Path.GetFileName(request.Filename)}";
                var objectPath = $"{DateTime.UtcNow:yyyy/MM/dd}/{uniqueFilename}";

                var (presignedUrl, publicUrl) = await _mediaStorage.GetPresignedUrlAsync(
                    bucket: request.Folder, // "vision" or "voice"
                    objectPath: objectPath,
                    contentType: request.ContentType,
                    expiresIn: TimeSpan.FromMinutes(15), // URL is valid for 15 minutes
                    cancellationToken: cancellationToken);

                return Ok(new PresignedUrlResponse
                {
                    PresignedUrl = presignedUrl,
                    PublicUrl = publicUrl,
                    ExpiresInSeconds = (int)TimeSpan.FromMinutes(15).TotalSeconds
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate presigned URL for {Filename} in folder {Folder}", request.Filename, request.Folder);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to generate presigned URL.");
            }
        }
    }

    public class PresignedUrlRequest
    {
        public required string Filename { get; init; }
        public required string ContentType { get; init; }
        public required string Folder { get; init; }
    }

    public class PresignedUrlResponse
    {
        public required string PresignedUrl { get; init; }
        public required string PublicUrl { get; init; }
        public required int ExpiresInSeconds { get; init; }
    }
}
