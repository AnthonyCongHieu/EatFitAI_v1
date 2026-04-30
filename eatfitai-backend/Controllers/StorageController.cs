using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class StorageController : ControllerBase
    {
        private const string DefaultUploadPurpose = "vision";
        private static readonly Dictionary<string, HashSet<string>> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            ["vision"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "image/jpeg",
                "image/png",
                "image/webp"
            },
            ["voice"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "audio/mp4",
                "audio/mpeg",
                "audio/mp3",
                "audio/wav",
                "audio/x-wav",
                "audio/webm",
                "audio/ogg",
                "audio/flac",
                "audio/x-m4a"
            }
        };

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

                if (string.IsNullOrWhiteSpace(request.Filename) || string.IsNullOrWhiteSpace(request.ContentType))
                {
                    return BadRequest(new { error = "invalid_upload_request", message = "Filename and ContentType are required." });
                }

                var userId = GetUserIdFromToken();
                if (userId == null)
                {
                    return Unauthorized(new { error = "invalid_user" });
                }

                var purpose = ResolveUploadPurpose(request);
                if (!AllowedContentTypes.TryGetValue(purpose, out var allowedContentTypes))
                {
                    return BadRequest(new { error = "invalid_upload_purpose", message = "Unsupported upload purpose." });
                }

                var contentType = request.ContentType.Trim();
                if (!allowedContentTypes.Contains(contentType))
                {
                    return BadRequest(new { error = "invalid_content_type", message = "Unsupported content type for this upload purpose." });
                }

                var uploadId = Guid.NewGuid().ToString("N");
                var safeFilename = GetSafeFileName(request.Filename);
                var objectPath = $"{userId.Value:N}/{DateTime.UtcNow:yyyy/MM/dd}/{uploadId}_{safeFilename}";
                var objectKey = $"{purpose}/{objectPath}";

                var (presignedUrl, publicUrl) = await _mediaStorage.GetPresignedUrlAsync(
                    bucket: purpose,
                    objectPath: objectPath,
                    contentType: contentType,
                    expiresIn: TimeSpan.FromMinutes(15),
                    cancellationToken: cancellationToken);

                return Ok(new PresignedUrlResponse
                {
                    PresignedUrl = presignedUrl,
                    PublicUrl = publicUrl,
                    ObjectKey = objectKey,
                    UploadId = uploadId,
                    ExpiresInSeconds = (int)TimeSpan.FromMinutes(15).TotalSeconds
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate presigned URL for {Filename} in folder {Folder}", request.Filename, request.Folder);
                return StatusCode(StatusCodes.Status500InternalServerError, "Failed to generate presigned URL.");
            }
        }

        private Guid? GetUserIdFromToken()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier");

            return Guid.TryParse(userIdClaim, out var userId)
                ? userId
                : null;
        }

        private static string ResolveUploadPurpose(PresignedUrlRequest request)
        {
            var purpose = request.Purpose ?? request.Folder ?? DefaultUploadPurpose;
            return purpose.Trim().ToLowerInvariant();
        }

        private static string GetSafeFileName(string fileName)
        {
            var safeFileName = Path.GetFileName(fileName.Trim());
            if (string.IsNullOrWhiteSpace(safeFileName))
            {
                return "upload.bin";
            }

            foreach (var invalidChar in Path.GetInvalidFileNameChars())
            {
                safeFileName = safeFileName.Replace(invalidChar, '_');
            }

            return safeFileName.Length <= 120
                ? safeFileName
                : safeFileName[^120..];
        }
    }

    public class PresignedUrlRequest
    {
        public required string Filename { get; init; }
        public required string ContentType { get; init; }
        public string? Folder { get; init; }
        public string? Purpose { get; init; }
    }

    public class PresignedUrlResponse
    {
        public required string PresignedUrl { get; init; }
        public required string PublicUrl { get; init; }
        public required string ObjectKey { get; init; }
        public required string UploadId { get; init; }
        public required int ExpiresInSeconds { get; init; }
    }
}
