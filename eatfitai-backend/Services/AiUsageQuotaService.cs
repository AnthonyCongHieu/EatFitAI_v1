using EatFitAI.API.Data;
using EatFitAI.API.DTOs.AI;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public static class AiUsageQuotaFeatureKeys
{
    public const string VisionScan = "vision_scan";
    public const string RecipeSuggestion = "recipe_suggestion";
    public const string CookingGuide = "cooking_guide";
    public const string NutritionTarget = "nutrition_target";
    public const string NutritionInsight = "nutrition_insight";
    public const string AdaptiveTarget = "adaptive_target";
    public const string WeeklyReview = "weekly_review";
    public const string VoiceParse = "voice_parse";
    public const string VoiceTranscribe = "voice_transcribe";
}

public sealed class AiUsageQuotaExceededException : Exception
{
    public AiUsageQuotaExceededException(AiUsageQuotaFeatureDto feature)
        : base($"AI quota exceeded for feature '{feature.Key}'.")
    {
        Feature = feature;
    }

    public AiUsageQuotaFeatureDto Feature { get; }
}

public sealed class AiUsageQuotaService : IAiUsageQuotaService
{
    private const int DefaultFreeDailyLimit = 20;

    private static readonly IReadOnlyList<AiUsageQuotaFeatureDefinition> FeatureDefinitions =
    [
        new(
            AiUsageQuotaFeatureKeys.VisionScan,
            "Quet mon bang AI",
            "VisionDetect",
            IsLimitedForFree: false,
            ["VisionDetect"]),
        new(
            AiUsageQuotaFeatureKeys.RecipeSuggestion,
            "Goi y cong thuc",
            "RecipeSuggestion",
            IsLimitedForFree: true,
            ["RecipeSuggestion"]),
        new(
            AiUsageQuotaFeatureKeys.CookingGuide,
            "Huong dan nau",
            "RecipeCookingGuide",
            IsLimitedForFree: true,
            ["RecipeCookingGuide", "CookingInstructions"]),
        new(
            AiUsageQuotaFeatureKeys.NutritionTarget,
            "Tinh muc tieu AI",
            "NutritionRecalculate",
            IsLimitedForFree: true,
            ["NutritionRecalculate", "NutritionSuggest"]),
        new(
            AiUsageQuotaFeatureKeys.NutritionInsight,
            "Phan tich dinh duong",
            "NutritionInsight",
            IsLimitedForFree: true,
            ["NutritionInsight"]),
        new(
            AiUsageQuotaFeatureKeys.AdaptiveTarget,
            "Muc tieu thich ung",
            "AdaptiveTarget",
            IsLimitedForFree: true,
            ["AdaptiveTarget"]),
        new(
            AiUsageQuotaFeatureKeys.WeeklyReview,
            "Weekly review AI",
            "WeeklyReview",
            IsLimitedForFree: true,
            ["WeeklyReview"]),
        new(
            AiUsageQuotaFeatureKeys.VoiceParse,
            "Hieu lenh giong noi",
            "VoiceParse",
            IsLimitedForFree: true,
            ["VoiceParse"]),
        new(
            AiUsageQuotaFeatureKeys.VoiceTranscribe,
            "Chuyen giong noi thanh text",
            "VoiceTranscribe",
            IsLimitedForFree: true,
            ["VoiceTranscribe"]),
    ];

    private readonly ApplicationDbContext _context;
    private readonly IEntitlementService _entitlementService;
    private readonly IBusinessDateService _businessDateService;
    private readonly IAiLogService _aiLogService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiUsageQuotaService> _logger;

