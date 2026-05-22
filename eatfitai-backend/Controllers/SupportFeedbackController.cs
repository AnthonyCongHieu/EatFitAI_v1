using System.Security.Claims;
using EatFitAI.API.DTOs.Support;
using EatFitAI.API.Helpers;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EatFitAI.API.Controllers;

[ApiController]
[Route("api/support")]
[Authorize]
[EnableRateLimiting("GeneralPolicy")]
public sealed class SupportFeedbackController : ControllerBase
{
    private const int MinMessageLength = 10;
    private const int MaxMessageLength = 2000;
    private const string DefaultRecipientEmail = "dinhconghieudch1610@gmail.com";

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "quality",
        "performance",
        "ai_accuracy",
        "quota",
        "auth_payment",
        "other",
    };

    private static readonly HashSet<string> AllowedSentiments = new(StringComparer.OrdinalIgnoreCase)
    {
        "good",
        "bad",
        "bug",
        "idea",
        "other",
    };

    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SupportFeedbackController> _logger;

    public SupportFeedbackController(
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<SupportFeedbackController> logger)
    {
        _emailService = emailService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("feedback")]
    public async Task<IActionResult> SubmitFeedback(
        [FromBody] FeedbackRequest request,
        CancellationToken cancellationToken)
    {
        var message = request.Message?.Trim() ?? string.Empty;
        if (message.Length < MinMessageLength || message.Length > MaxMessageLength)
        {
            return BadRequest(ErrorResponseHelper.SafeError(
                $"Nội dung phản hồi cần từ {MinMessageLength} đến {MaxMessageLength} ký tự.",
                HttpContext));
        }

        var category = NormalizeOrDefault(request.Category, AllowedCategories, "other");
        var sentiment = NormalizeOrDefault(request.Sentiment, AllowedSentiments, "other");
        var userEmail = User.FindFirstValue(ClaimTypes.Email)?.Trim();
        if (string.IsNullOrWhiteSpace(userEmail))
        {
            return Unauthorized(ErrorResponseHelper.SafeError(
                "Token người dùng không có email hợp lệ.",
                HttpContext));
        }

        Guid? userId = null;
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdClaim, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        var traceId = HttpContext.TraceIdentifier;
        var recipientEmail = _configuration["Feedback:RecipientEmail"]?.Trim();
        if (string.IsNullOrWhiteSpace(recipientEmail))
        {
            recipientEmail = DefaultRecipientEmail;
        }

        try
        {
            await _emailService.SendFeedbackAsync(new FeedbackEmailMessage
            {
                RecipientEmail = recipientEmail,
                UserEmail = userEmail,
                UserDisplayName = User.FindFirstValue(ClaimTypes.Name),
                UserId = userId,
                Category = category,
                Sentiment = sentiment,
                Message = message,
                AppVersion = Limit(request.AppVersion, 40),
                BuildNumber = Limit(request.BuildNumber, 40),
                Platform = Limit(request.Platform, 40),
                DeviceModel = Limit(request.DeviceModel, 120),
                Screen = Limit(request.Screen, 80),
                TraceId = traceId,
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send feedback email for user {UserId}; category={Category}; sentiment={Sentiment}; traceId={TraceId}",
                userId,
                category,
                sentiment,
                traceId);
            return StatusCode(500, ErrorResponseHelper.SafeError(
                "Không thể gửi phản hồi lúc này. Vui lòng thử lại sau.",
                HttpContext));
        }

        _logger.LogInformation(
            "Feedback submitted by user {UserId}; category={Category}; sentiment={Sentiment}; traceId={TraceId}",
            userId,
            category,
            sentiment,
            traceId);

        return Ok(new
        {
            message = "Đã gửi phản hồi.",
            traceId,
        });
    }

    private static string NormalizeOrDefault(
        string? value,
        HashSet<string> allowed,
        string fallback)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        return !string.IsNullOrWhiteSpace(normalized) && allowed.Contains(normalized)
            ? normalized
            : fallback;
    }

    private static string? Limit(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
