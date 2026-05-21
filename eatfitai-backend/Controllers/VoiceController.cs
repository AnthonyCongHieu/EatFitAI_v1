/**
 * Voice Controller
 * API endpoints for Voice AI feature
 * Supports voice parsing and executing commands (ADD_FOOD to MealDiary)
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EatFitAI.API.Helpers;
using EatFitAI.DTOs;
using EatFitAI.API.DTOs.Food;
using EatFitAI.API.DTOs.MealDiary;
using EatFitAI.Services;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using System.Globalization;
using System.Security.Claims;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.RateLimiting;

namespace EatFitAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("AIPolicy")]
    public class VoiceController : ControllerBase
    {
        private readonly IVoiceProcessingService _voiceService;
        private readonly IFoodService _foodService;
        private readonly IMealDiaryService _mealDiaryService;
        private readonly IUserService _userService;
        private readonly IAnalyticsService _analyticsService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<VoiceController> _logger;
        private readonly IBusinessDateService _businessDateService;
        private readonly IAiUsageQuotaService _aiUsageQuota;
        private const double VoiceReviewConfidenceThreshold = 0.75;
        private const decimal MinVoiceFoodGrams = 1m;
        private const decimal MaxVoiceFoodGrams = 5000m;
        private const decimal MinVoiceWeightKg = 20m;
        private const decimal MaxVoiceWeightKg = 300m;
        private static readonly HashSet<string> AllowedVoiceAudioExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".aac",
            ".flac",
            ".m4a",
            ".mp3",
            ".ogg",
            ".wav",
            ".webm"
        };

        private static readonly JsonSerializerOptions VoiceParseSerializerOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new JsonStringEnumConverter() }
        };

        public VoiceController(
            IVoiceProcessingService voiceService,
            IFoodService foodService,
            IMealDiaryService mealDiaryService,
            IUserService userService,
            IAnalyticsService analyticsService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<VoiceController> logger,
            IBusinessDateService businessDateService,
            IAiUsageQuotaService aiUsageQuota)
        {
            _voiceService = voiceService;
            _foodService = foodService;
            _mealDiaryService = mealDiaryService;
            _userService = userService;
            _analyticsService = analyticsService;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _businessDateService = businessDateService;
            _aiUsageQuota = aiUsageQuota;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        private string GetVoiceProviderBaseUrl()
        {
            return AiProviderUrlResolver.GetVoiceBaseUrl(_configuration);
        }

        private ObjectResult BuildQuotaExceededResponse(AiUsageQuotaExceededException ex)
        {
            Response.Headers["Retry-After"] = Math.Max(
                    1,
                    (int)Math.Ceiling((ex.Feature.ResetAtUtc - DateTime.UtcNow).TotalSeconds))
                .ToString(System.Globalization.CultureInfo.InvariantCulture);

            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                success = false,
                error = "ai_quota_exceeded",
                message = "Bạn đã dùng hết lượt xử lý giọng nói hôm nay. Vui lòng thử lại sau.",
                featureKey = ex.Feature.Key,
                featureLabel = ex.Feature.Label,
                limit = ex.Feature.Limit,
                used = ex.Feature.Used,
                remaining = ex.Feature.Remaining,
                resetAtUtc = ex.Feature.ResetAtUtc,
                requestId = HttpContext.TraceIdentifier,
            });
        }

        private bool TryResolveVoiceObjectKey(
            TranscribeRequest input,
            Guid userId,
            out string objectKey)
        {
            objectKey = string.Empty;
            var requestedObjectKey = input.ObjectKey;

            if (string.IsNullOrWhiteSpace(requestedObjectKey)
                && !string.IsNullOrWhiteSpace(input.AudioUrl)
                && !TryExtractObjectKeyFromConfiguredMediaUrl(input.AudioUrl, out requestedObjectKey))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(requestedObjectKey)
                || !TryNormalizeObjectKey(requestedObjectKey, out var normalizedObjectKey)
                || !IsUserVoiceObjectKey(normalizedObjectKey, userId))
            {
                return false;
            }

            objectKey = normalizedObjectKey;
            return true;
        }

        private bool TryExtractObjectKeyFromConfiguredMediaUrl(string mediaUrl, out string objectKey)
        {
            objectKey = string.Empty;

            if (!TryGetPublicMediaBaseUri(out var baseUri)
                || !Uri.TryCreate(mediaUrl.Trim(), UriKind.Absolute, out var uri)
                || !string.Equals(uri.Scheme, baseUri.Scheme, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(uri.Host, baseUri.Host, StringComparison.OrdinalIgnoreCase)
                || uri.Port != baseUri.Port
                || !string.IsNullOrEmpty(uri.Query)
                || !string.IsNullOrEmpty(uri.Fragment))
            {
                return false;
            }

            var basePath = baseUri.AbsolutePath.EndsWith("/", StringComparison.Ordinal)
                ? baseUri.AbsolutePath
                : $"{baseUri.AbsolutePath}/";

            if (!uri.AbsolutePath.StartsWith(basePath, StringComparison.Ordinal))
            {
                return false;
            }

            objectKey = Uri.UnescapeDataString(uri.AbsolutePath[basePath.Length..]).TrimStart('/');
            return true;
        }

        private bool TryBuildPublicMediaUrl(string objectKey, out string mediaUrl)
        {
            mediaUrl = string.Empty;
            if (!TryGetPublicMediaBaseUri(out var baseUri))
            {
                return false;
            }

            var encodedObjectKey = Uri.EscapeDataString(objectKey)
                .Replace("%2F", "/", StringComparison.Ordinal);
            mediaUrl = $"{baseUri.ToString().TrimEnd('/')}/{encodedObjectKey}";
            return true;
        }

        private bool TryGetPublicMediaBaseUri(out Uri baseUri)
        {
            baseUri = null!;
            var publicBaseUrl = _configuration["Media:PublicBaseUrl"];

            if (string.IsNullOrWhiteSpace(publicBaseUrl)
                || !Uri.TryCreate(publicBaseUrl.Trim().TrimEnd('/') + "/", UriKind.Absolute, out var parsedBaseUri)
                || !string.Equals(parsedBaseUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            baseUri = parsedBaseUri;
            return true;
        }

        private static bool TryNormalizeObjectKey(string value, out string objectKey)
        {
            objectKey = string.Empty;
            try
            {
                objectKey = Uri.UnescapeDataString(value.Trim()).Trim('/');
            }
            catch (Exception)
            {
                return false;
            }

            if (objectKey.Length == 0
                || objectKey.Length > 512
                || objectKey.Contains('\\')
                || objectKey.Contains("//", StringComparison.Ordinal)
                || objectKey.Split('/').Any(segment => segment is "." or ".."))
            {
                objectKey = string.Empty;
                return false;
            }

            return true;
        }

        private static bool IsUserVoiceObjectKey(string objectKey, Guid userId)
        {
            return objectKey.StartsWith($"voice/{userId:N}/", StringComparison.Ordinal)
                && AllowedVoiceAudioExtensions.Contains(Path.GetExtension(objectKey));
        }

        /// <summary>
        /// Proxy voice text parsing to external AI provider.
        /// </summary>
        [HttpPost("parse")]
        public async Task<IActionResult> ParseWithProvider(
            [FromBody] VoiceProcessRequest request,
            CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "Bạn chưa đăng nhập" });
            }

            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest(new { error = "Vui lòng nhập văn bản" });
            }

            try
            {
                var ruleCommand = await _voiceService.ParseCommandAsync(request.Text, request.Language);
                if (!ShouldUseRuleFallback(ruleCommand))
                {
                    return Ok(PrepareParsedCommand(
                        ruleCommand,
                        request.Text,
                        "backend-rule-parser"));
                }

                await _aiUsageQuota.EnsureCanUseAsync(
                    userId,
                    AiUsageQuotaFeatureKeys.VoiceParse,
                    cancellationToken);

                var providerUrl = $"{GetVoiceProviderBaseUrl().TrimEnd('/')}/voice/parse";

                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                var payload = JsonSerializer.Serialize(new
                {
                    text = request.Text,
                    language = string.IsNullOrWhiteSpace(request.Language) ? "vi" : request.Language
                });

                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var providerRequest = new HttpRequestMessage(HttpMethod.Post, providerUrl)
                {
                    Content = content
                };
                AiProviderRequestHelper.AddInternalTokenHeader(providerRequest, _configuration, _logger);
                using var response = await client.SendAsync(providerRequest, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    var providerCommand = DeserializeParsedVoiceCommand(responseBody);
                    if (ShouldUseRuleFallback(providerCommand))
                    {
                        _logger.LogWarning(
                            "Voice parse proxy returned incomplete result for user {UserId}. Body={Body}",
                            userId,
                            responseBody);

                        var fallbackCommand = await BuildFallbackCommandAsync(
                            request,
                            "backend-rule-fallback",
                            "Ứng dụng đã nhận diện bằng chế độ dự phòng. Vui lòng kiểm tra trước khi lưu.");

                        return Ok(fallbackCommand);
                    }

                    _logger.LogInformation("Voice parse proxy succeeded for user {UserId}", userId);
                    var parsedCommand = PrepareParsedCommand(providerCommand, request.Text, "ai-provider-proxy");
                    await _aiUsageQuota.RecordUsageAsync(
                        userId,
                        AiUsageQuotaFeatureKeys.VoiceParse,
                        new { TextLength = request.Text.Length, request.Language },
                        new { parsedCommand.Intent, parsedCommand.Confidence, parsedCommand.Source },
                        cancellationToken: cancellationToken);
                    return Ok(parsedCommand);
                }

                _logger.LogWarning(
                    "Voice parse proxy failed for user {UserId}. Status={StatusCode}, Body={Body}",
                    userId,
                    (int)response.StatusCode,
                    responseBody);

                if (AiProviderRequestHelper.IsInternalAuthFailure(response.StatusCode, responseBody))
                {
                    return StatusCode(
                        StatusCodes.Status503ServiceUnavailable,
                        ErrorResponseHelper.SafeError(
                            "voice_provider_auth_error",
                            "Tính năng giọng nói đang được bảo trì. Vui lòng thử lại sau.",
                            HttpContext));
                }

                var providerErrorFallback = await BuildFallbackCommandAsync(
                    request,
                    "backend-rule-fallback",
                    "Ứng dụng đã nhận diện bằng chế độ dự phòng. Vui lòng kiểm tra trước khi lưu.");
                return Ok(providerErrorFallback);
            }
            catch (AiUsageQuotaExceededException ex)
            {
                return BuildQuotaExceededResponse(ex);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Voice parse proxy could not reach AI provider");
                var fallbackCommand = await BuildFallbackCommandAsync(
                    request,
                    "backend-rule-fallback",
                    "Ứng dụng đã nhận diện bằng chế độ dự phòng. Vui lòng kiểm tra trước khi lưu.");
                return Ok(fallbackCommand);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "Voice parse proxy timed out");
                var fallbackCommand = await BuildFallbackCommandAsync(
                    request,
                    "backend-rule-fallback",
                    "Ứng dụng đã nhận diện bằng chế độ dự phòng. Vui lòng kiểm tra trước khi lưu.");
                return Ok(fallbackCommand);
            }
        }

        private async Task<ParsedVoiceCommand> BuildFallbackCommandAsync(
            VoiceProcessRequest request,
            string source,
            string reviewReason)
        {
            var fallbackCommand = await _voiceService.ParseCommandAsync(request.Text, request.Language);
            return PrepareParsedCommand(fallbackCommand, request.Text, source, reviewReason);
        }

        private static ParsedVoiceCommand? DeserializeParsedVoiceCommand(string responseBody)
        {
            if (string.IsNullOrWhiteSpace(responseBody))
            {
                return null;
            }

            try
            {
                return JsonSerializer.Deserialize<ParsedVoiceCommand>(responseBody, VoiceParseSerializerOptions);
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static bool ShouldUseRuleFallback(ParsedVoiceCommand? command)
        {
            if (command is null)
            {
                return true;
            }

            if (command.Intent == VoiceIntent.UNKNOWN)
            {
                return true;
            }

            return command.Intent switch
            {
                VoiceIntent.ADD_FOOD => !HasAddFoodEntities(command),
                VoiceIntent.LOG_WEIGHT => command.Entities?.Weight is null,
                VoiceIntent.ADD_NOTE => string.IsNullOrWhiteSpace(command.Entities?.NoteText),
                _ => false
            };
        }

        private static bool HasAddFoodEntities(ParsedVoiceCommand command)
        {
            if (command.Entities is null)
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(command.Entities.FoodName))
            {
                return true;
            }

            return command.Entities.Foods?.Any(food => !string.IsNullOrWhiteSpace(food?.FoodName)) == true;
        }

        private static ParsedVoiceCommand PrepareParsedCommand(
            ParsedVoiceCommand? command,
            string requestText,
            string source,
            string? reviewReason = null)
        {
            var normalized = command ?? new ParsedVoiceCommand
            {
                Intent = VoiceIntent.UNKNOWN,
            };

            normalized.Entities ??= new VoiceCommandEntities();
            normalized.RawText = string.IsNullOrWhiteSpace(normalized.RawText)
                ? requestText
                : normalized.RawText;
            normalized.Source = string.IsNullOrWhiteSpace(normalized.Source)
                ? source
                : normalized.Source;
            normalized.ReviewRequired = RequiresExplicitReview(normalized);
            normalized.ReviewReason = ResolveReviewReason(normalized, reviewReason);

            return normalized;
        }

        private static bool RequiresExplicitReview(ParsedVoiceCommand command)
        {
            if (command.Intent == VoiceIntent.UNKNOWN ||
                command.Intent == VoiceIntent.ASK_CALORIES ||
                command.Intent == VoiceIntent.ASK_NUTRITION ||
                command.Intent == VoiceIntent.QUERY_MEAL)
            {
                return false;
            }

            if (command.ReviewRequired)
            {
                return true;
            }

            if (command.Intent is VoiceIntent.ADD_FOOD or VoiceIntent.LOG_WEIGHT or VoiceIntent.REPEAT_MEAL or VoiceIntent.ADD_NOTE)
            {
                return true;
            }

            return command.Confidence <= 0 || command.Confidence < VoiceReviewConfidenceThreshold;
        }

        private static string? ResolveReviewReason(ParsedVoiceCommand command, string? reviewReason)
        {
            if (!string.IsNullOrWhiteSpace(command.ReviewReason))
            {
                return command.ReviewReason;
            }

            if (!string.IsNullOrWhiteSpace(reviewReason))
            {
                return reviewReason;
            }

            if (command.Intent == VoiceIntent.UNKNOWN ||
                command.Intent == VoiceIntent.ASK_CALORIES ||
                command.Intent == VoiceIntent.ASK_NUTRITION ||
                command.Intent == VoiceIntent.QUERY_MEAL)
            {
                return null;
            }

            if (command.Confidence <= 0 || command.Confidence < VoiceReviewConfidenceThreshold)
            {
                return "Độ tin cậy chưa cao. Hãy kiểm tra trước khi lưu.";
            }

            return "Vui lòng kiểm tra lại thông tin trước khi lưu.";
        }

    public class TranscribeRequest
    {
        public string? AudioUrl { get; set; }
        public string? ObjectKey { get; set; }
        public string? UploadId { get; set; }
    }

        /// <summary>
        /// Proxy audio transcription to external AI provider.
        /// </summary>
        [HttpPost("transcribe")]
        public async Task<IActionResult> TranscribeWithProvider(
            [FromBody] TranscribeRequest request,
            CancellationToken cancellationToken)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "Bạn chưa đăng nhập" });
            }

            if (!TryResolveVoiceObjectKey(request, userId, out var objectKey))
            {
                return BadRequest(new
                {
                    success = false,
                    error = "invalid_audio_reference",
                    message = "Tham chiếu audio không hợp lệ."
                });
            }

            if (!TryBuildPublicMediaUrl(objectKey, out var audioUrl))
            {
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    success = false,
                    error = "media_storage_not_configured",
                    message = "Kho media chưa được cấu hình an toàn.",
                    requestId = HttpContext.TraceIdentifier,
                });
            }

            try
            {
                await _aiUsageQuota.EnsureCanUseAsync(
                    userId,
                    AiUsageQuotaFeatureKeys.VoiceTranscribe,
                    cancellationToken);

                var providerUrl = $"{GetVoiceProviderBaseUrl().TrimEnd('/')}/voice/transcribe";
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(120);

                var payload = new { audio_url = audioUrl };
                var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

                using var providerRequest = new HttpRequestMessage(HttpMethod.Post, providerUrl)
                {
                    Content = content
                };
                AiProviderRequestHelper.AddInternalTokenHeader(providerRequest, _configuration, _logger);
                using var response = await client.SendAsync(providerRequest, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Voice transcribe proxy failed for user {UserId}. Status={StatusCode}, Body={Body}",
                        userId,
                        (int)response.StatusCode,
                        responseBody);

                    if (AiProviderRequestHelper.IsInternalAuthFailure(response.StatusCode, responseBody))
                    {
                        return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                        {
                            success = false,
                            error = "voice_provider_auth_error",
                            message = "Tính năng giọng nói đang được bảo trì. Vui lòng thử lại sau.",
                            requestId = HttpContext.TraceIdentifier,
                        });
                    }

                    return StatusCode((int)response.StatusCode, new
                    {
                        success = false,
                        error = "voice_provider_error",
                        message = "Tính năng giọng nói chưa xử lý được yêu cầu này. Vui lòng thử lại.",
                        requestId = HttpContext.TraceIdentifier,
                    });
                }

                _logger.LogInformation(
                    "Voice transcribe proxy succeeded for user {UserId} with object {ObjectKey}",
                    userId,
                    objectKey);

                await _aiUsageQuota.RecordUsageAsync(
                    userId,
                    AiUsageQuotaFeatureKeys.VoiceTranscribe,
                    new { ObjectKey = objectKey, request.UploadId },
                    new { ResponseBytes = responseBody.Length },
                    cancellationToken: cancellationToken);

                return Content(
                    responseBody,
                    response.Content.Headers.ContentType?.ToString() ?? "application/json");
            }
            catch (AiUsageQuotaExceededException ex)
            {
                return BuildQuotaExceededResponse(ex);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Voice transcribe proxy could not reach AI provider");
                return StatusCode(503, new
                {
                    success = false,
                    error = "voice_provider_unavailable",
                    message = "AI giọng nói hiện không khả dụng.",
                    requestId = HttpContext.TraceIdentifier,
                });
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "Voice transcribe proxy timed out");
                return StatusCode(504, new
                {
                    success = false,
                    error = "voice_provider_timeout",
                    message = "AI giọng nói phản hồi quá chậm.",
                    requestId = HttpContext.TraceIdentifier,
                });
            }
        }

        /// <summary>
        /// Process voice text and parse intent
        /// </summary>
        [HttpPost("process")]
        public async Task<ActionResult<VoiceProcessResponse>> ProcessVoiceText([FromBody] VoiceProcessRequest request)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Bạn chưa đăng nhập" });
            }

            try
            {
                if (string.IsNullOrWhiteSpace(request.Text))
                {
                    return BadRequest(new VoiceProcessResponse { Success = false, Error = "Văn bản không được để trống" });
                }

                _logger.LogInformation("Processing voice text for user {UserId}: {Text}", userId, request.Text);
                var command = PrepareParsedCommand(
                    await _voiceService.ParseCommandAsync(request.Text, request.Language),
                    request.Text,
                    "backend-rule-parser");

                return Ok(new VoiceProcessResponse
                {
                    Success = command.Intent != VoiceIntent.UNKNOWN,
                    Command = command,
                    Error = command.Intent == VoiceIntent.UNKNOWN ? "Không hiểu lệnh. Hãy thử lại với cách nói khác." : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing voice text");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "Chưa xử lý được yêu cầu giọng nói. Vui lòng thử lại." });
            }
        }

        /// <summary>
        /// Get supported voice commands
        /// </summary>
        [HttpGet("commands")]
        [AllowAnonymous]
        public ActionResult<object> GetSupportedCommands()
        {
            return Ok(new
            {
                supportedIntents = new[]
                {
                    new { intent = "ADD_FOOD", description = "Thêm món ăn", examples = new[] { "thêm 1 bát cơm 100g bữa trưa", "ghi phở bò bữa sáng" } },
                    new { intent = "LOG_WEIGHT", description = "Ghi cân nặng", examples = new[] { "cân nặng 65 kg" } },
                    new { intent = "ASK_CALORIES", description = "Hỏi calo", examples = new[] { "hôm nay bao nhiêu calo" } }
                },
                supportedLanguages = new[] { "vi" }
            });
        }

        [HttpPost("review")]
        public async Task<ActionResult<VoiceReviewDraft>> ReviewCommand([FromBody] ParsedVoiceCommand command)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "Bạn chưa đăng nhập" });
            }

            try
            {
                var preparedCommand = PrepareParsedCommand(
                    command,
                    command.RawText,
                    command.Source ?? "voice-review");

                var draft = preparedCommand.Intent switch
                {
                    VoiceIntent.ADD_FOOD => await BuildAddFoodReviewDraftAsync(userId, preparedCommand),
                    VoiceIntent.REPEAT_MEAL => await BuildRepeatMealReviewDraftAsync(userId, preparedCommand),
                    VoiceIntent.ADD_NOTE => await BuildNoteReviewDraftAsync(userId, preparedCommand),
                    VoiceIntent.LOG_WEIGHT => await BuildWeightReviewDraftAsync(userId, preparedCommand),
                    VoiceIntent.ASK_CALORIES => await BuildAskCaloriesDraftAsync(userId, preparedCommand),
                    _ => new VoiceReviewDraft
                    {
                        Intent = preparedCommand.Intent,
                        RawText = preparedCommand.RawText,
                        Source = preparedCommand.Source,
                        Confidence = preparedCommand.Confidence,
                        ReviewRequired = preparedCommand.ReviewRequired,
                        ReviewReason = preparedCommand.ReviewReason,
                        CanSave = false,
                        BlockingReason = "Không hỗ trợ lệnh này."
                    }
                };

                return Ok(draft);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error building voice review draft for user {UserId}", userId);
                return StatusCode(500, new { error = "Chưa chuẩn bị được thông tin để lưu. Vui lòng thử lại." });
            }
        }

        [HttpPost("commit")]
        public async Task<ActionResult<VoiceProcessResponse>> CommitReview([FromBody] VoiceReviewDraft draft)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Bạn chưa đăng nhập" });
            }

            try
            {
                return draft.Intent switch
                {
                    VoiceIntent.ADD_FOOD => await CommitAddFoodReviewAsync(userId, draft),
                    VoiceIntent.REPEAT_MEAL => await CommitRepeatMealReviewAsync(userId, draft),
                    VoiceIntent.ADD_NOTE => await CommitNoteReviewAsync(userId, draft),
                    VoiceIntent.LOG_WEIGHT => await CommitWeightReviewAsync(userId, draft),
                    _ => BadRequest(new VoiceProcessResponse
                    {
                        Success = false,
                        Error = "Không hỗ trợ lưu lệnh này."
                    })
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error committing voice review draft for user {UserId}", userId);
                return StatusCode(500, new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Chưa lưu được thông tin. Vui lòng thử lại."
                });
            }
        }

        private async Task<VoiceReviewDraft> BuildAddFoodReviewDraftAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var reviewDate = command.Entities.Date
                ?? (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
            var mealType = command.Entities.MealType ?? await InferMealTypeByTimeAsync(userId);
            var draft = CreateBaseReviewDraft(command);
            draft.MealType = mealType;
            draft.Date = reviewDate;

            var foods = GetCommandFoodItems(command);
            if (foods.Count == 0)
            {
                draft.Warnings.Add("Không tìm thấy tên món ăn trong lệnh.");
            }

            for (var index = 0; index < foods.Count; index++)
            {
                var food = foods[index];
                var itemWarnings = new List<string>();
                var grams = ResolveVoiceFoodGrams(food, itemWarnings);
                var candidates = await SearchVoiceCandidatesAsync(userId, food.FoodName ?? string.Empty);
                var selectedCandidate = candidates.FirstOrDefault();

                if (string.IsNullOrWhiteSpace(food.FoodName))
                {
                    itemWarnings.Add("Thiếu tên món ăn.");
                }

                if (!IsValidFoodGrams(grams))
                {
                    itemWarnings.Add("Khẩu phần phải từ 1g đến 5000g.");
                }

                if (selectedCandidate is null)
                {
                    itemWarnings.Add("Không tìm thấy món phù hợp trong dữ liệu.");
                }

                var reviewItem = new VoiceReviewItem
                {
                    ClientId = $"item-{index + 1}",
                    HeardText = food.FoodName ?? string.Empty,
                    FoodName = food.FoodName ?? string.Empty,
                    Grams = grams,
                    Quantity = food.Quantity,
                    Unit = food.Unit,
                    SelectedCandidate = selectedCandidate,
                    Candidates = candidates,
                    Warnings = itemWarnings
                };

                draft.Items.Add(reviewItem);
            }

            draft.Totals = CalculateVoiceTotals(draft.Items);
            ApplyDraftSaveState(draft);
            return draft;
        }

        private async Task<VoiceReviewDraft> BuildRepeatMealReviewDraftAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var sourceDate = await ResolveVoiceDateAsync(
                userId,
                command.Entities.SourceDate,
                command.Entities.SourceDateOffsetDays ?? -1);
            var targetDate = await ResolveVoiceDateAsync(
                userId,
                command.Entities.TargetDate,
                command.Entities.TargetDateOffsetDays ?? 0);
            var mealType = command.Entities.MealType;
            var draft = CreateBaseReviewDraft(command);
            draft.Intent = VoiceIntent.REPEAT_MEAL;
            draft.MealType = mealType;
            draft.SourceDate = sourceDate;
            draft.TargetDate = targetDate;
            draft.Date = targetDate;

            var sourceEntries = (await _mealDiaryService.GetUserMealDiariesAsync(userId, sourceDate))
                .Where(entry => !mealType.HasValue || entry.MealTypeId == ParseMealTypeEnum(mealType))
                .OrderBy(entry => entry.CreatedAt)
                .ToList();

            if (sourceEntries.Count == 0)
            {
                draft.Warnings.Add("Chưa có món phù hợp trong bữa đã chọn để thêm lại.");
            }

            for (var index = 0; index < sourceEntries.Count; index++)
            {
                var entry = sourceEntries[index];
                var foodName = ResolveMealEntryName(entry);
                var itemWarnings = new List<string>();
                VoiceFoodCandidate? selectedCandidate = null;

                if (entry.FoodItemId.HasValue)
                {
                    selectedCandidate = new VoiceFoodCandidate
                    {
                        Id = entry.FoodItemId.Value,
                        Source = "catalog",
                        Name = foodName,
                        CaloriesPer100 = SafePer100(entry.Calories, entry.Grams),
                        ProteinPer100 = SafePer100(entry.Protein, entry.Grams),
                        CarbPer100 = SafePer100(entry.Carb, entry.Grams),
                        FatPer100 = SafePer100(entry.Fat, entry.Grams),
                        MatchScore = 1
                    };
                }
                else
                {
                    itemWarnings.Add("Món này chưa thể thêm lại vì thiếu dữ liệu dinh dưỡng.");
                }

                draft.Items.Add(new VoiceReviewItem
                {
                    ClientId = $"repeat-{index + 1}",
                    HeardText = foodName,
                    FoodName = foodName,
                    Grams = entry.Grams,
                    SelectedCandidate = selectedCandidate,
                    Candidates = selectedCandidate is null ? new List<VoiceFoodCandidate>() : new List<VoiceFoodCandidate> { selectedCandidate },
                    Warnings = itemWarnings
                });
            }

            draft.Totals = CalculateVoiceTotals(draft.Items);
            ApplyDraftSaveState(draft);
            return draft;
        }

        private async Task<VoiceReviewDraft> BuildNoteReviewDraftAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var noteDate = await ResolveVoiceDateAsync(
                userId,
                command.Entities.Date,
                command.Entities.DateOffsetDays ?? 0);
            var draft = CreateBaseReviewDraft(command);
            draft.Intent = VoiceIntent.ADD_NOTE;
            draft.Date = noteDate;
            draft.MealType = command.Entities.MealType;
            draft.Note = new VoiceNoteReview
            {
                TargetKind = command.Entities.MealType.HasValue ? "meal" : "day",
                NoteText = (command.Entities.NoteText ?? string.Empty).Trim()
            };

            if (string.IsNullOrWhiteSpace(draft.Note.NoteText))
            {
                draft.Warnings.Add("Ghi chú đang trống.");
            }

            draft.CanSave = !string.IsNullOrWhiteSpace(draft.Note.NoteText);
            draft.BlockingReason = draft.CanSave ? null : draft.Warnings.FirstOrDefault();
            return draft;
        }

        private async Task<VoiceReviewDraft> BuildWeightReviewDraftAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var draft = CreateBaseReviewDraft(command);
            var newWeight = command.Entities.Weight ?? 0;
            decimal? currentWeight = null;

            try
            {
                currentWeight = (await _userService.GetUserProfileAsync(userId))?.CurrentWeightKg;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load current weight for voice review user {UserId}", userId);
                draft.Warnings.Add("Không thể lấy cân nặng hiện tại, nhưng vẫn có thể kiểm tra số mới.");
            }

            draft.Weight = new VoiceWeightReview
            {
                CurrentWeight = currentWeight,
                NewWeight = newWeight,
                NoteText = command.Entities.NoteText
            };

            if (!IsValidWeight(newWeight))
            {
                draft.Warnings.Add("Cân nặng phải từ 20kg đến 300kg.");
            }

            ApplyDraftSaveState(draft);
            return draft;
        }

        private async Task<VoiceReviewDraft> BuildAskCaloriesDraftAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var draft = CreateBaseReviewDraft(command);
            var today = command.Entities.Date
                ?? (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
            var daySummary = await _analyticsService.GetDaySummaryWithMealsAsync(userId, today);

            draft.Date = today;
            draft.Totals = new VoiceNutritionTotals
            {
                Calories = daySummary.TotalCalories,
            };
            draft.CanSave = false;
            draft.BlockingReason = null;
            return draft;
        }

        private async Task<ActionResult<VoiceProcessResponse>> CommitAddFoodReviewAsync(
            Guid userId,
            VoiceReviewDraft draft,
            string actionType = "ADD_FOOD",
            string sourceMethod = "voice")
        {
            if (draft.Items is null || draft.Items.Count == 0)
            {
                return BadRequest(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Không có món ăn để lưu."
                });
            }

            var mealTypeId = ParseMealTypeEnum(draft.MealType);
            var eatenDate = draft.Date
                ?? (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
            var addedFoods = new List<string>();
            decimal totalCalories = 0;
            decimal totalProtein = 0;
            decimal totalCarb = 0;
            decimal totalFat = 0;

            foreach (var item in draft.Items)
            {
                if (!IsValidFoodGrams(item.Grams))
                {
                    return BadRequest(new VoiceProcessResponse
                    {
                        Success = false,
                        Error = "Khẩu phần phải từ 1g đến 5000g."
                    });
                }

                var candidate = await ResolveVoiceCandidateForCommitAsync(userId, item);
                if (candidate is null)
                {
                    return BadRequest(new VoiceProcessResponse
                    {
                        Success = false,
                        Error = $"Không tìm thấy món '{item.FoodName}' để lưu."
                    });
                }

                var factor = item.Grams / 100m;
                var calories = Math.Round(candidate.CaloriesPer100 * factor, 1);
                var protein = Math.Round(candidate.ProteinPer100 * factor, 1);
                var carb = Math.Round(candidate.CarbPer100 * factor, 1);
                var fat = Math.Round(candidate.FatPer100 * factor, 1);

                var createRequest = new CreateMealDiaryRequest
                {
                    EatenDate = eatenDate,
                    MealTypeId = mealTypeId,
                    FoodItemId = string.Equals(candidate.Source, "catalog", StringComparison.OrdinalIgnoreCase)
                        ? candidate.Id
                        : null,
                    UserFoodItemId = string.Equals(candidate.Source, "user", StringComparison.OrdinalIgnoreCase)
                        ? candidate.Id
                        : null,
                    Grams = item.Grams,
                    Calories = calories,
                    Protein = protein,
                    Carb = carb,
                    Fat = fat,
                    Note = $"Ghi bằng giọng nói: {draft.RawText}",
                    SourceMethod = sourceMethod
                };

                await _mealDiaryService.CreateMealDiaryAsync(userId, createRequest);
                addedFoods.Add($"{candidate.FoodName} ({item.Grams:g}g)");
                totalCalories += calories;
                totalProtein += protein;
                totalCarb += carb;
                totalFat += fat;
            }

            var details = addedFoods.Count == 1
                ? $"Đã thêm {addedFoods[0]} ({Math.Round(totalCalories)} kcal) vào {GetMealLabelLower(draft.MealType)}."
                : $"Đã thêm {addedFoods.Count} món ({Math.Round(totalCalories)} kcal) vào {GetMealLabelLower(draft.MealType)}: {string.Join(", ", addedFoods)}.";

            return Ok(new VoiceProcessResponse
            {
                Success = true,
                ExecutedAction = new ExecutedAction
                {
                    Type = actionType,
                    Details = details,
                    Data = new Dictionary<string, object>
                    {
                        ["addedCount"] = addedFoods.Count,
                        ["totalCalories"] = totalCalories,
                        ["totalProtein"] = totalProtein,
                        ["totalCarb"] = totalCarb,
                        ["totalFat"] = totalFat,
                        ["foods"] = addedFoods
                    }
                }
            });
        }

        private Task<ActionResult<VoiceProcessResponse>> CommitRepeatMealReviewAsync(
            Guid userId,
            VoiceReviewDraft draft)
        {
            return CommitAddFoodReviewAsync(userId, draft, "REPEAT_MEAL", "voice_repeat");
        }

        private async Task<ActionResult<VoiceProcessResponse>> CommitNoteReviewAsync(
            Guid userId,
            VoiceReviewDraft draft)
        {
            var noteText = draft.Note?.NoteText?.Trim();
            if (string.IsNullOrWhiteSpace(noteText))
            {
                return BadRequest(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Ghi chú đang trống."
                });
            }

            var noteDate = draft.Date
                ?? (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
            var isMealNote = draft.MealType.HasValue;
            var marker = await _mealDiaryService.UpsertMealDayMarkerAsync(
                userId,
                new UpsertMealDayMarkerRequest
                {
                    LocalDate = noteDate,
                    MealTypeId = isMealNote ? ParseMealTypeEnum(draft.MealType) : null,
                    MarkerType = isMealNote ? MealDayMarkerType.MealNote : MealDayMarkerType.DayNote,
                    Reason = noteText
                });

            return Ok(new VoiceProcessResponse
            {
                Success = true,
                ExecutedAction = new ExecutedAction
                {
                    Type = "ADD_NOTE",
                    Details = isMealNote
                        ? $"Đã lưu ghi chú cho {GetMealLabelLower(draft.MealType)}: {noteText}"
                        : $"Đã lưu ghi chú ngày {FormatVoiceDate(noteDate)}: {noteText}",
                    Data = new Dictionary<string, object>
                    {
                        ["markerId"] = marker.MealDayMarkerId,
                        ["markerType"] = marker.MarkerType,
                        ["noteText"] = noteText,
                        ["date"] = noteDate.ToString("yyyy-MM-dd")
                    }
                }
            });
        }

        private async Task<ActionResult<VoiceProcessResponse>> CommitWeightReviewAsync(
            Guid userId,
            VoiceReviewDraft draft)
        {
            var newWeight = draft.Weight?.NewWeight ?? 0;
            if (!IsValidWeight(newWeight))
            {
                return BadRequest(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Cân nặng phải từ 20kg đến 300kg."
                });
            }

            var measuredAt = await GetBusinessNowAsync(userId);
            await _userService.RecordBodyMetricsAsync(userId, new EatFitAI.API.DTOs.User.BodyMetricDto
            {
                WeightKg = newWeight,
                MeasuredDate = measuredAt,
                Note = draft.Weight?.NoteText
            });

            return Ok(new VoiceProcessResponse
            {
                Success = true,
                ExecutedAction = new ExecutedAction
                {
                    Type = "LOG_WEIGHT",
                    Details = $"Đã cập nhật cân nặng: {newWeight} kg",
                    Data = new Dictionary<string, object>
                    {
                        ["savedWeight"] = newWeight,
                        ["savedAt"] = measuredAt.ToString("yyyy-MM-dd HH:mm")
                    }
                }
            });
        }

        private VoiceReviewDraft CreateBaseReviewDraft(ParsedVoiceCommand command)
        {
            return new VoiceReviewDraft
            {
                Intent = command.Intent,
                RawText = command.RawText,
                Source = command.Source,
                Confidence = command.Confidence,
                ReviewRequired = RequiresExplicitReview(command),
                ReviewReason = ResolveReviewReason(command, command.ReviewReason)
            };
        }

        private async Task<DateTime> ResolveVoiceDateAsync(
            Guid userId,
            DateTime? explicitDate,
            int? offsetDays)
        {
            if (explicitDate.HasValue)
            {
                return explicitDate.Value.Date;
            }

            var today = (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
            return today.AddDays(offsetDays ?? 0);
        }

        private static decimal SafePer100(decimal value, decimal grams)
        {
            return grams <= 0 ? 0 : Math.Round(value * 100m / grams, 1);
        }

        private static string ResolveMealEntryName(MealDiaryDto entry)
        {
            return entry.FoodItemName
                ?? entry.UserDishName
                ?? entry.RecipeName
                ?? entry.ServingUnitName
                ?? "Món đã ghi";
        }

        private async Task<List<VoiceFoodCandidate>> SearchVoiceCandidatesAsync(
            Guid userId,
            string foodName)
        {
            if (string.IsNullOrWhiteSpace(foodName))
            {
                return new List<VoiceFoodCandidate>();
            }

            var results = await _foodService.SearchAllAsync(foodName, userId, 3);
            return results
                .Select(result => ToVoiceCandidate(result, foodName))
                .ToList();
        }

        private async Task<FoodSearchResultDto?> ResolveVoiceCandidateForCommitAsync(
            Guid userId,
            VoiceReviewItem item)
        {
            var selected = item.SelectedCandidate;
            if (selected is null || selected.Id <= 0 || string.IsNullOrWhiteSpace(selected.Source))
            {
                return null;
            }

            var searchTerms = new[]
            {
                selected.Name,
                item.FoodName,
                item.HeardText
            }
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .Distinct(StringComparer.OrdinalIgnoreCase);

            foreach (var term in searchTerms)
            {
                var results = await _foodService.SearchAllAsync(term, userId, 10);
                var match = results.FirstOrDefault(result =>
                    result.Id == selected.Id &&
                    string.Equals(result.Source, selected.Source, StringComparison.OrdinalIgnoreCase));
                if (match is not null)
                {
                    return match;
                }
            }

            return null;
        }

        private static VoiceFoodCandidate ToVoiceCandidate(
            FoodSearchResultDto result,
            string query)
        {
            return new VoiceFoodCandidate
            {
                Id = result.Id,
                Source = result.Source,
                Name = result.FoodName,
                CaloriesPer100 = result.CaloriesPer100,
                ProteinPer100 = result.ProteinPer100,
                CarbPer100 = result.CarbPer100,
                FatPer100 = result.FatPer100,
                MatchScore = CalculateSimpleMatchScore(query, result.FoodName)
            };
        }

        private static decimal CalculateSimpleMatchScore(string query, string candidateName)
        {
            if (string.Equals(query.Trim(), candidateName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return 1m;
            }

            return candidateName.Contains(query.Trim(), StringComparison.OrdinalIgnoreCase)
                ? 0.85m
                : 0.7m;
        }

        private static List<FoodItem> GetCommandFoodItems(ParsedVoiceCommand command)
        {
            if (command.Entities.Foods?.Count > 0)
            {
                return command.Entities.Foods;
            }

            if (!string.IsNullOrWhiteSpace(command.Entities.FoodName))
            {
                return new List<FoodItem>
                {
                    new()
                    {
                        FoodName = command.Entities.FoodName,
                        Quantity = command.Entities.Quantity,
                        Unit = command.Entities.Unit,
                        Weight = command.Entities.Weight
                    }
                };
            }

            return new List<FoodItem>();
        }

        private static decimal ResolveVoiceFoodGrams(FoodItem food, List<string> warnings)
        {
            if (food.Weight.HasValue)
            {
                return food.Weight.Value;
            }

            if (food.Quantity.HasValue && IsGramUnit(food.Unit))
            {
                return food.Quantity.Value;
            }

            if (food.Quantity.HasValue)
            {
                return food.Quantity.Value * 100m;
            }

            warnings.Add("Chưa có khẩu phần rõ ràng, tạm dùng 100g để bạn chỉnh lại.");
            return 100m;
        }

        private static bool IsGramUnit(string? unit)
        {
            if (string.IsNullOrWhiteSpace(unit))
            {
                return false;
            }

            var normalized = unit.Trim().ToLowerInvariant();
            return normalized is "g" or "gram" or "grams";
        }

        private static VoiceNutritionTotals CalculateVoiceTotals(IEnumerable<VoiceReviewItem> items)
        {
            var totals = new VoiceNutritionTotals();
            foreach (var item in items)
            {
                if (item.SelectedCandidate is null || !IsValidFoodGrams(item.Grams))
                {
                    continue;
                }

                var factor = item.Grams / 100m;
                totals.Calories += Math.Round(item.SelectedCandidate.CaloriesPer100 * factor, 1);
                totals.Protein += Math.Round(item.SelectedCandidate.ProteinPer100 * factor, 1);
                totals.Carb += Math.Round(item.SelectedCandidate.CarbPer100 * factor, 1);
                totals.Fat += Math.Round(item.SelectedCandidate.FatPer100 * factor, 1);
            }

            return totals;
        }

        private static void ApplyDraftSaveState(VoiceReviewDraft draft)
        {
            var allWarnings = draft.Warnings
                .Concat(draft.Items.SelectMany(item => item.Warnings))
                .ToList();
            var hasBlockingItem = (draft.Intent == VoiceIntent.ADD_FOOD || draft.Intent == VoiceIntent.REPEAT_MEAL) &&
                (draft.Items.Count == 0 ||
                 draft.Items.Any(item => item.SelectedCandidate is null || !IsValidFoodGrams(item.Grams)));
            var hasBlockingWeight = draft.Intent == VoiceIntent.LOG_WEIGHT &&
                (draft.Weight is null || !IsValidWeight(draft.Weight.NewWeight));
            var hasBlockingNote = draft.Intent == VoiceIntent.ADD_NOTE &&
                string.IsNullOrWhiteSpace(draft.Note?.NoteText);

            draft.CanSave = !hasBlockingItem && !hasBlockingWeight && !hasBlockingNote;
            draft.BlockingReason = draft.CanSave ? null : allWarnings.FirstOrDefault() ?? "Cần kiểm tra lại dữ liệu trước khi lưu.";
        }

        private static bool IsValidFoodGrams(decimal grams)
        {
            return grams >= MinVoiceFoodGrams && grams <= MaxVoiceFoodGrams;
        }

        private static bool IsValidWeight(decimal weight)
        {
            return weight >= MinVoiceWeightKg && weight <= MaxVoiceWeightKg;
        }

        /// <summary>
        /// Execute parsed voice command - actually saves to database
        /// </summary>
        [HttpPost("execute")]
        public async Task<ActionResult<VoiceProcessResponse>> ExecuteCommand([FromBody] ParsedVoiceCommand command)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Bạn chưa đăng nhập" });
            }

            try
            {
                _logger.LogInformation("Executing voice command for user {UserId}: {Intent}", userId, command.Intent);

                ExecutedAction? executedAction = null;
                string? error = null;

                switch (command.Intent)
                {
                    case VoiceIntent.ADD_FOOD:
                        // Kiểm tra confidence trước khi thực thi
                        if (command.Confidence < 0.5)
                        {
                            error = "Độ tin cậy thấp. Vui lòng nói rõ hơn.";
                            break;
                        }
                        (executedAction, error) = await ExecuteAddFoodAsync(userId, command);
                        break;

                    case VoiceIntent.LOG_WEIGHT:
                        // Lấy cân nặng hiện tại và trả về để FE xác nhận
                        if (command.Entities.Weight.HasValue && command.Entities.Weight > 0)
                        {
                            try
                            {
                                // Lấy cân nặng hiện tại của người dùng
                                var userProfile = await _userService.GetUserProfileAsync(userId);
                                var currentWeight = userProfile?.CurrentWeightKg;
                                var newWeight = command.Entities.Weight.Value;
                                
                                // Trả về dữ liệu để FE hiển thị xác nhận, chưa lưu
                                executedAction = new ExecutedAction
                                {
                                    Type = "LOG_WEIGHT_CONFIRM",
                                    Details = currentWeight.HasValue
                                    ? $"Cân hiện tại: {currentWeight}kg. Cập nhật thành {newWeight}kg?"
                                    : $"Ghi cân nặng mới: {newWeight}kg?",
                                    Data = new Dictionary<string, object>
                                    {
                                        ["currentWeight"] = currentWeight ?? 0,
                                        ["newWeight"] = newWeight,
                                        ["requireConfirm"] = true
                                    }
                                };
                                _logger.LogInformation("LOG_WEIGHT confirm: current={Current}, new={New} for user {UserId}", 
                                    currentWeight, newWeight, userId);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to get current weight");
                                error = "Không thể lấy thông tin cân nặng. Vui lòng thử lại.";
                            }
                        }
                        else
                        {
                            error = "Chưa thấy số cân nặng trong yêu cầu.";
                        }
                        break;

                    case VoiceIntent.ASK_CALORIES:
                        // Query DaySummary để lấy cả calo và mục tiêu
                        try
                        {
                            var today = command.Entities.Date
                                ?? (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
                            var daySummary = await _analyticsService.GetDaySummaryWithMealsAsync(userId, today);
                            var totalCalories = daySummary.TotalCalories;
                            var targetCalories = daySummary.TargetCalories ?? 2000;
                            
                            executedAction = new ExecutedAction
                            {
                                Type = "ASK_CALORIES",
                                Details = $"Ngày {FormatVoiceDate(today)}, bạn đã dùng {totalCalories:N0} / {targetCalories:N0} kcal.",
                                Data = new Dictionary<string, object>
                                {
                                    ["totalCalories"] = totalCalories,
                                    ["targetCalories"] = targetCalories,
                                    ["remaining"] = targetCalories - totalCalories,
                                    ["date"] = today.ToString("yyyy-MM-dd")
                                }
                            };
                            _logger.LogInformation("User {UserId} asked calories: {Total}/{Target}kcal", userId, totalCalories, targetCalories);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to get calories");
                            error = "Không thể lấy thông tin calo. Vui lòng thử lại.";
                        }
                        break;

                    case VoiceIntent.ASK_NUTRITION:
                        (executedAction, error) = await ExecuteAskNutritionAsync(userId, command);
                        break;

                    case VoiceIntent.QUERY_MEAL:
                        (executedAction, error) = await ExecuteQueryMealAsync(userId, command);
                        break;

                    default:
                        error = "Chưa hỗ trợ yêu cầu này.";
                        break;
                }

                return Ok(new VoiceProcessResponse
                {
                    Success = executedAction != null && error == null,
                    Command = command,
                    ExecutedAction = executedAction,
                    Error = error
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing voice command");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "Chưa thực hiện được yêu cầu giọng nói. Vui lòng thử lại." });
            }
        }

        /// <summary>
        /// Confirm and save weight after user confirmation
        /// </summary>
        [HttpPost("confirm-weight")]
        public async Task<ActionResult<VoiceProcessResponse>> ConfirmWeight([FromBody] ConfirmWeightRequest request)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse { Success = false, Error = "Bạn chưa đăng nhập" });
            }

            try
            {
                var bodyMetric = new EatFitAI.API.DTOs.User.BodyMetricDto
                {
                    WeightKg = request.NewWeight,
                    MeasuredDate = await GetBusinessNowAsync(userId)
                };
                await _userService.RecordBodyMetricsAsync(userId, bodyMetric);
                
                _logger.LogInformation("Confirmed weight {Weight}kg for user {UserId}", request.NewWeight, userId);
                
                return Ok(new VoiceProcessResponse
                {
                    Success = true,
                    ExecutedAction = new ExecutedAction
                    {
                        Type = "LOG_WEIGHT",
                        Details = $"Đã cập nhật cân nặng: {request.NewWeight} kg",
                        Data = new Dictionary<string, object>
                        {
                            ["savedWeight"] = request.NewWeight,
                            ["savedAt"] = (await GetBusinessNowAsync(userId)).ToString("yyyy-MM-dd HH:mm")
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming weight");
                return StatusCode(500, new VoiceProcessResponse { Success = false, Error = "Chưa lưu được cân nặng." });
            }
        }

        /// <summary>
        /// Execute ADD_FOOD: Search food in DB, calculate nutrition, save to MealDiary
        /// Hỗ trợ cả 1 món (FoodName) và nhiều món (Foods array)
        /// </summary>
        private async Task<(ExecutedAction? action, string? error)> ExecuteQueryMealAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var queryDate = await ResolveVoiceDateAsync(
                userId,
                command.Entities.Date,
                command.Entities.DateOffsetDays ?? 0);
            var mealType = command.Entities.MealType;
            var entries = (await _mealDiaryService.GetUserMealDiariesAsync(userId, queryDate))
                .Where(entry => !mealType.HasValue || entry.MealTypeId == ParseMealTypeEnum(mealType))
                .OrderBy(entry => entry.MealTypeId)
                .ThenBy(entry => entry.CreatedAt)
                .ToList();
            var totalCalories = entries.Sum(entry => entry.Calories);
            var totalProtein = entries.Sum(entry => entry.Protein);
            var totalCarb = entries.Sum(entry => entry.Carb);
            var totalFat = entries.Sum(entry => entry.Fat);
            var names = entries.Select(ResolveMealEntryName).ToList();
            var mealLabel = mealType.HasValue ? GetMealLabel(mealType) : "Ngày";
            var details = entries.Count == 0
                ? $"{mealLabel} {FormatVoiceDate(queryDate)} chưa có món nào."
                : $"{mealLabel} {FormatVoiceDate(queryDate)} có {entries.Count} món, khoảng {Math.Round(totalCalories)} kcal: {string.Join(", ", names)}.";

            return (new ExecutedAction
            {
                Type = "QUERY_MEAL",
                Details = details,
                Data = new Dictionary<string, object>
                {
                    ["date"] = queryDate.ToString("yyyy-MM-dd"),
                    ["mealType"] = mealType?.ToString() ?? "All",
                    ["entryCount"] = entries.Count,
                    ["totalCalories"] = totalCalories,
                    ["totalProtein"] = totalProtein,
                    ["totalCarb"] = totalCarb,
                    ["totalFat"] = totalFat,
                    ["entries"] = entries.Select(entry => new
                    {
                        id = entry.MealDiaryId,
                        name = ResolveMealEntryName(entry),
                        grams = entry.Grams,
                        calories = entry.Calories,
                        note = entry.Note
                    }).ToList()
                }
            }, null);
        }

        private async Task<(ExecutedAction? action, string? error)> ExecuteAskNutritionAsync(
            Guid userId,
            ParsedVoiceCommand command)
        {
            var queryDate = await ResolveVoiceDateAsync(
                userId,
                command.Entities.Date,
                command.Entities.DateOffsetDays ?? 0);
            var scope = command.Entities.QueryScope?.Trim().ToLowerInvariant() == "week" ? "week" : "day";
            var summary = scope == "week"
                ? await _analyticsService.GetWeekSummaryAsync(userId, queryDate)
                : await _analyticsService.GetDaySummaryAsync(userId, queryDate);
            var nutrient = command.Entities.Nutrient?.Trim().ToLowerInvariant() ?? "protein";
            var value = nutrient switch
            {
                "carb" or "carbs" => summary.TotalCarbs,
                "fat" => summary.TotalFat,
                _ => summary.TotalProtein
            };
            var label = nutrient switch
            {
                "carb" or "carbs" => "carb",
                "fat" => "fat",
                _ => "protein"
            };
            var details = scope == "week"
                ? $"Tuần này bạn đã nạp khoảng {Math.Round(value)}g {label}."
                : $"Ngày {FormatVoiceDate(queryDate)}, bạn đã nạp khoảng {Math.Round(value)}g {label}.";

            return (new ExecutedAction
            {
                Type = "ASK_NUTRITION",
                Details = details,
                Data = new Dictionary<string, object>
                {
                    ["scope"] = scope,
                    ["nutrient"] = label,
                    ["value"] = value,
                    ["date"] = queryDate.ToString("yyyy-MM-dd"),
                    ["totalCalories"] = summary.TotalCalories,
                    ["totalProtein"] = summary.TotalProtein,
                    ["totalCarb"] = summary.TotalCarbs,
                    ["totalFat"] = summary.TotalFat
                }
            }, null);
        }

        private async Task<(ExecutedAction? action, string? error)> ExecuteAddFoodAsync(Guid userId, ParsedVoiceCommand command)
        {
            try
            {
                var mealType = command.Entities.MealType ?? await InferMealTypeByTimeAsync(userId);
                var mealTypeId = ParseMealTypeEnum(mealType);
                var eatenDate = command.Entities.Date
                    ?? (await _businessDateService.GetTodayAsync(userId)).ToDateTime(TimeOnly.MinValue);
                var addedFoods = new List<string>();
                decimal totalCalories = 0;

                // Trường hợp 1: Nhiều món ăn (Foods array)
                if (command.Entities.Foods != null && command.Entities.Foods.Count > 0)
                {
                    _logger.LogInformation("Processing {Count} foods from voice command", command.Entities.Foods.Count);
                    
                    foreach (var foodItem in command.Entities.Foods)
                    {
                        if (string.IsNullOrWhiteSpace(foodItem.FoodName))
                            continue;

                        var result = await AddSingleFoodAsync(userId, foodItem.FoodName, 
                            foodItem.Weight ?? foodItem.Quantity ?? 100m, 
                            mealTypeId, eatenDate, command.RawText);
                        
                        if (result.success)
                        {
                            addedFoods.Add($"{result.foodName} ({result.grams}g)");
                            totalCalories += result.calories;
                        }
                        else
                        {
                            _logger.LogWarning("Could not find food: {FoodName}", foodItem.FoodName);
                        }
                    }
                }
                // Trường hợp 2: Một món ăn (FoodName đơn lẻ)
                else if (!string.IsNullOrWhiteSpace(command.Entities.FoodName))
                {
                    var grams = command.Entities.Weight ?? (command.Entities.Quantity ?? 1) * 100m;
                    var result = await AddSingleFoodAsync(userId, command.Entities.FoodName, 
                        grams, mealTypeId, eatenDate, command.RawText);
                    
                    if (result.success)
                    {
                        addedFoods.Add($"{result.foodName} ({result.grams}g)");
                        totalCalories = result.calories;
                    }
                    else
                    {
                        return (null, $"Chưa tìm thấy món '{command.Entities.FoodName}'. Hãy thử nói tên món cụ thể hơn.");
                    }
                }
                else
                {
                    return (null, "Chưa thấy tên món ăn trong yêu cầu.");
                }

                if (addedFoods.Count == 0)
                {
                    return (null, "Chưa tìm thấy món phù hợp. Hãy thử nói tên món cụ thể hơn.");
                }

                var details = addedFoods.Count == 1
                    ? $"Đã thêm {addedFoods[0]} ({Math.Round(totalCalories)} kcal) vào {GetMealLabelLower(mealType)}."
                    : $"Đã thêm {addedFoods.Count} món ({Math.Round(totalCalories)} kcal) vào {GetMealLabelLower(mealType)}: {string.Join(", ", addedFoods)}.";

                return (new ExecutedAction
                {
                    Type = "ADD_FOOD",
                    Details = details,
                    Data = new Dictionary<string, object>
                    {
                        ["addedCount"] = addedFoods.Count,
                        ["totalCalories"] = totalCalories,
                        ["foods"] = addedFoods
                    }
                }, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding food via voice");
                return (null, "Chưa thêm được món ăn. Vui lòng thử lại.");
            }
        }

        /// <summary>
        /// Helper: Thêm 1 món ăn vào MealDiary
        /// </summary>
        private async Task<(bool success, string foodName, decimal grams, decimal calories)> AddSingleFoodAsync(
            Guid userId, string foodName, decimal grams, int mealTypeId, DateTime eatenDate, string rawText)
        {
            // Search for food by name
            _logger.LogInformation("Searching food: {FoodName}", foodName);
            var searchResults = await _foodService.SearchAllAsync(foodName, null, 5);
            
            if (searchResults == null || !searchResults.Any())
            {
                return (false, foodName, 0, 0);
            }

            // Get best match (first result)
            var food = searchResults.First();
            
            // Calculate nutrition based on portion
            var factor = grams / 100m;
            var calories = food.CaloriesPer100 * factor;
            var protein = food.ProteinPer100 * factor;
            var carbs = food.CarbPer100 * factor;
            var fat = food.FatPer100 * factor;

            // Create MealDiary entry
            var createRequest = new CreateMealDiaryRequest
            {
                EatenDate = eatenDate,
                MealTypeId = mealTypeId,
                FoodItemId = food.Source == "catalog" ? food.Id : (int?)null,
                UserFoodItemId = food.Source == "user" ? food.Id : (int?)null,
                Grams = grams,
                Calories = Math.Round(calories, 1),
                Protein = Math.Round(protein, 1),
                Carb = Math.Round(carbs, 1),
                Fat = Math.Round(fat, 1),
                Note = $"Ghi bằng giọng nói: {rawText}",
                SourceMethod = "voice"
            };

            await _mealDiaryService.CreateMealDiaryAsync(userId, createRequest);
            
            _logger.LogInformation("Added food via Voice AI: {Food} ({Grams}g, {Calories}kcal)", 
                food.FoodName, grams, Math.Round(calories));

            return (true, food.FoodName, grams, calories);
        }

        /// <summary>
        /// Parse meal type enum to database ID
        /// </summary>
        private static int ParseMealTypeEnum(MealType? mealType)
        {
            return mealType switch
            {
                MealType.Breakfast => 1,
                MealType.Lunch => 2,
                MealType.Dinner => 3,
                MealType.Snack => 4,
                _ => 2 // Default lunch
            };
        }

        private async Task<MealType> InferMealTypeByTimeAsync(Guid userId)
        {
            var timeZoneId = await _businessDateService.GetUserTimeZoneIdAsync(userId);
            if (!API.Services.BusinessTimeZone.TryResolve(timeZoneId, out var timeZone))
            {
                timeZone = API.Services.BusinessTimeZone.DefaultTimeZone;
            }
            var localTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
            var h = localTime.Hour;
            
            if (h >= 5 && h < 11) return MealType.Breakfast;
            if (h >= 11 && h < 14) return MealType.Lunch;
            if (h >= 14 && h < 18) return MealType.Snack;
            return MealType.Dinner;
        }

        private static string GetMealLabel(MealType? mealType)
        {
            return mealType switch
            {
                MealType.Breakfast => "Bữa sáng",
                MealType.Lunch => "Bữa trưa",
                MealType.Dinner => "Bữa tối",
                MealType.Snack => "Bữa phụ",
                _ => "Bữa ăn"
            };
        }

        private static string GetMealLabelLower(MealType? mealType)
        {
            return GetMealLabel(mealType).ToLower(CultureInfo.GetCultureInfo("vi-VN"));
        }

        private static string FormatVoiceDate(DateTime date)
        {
            return date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
        }

        private async Task<DateTime> GetBusinessNowAsync(Guid userId)
        {
            var timeZoneId = await _businessDateService.GetUserTimeZoneIdAsync(userId);
            return BusinessTimeZone.TryResolve(timeZoneId, out var timeZone)
                ? TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone).DateTime
                : TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BusinessTimeZone.DefaultTimeZone).DateTime;
        }
    }
}
