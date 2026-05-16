using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize]
    public class StorageController : ControllerBase
    {
        private const string DefaultUploadPurpose = "vision";
        private const long DefaultVoiceUploadMaxBytes = 10 * 1024 * 1024;
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
        private readonly MediaImageOptions _mediaImageOptions;
        private readonly ILogger<StorageController> _logger;

        public StorageController(
            IMediaStorageService mediaStorage,
            IOptions<MediaImageOptions> mediaImageOptions,
            ILogger<StorageController> logger)
        {
            _mediaStorage = mediaStorage;
            _mediaImageOptions = mediaImageOptions.Value;
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

        [HttpPost("verify-upload")]
        public async Task<IActionResult> VerifyUpload([FromBody] VerifyUploadRequest request, CancellationToken cancellationToken)
        {
            try
            {
                if (!_mediaStorage.IsConfigured)
                {
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                    {
                        error = "storage_not_configured",
                        message = "Storage is not configured."
                    });
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

                var contentType = NormalizeContentType(request.ContentType);
                if (string.IsNullOrWhiteSpace(contentType) || !allowedContentTypes.Contains(contentType))
                {
                    return BadRequest(new { error = "invalid_content_type", message = "Unsupported content type for this upload purpose." });
                }

                if (!TryResolveScopedObjectPath(request.ObjectKey, purpose, userId.Value, out var objectPath))
                {
                    return BadRequest(new { error = "invalid_object_key", message = "Upload object key is not valid for this user." });
                }

                var metadata = await _mediaStorage.GetObjectMetadataAsync(
                    purpose,
                    objectPath,
                    cancellationToken);

                if (metadata == null)
                {
                    return NotFound(new { error = "upload_not_found", message = "Uploaded object was not found." });
                }

                var uploadedContentType = NormalizeContentType(metadata.ContentType);
                if (!string.Equals(uploadedContentType, contentType, StringComparison.OrdinalIgnoreCase))
                {
                    return Conflict(new
                    {
                        error = "uploaded_content_type_mismatch",
                        expectedContentType = contentType,
                        actualContentType = uploadedContentType
                    });
                }

                if (metadata.ContentLength <= 0)
                {
                    return BadRequest(new { error = "empty_upload", message = "Uploaded object is empty." });
                }

                var maxBytes = GetMaxUploadBytes(purpose);
                if (metadata.ContentLength > maxBytes)
                {
                    return StatusCode(StatusCodes.Status413PayloadTooLarge, new
                    {
                        error = "uploaded_file_too_large",
                        maxBytes,
                        actualBytes = metadata.ContentLength
                    });
                }

                return Ok(new VerifyUploadResponse
                {
                    Verified = true,
                    ObjectKey = $"{purpose}/{objectPath}",
                    ContentType = uploadedContentType,
                    SizeBytes = metadata.ContentLength
                });
            }
            catch (NotSupportedException ex)
            {
                _logger.LogWarning(ex, "Upload verification is not supported by the configured media storage provider.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    error = "upload_verification_not_supported",
                    message = "Upload verification is not supported by the configured storage provider."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to verify uploaded object {ObjectKey}", request.ObjectKey);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "upload_verification_failed",
                    message = "Failed to verify uploaded object."
                });
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

        private static string ResolveUploadPurpose(VerifyUploadRequest request)
        {
            var purpose = request.Purpose ?? DefaultUploadPurpose;
            return purpose.Trim().ToLowerInvariant();
        }

        private static string NormalizeContentType(string? contentType)
        {
            return (contentType ?? string.Empty)
                .Split(';', 2)[0]
                .Trim()
                .ToLowerInvariant();
        }

        private static bool TryResolveScopedObjectPath(
            string? objectKey,
            string purpose,
            Guid userId,
            out string objectPath)
        {
            objectPath = string.Empty;
            if (string.IsNullOrWhiteSpace(objectKey))
            {
                return false;
            }

            string normalizedObjectKey;
            try
            {
                normalizedObjectKey = Uri.UnescapeDataString(objectKey.Trim()).Trim('/');
            }
            catch
            {
                return false;
            }

            if (normalizedObjectKey.Length == 0
                || normalizedObjectKey.Length > 512
                || normalizedObjectKey.Contains('\\')
                || normalizedObjectKey.Contains("//", StringComparison.Ordinal)
                || normalizedObjectKey.Split('/').Any(segment => segment is "." or ".."))
            {
                return false;
            }

            var expectedPrefix = $"{purpose}/";
            if (!normalizedObjectKey.StartsWith(expectedPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            var pathWithoutPurpose = normalizedObjectKey[expectedPrefix.Length..].TrimStart('/');
            var userPrefix = $"{userId:N}/";
            if (!pathWithoutPurpose.StartsWith(userPrefix, StringComparison.Ordinal))
            {
                return false;
            }

            objectPath = pathWithoutPurpose;
            return true;
        }

        private long GetMaxUploadBytes(string purpose)
        {
            return string.Equals(purpose, "voice", StringComparison.OrdinalIgnoreCase)
                ? DefaultVoiceUploadMaxBytes
                : _mediaImageOptions.MaxUploadBytes;
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

    public class VerifyUploadRequest
    {
        public required string ObjectKey { get; init; }
        public required string ContentType { get; init; }
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

    public class VerifyUploadResponse
    {
        public required bool Verified { get; init; }
        public required string ObjectKey { get; init; }
        public required string ContentType { get; init; }
        public required long SizeBytes { get; init; }
    }
}