    public AiUsageQuotaService(
        ApplicationDbContext context,
        IEntitlementService entitlementService,
        IBusinessDateService businessDateService,
        IAiLogService aiLogService,
        IConfiguration configuration,
        ILogger<AiUsageQuotaService> logger)
    {
        _context = context;
        _entitlementService = entitlementService;
        _businessDateService = businessDateService;
        _aiLogService = aiLogService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AiUsageQuotaStatusDto> GetStatusAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var subscription = await _entitlementService.GetSubscriptionStatusAsync(userId, cancellationToken);
        var timeZoneId = await _businessDateService.GetUserTimeZoneIdAsync(userId, cancellationToken);
        var today = await _businessDateService.GetTodayAsync(userId, cancellationToken);
        var range = _businessDateService.GetUtcRange(today, timeZoneId);
        var freeDailyLimit = GetFreeDailyLimit();
        var allActions = FeatureDefinitions
            .SelectMany(feature => feature.CountedActions)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var counts = await _context.AILogs
            .AsNoTracking()
            .Where(log => log.UserId == userId
                && log.CreatedAt >= range.StartUtc
                && log.CreatedAt < range.EndUtc
                && allActions.Contains(log.Action))
            .GroupBy(log => log.Action)
            .Select(group => new
            {
                Action = group.Key,
                Count = group.Count()
            })
            .ToDictionaryAsync(
                item => item.Action,
                item => item.Count,
                StringComparer.Ordinal,
                cancellationToken);

        var features = FeatureDefinitions
            .Select(feature => BuildFeatureDto(feature, counts, subscription.IsPremium, freeDailyLimit, range.EndUtc))
            .ToList();

        return new AiUsageQuotaStatusDto
        {
            PlanCode = subscription.PlanCode,
            IsPremium = subscription.IsPremium,
            TimeZoneId = timeZoneId,
            WindowStartUtc = range.StartUtc,
            ResetAtUtc = range.EndUtc,
            Features = features,
        };
    }

    public async Task<AiUsageQuotaFeatureDto> EnsureCanUseAsync(
        Guid userId,
        string featureKey,
        CancellationToken cancellationToken = default)
    {
        var status = await GetStatusAsync(userId, cancellationToken);
        var feature = status.Features.FirstOrDefault(item => item.Key == featureKey)
            ?? throw new ArgumentException($"Unknown AI quota feature '{featureKey}'.", nameof(featureKey));

        if (feature.IsLimited && feature.Remaining <= 0)
        {
            throw new AiUsageQuotaExceededException(feature);
        }

        return feature;
    }

    public async Task RecordUsageAsync(
        Guid userId,
        string featureKey,
        object? input,
        object? output,
        long durationMs = 0,
        CancellationToken cancellationToken = default)
    {
        var definition = FeatureDefinitions.FirstOrDefault(item => item.Key == featureKey)
            ?? throw new ArgumentException($"Unknown AI quota feature '{featureKey}'.", nameof(featureKey));

        try
        {
            await _aiLogService.LogAsync(userId, definition.PrimaryAction, input, output, durationMs);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                ex,
                "Failed to record AI usage quota action {Action} for user {UserId}.",
                definition.PrimaryAction,
                userId);
        }
    }

    private int GetFreeDailyLimit()
    {
        var configured = _configuration.GetValue<int?>("AIUsage:FreeDailyLimit");
        return configured is > 0 ? configured.Value : DefaultFreeDailyLimit;
    }

    private static AiUsageQuotaFeatureDto BuildFeatureDto(
        AiUsageQuotaFeatureDefinition feature,
        IReadOnlyDictionary<string, int> counts,
        bool isPremium,
        int freeDailyLimit,
        DateTime resetAtUtc)
    {
        var used = feature.CountedActions.Sum(action => counts.TryGetValue(action, out var count) ? count : 0);
        var isLimited = feature.IsLimitedForFree && !isPremium;
        var limit = isLimited ? freeDailyLimit : (int?)null;
        var remaining = limit.HasValue ? Math.Max(0, limit.Value - used) : (int?)null;

        return new AiUsageQuotaFeatureDto
        {
            Key = feature.Key,
            Label = feature.Label,
            IsLimited = isLimited,
            Limit = limit,
            Used = used,
            Remaining = remaining,
            ResetAtUtc = resetAtUtc,
        };
    }

    private sealed record AiUsageQuotaFeatureDefinition(
        string Key,
        string Label,
        string PrimaryAction,
        bool IsLimitedForFree,
        IReadOnlyList<string> CountedActions);
}
