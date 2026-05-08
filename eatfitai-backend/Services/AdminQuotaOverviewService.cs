using System.Globalization;
using System.Text.Json;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.AdminAi;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services;

public class AdminQuotaOverviewService : IAdminQuotaOverviewService
{
    private const int CacheTtlSeconds = 60;
    private const string GeminiProvider = "gemini";
    private const string AllProviders = "all";
    private const string TurnOffEmptyAction = "turn_off_empty";
    private const string TurnOnAvailableAction = "turn_on_available";

    private readonly IAdminRuntimeSnapshotCache _runtimeSnapshotCache;
    private readonly IGeminiRuntimeProjectService _runtimeProjectService;
    private readonly ILogger<AdminQuotaOverviewService> _logger;

    public AdminQuotaOverviewService(
        IAdminRuntimeSnapshotCache runtimeSnapshotCache,
        IGeminiRuntimeProjectService runtimeProjectService,
        ILogger<AdminQuotaOverviewService> logger)
    {
        _runtimeSnapshotCache = runtimeSnapshotCache;
        _runtimeProjectService = runtimeProjectService;
        _logger = logger;
    }

    public async Task<AdminQuotaOverviewDto> GetOverviewAsync(
        AdminQuotaOverviewQuery query,
        CancellationToken cancellationToken = default)
    {
        var providerFilter = NormalizeProvider(query.Provider);
        var window = NormalizeWindow(query.Window);
        var overview = new AdminQuotaOverviewDto
        {
            GeneratedAt = DateTime.UtcNow,
            CacheTtlSeconds = CacheTtlSeconds,
            ProviderFilter = providerFilter,
            Window = window,
        };

        if (!ShouldIncludeGemini(providerFilter))
        {
            overview.Recommendations.Add(new AdminQuotaRecommendationDto
            {
                Severity = "info",
                Title = "Chưa có adapter provider",
                Detail = "Provider này đã có schema UI nhưng chưa có nguồn dữ liệu runtime thật.",
            });
            return overview;
        }

        var sourceWarnings = new List<AdminQuotaRecommendationDto>();
        var snapshot = await TryGetSnapshotAsync(sourceWarnings, cancellationToken);
        var runtimeProjects = await TryGetRuntimeProjectsAsync(sourceWarnings, cancellationToken);
        var telemetry = await TryGetTelemetryAsync(sourceWarnings, cancellationToken);

        overview.Providers = BuildGeminiProviders(snapshot, runtimeProjects);
        overview.TokenTimeline = BuildTimeline(telemetry, window);
        overview.ModelMix = BuildModelMix(telemetry, window);
        overview.CostEstimate = BuildCostEstimate(overview.ModelMix);
        overview.Recommendations = BuildRecommendations(overview);
        overview.Recommendations.AddRange(sourceWarnings);

        return overview;
    }

    public async Task<AdminQuotaBulkActionPreviewDto> PreviewBulkActionAsync(
        AdminQuotaBulkActionRequest request,
        CancellationToken cancellationToken = default)
    {
        var action = NormalizeAction(request.Action);
        var provider = NormalizeProvider(request.Provider);
        var overview = await GetOverviewAsync(
            new AdminQuotaOverviewQuery { Provider = provider, Window = "7d" },
            cancellationToken);

        var requestedIds = request.RuntimeProjectIds?
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var candidates = overview.Providers
            .Where(providerCard => string.Equals(providerCard.Provider, GeminiProvider, StringComparison.OrdinalIgnoreCase))
            .Where(providerCard => !string.IsNullOrWhiteSpace(providerCard.RuntimeProjectId))
            .Where(providerCard => requestedIds == null || requestedIds.Contains(providerCard.RuntimeProjectId))
            .ToList();

        var targets = action switch
        {
            TurnOffEmptyAction => candidates
                .Where(providerCard => providerCard.IsEnabled && IsEmptyProvider(providerCard))
                .Select(providerCard => ToBulkTarget(providerCard, "Enabled project has no quota usage in current source."))
                .ToList(),
            TurnOnAvailableAction => candidates
                .Where(providerCard => !providerCard.IsEnabled && IsSafeToEnable(providerCard))
                .Select(providerCard => ToBulkTarget(providerCard, "Disabled project has no blocking provider state."))
                .ToList(),
            _ => throw new ArgumentException($"Unsupported quota bulk action: {request.Action}", nameof(request)),
        };

        return new AdminQuotaBulkActionPreviewDto
        {
            Action = action,
            Provider = provider,
            AffectedCount = targets.Count,
            Targets = targets,
        };
    }

    public async Task<AdminQuotaBulkActionPreviewDto> CommitBulkActionAsync(
        AdminQuotaBulkActionRequest request,
        CancellationToken cancellationToken = default)
    {
        var preview = await PreviewBulkActionAsync(request, cancellationToken);
        var committedTargets = new List<AdminQuotaBulkActionTargetDto>();

        foreach (var target in preview.Targets)
        {
            var updated = await _runtimeProjectService.ToggleProjectAsync(target.RuntimeProjectId, cancellationToken);
            if (updated == null)
            {
                continue;
            }

            committedTargets.Add(new AdminQuotaBulkActionTargetDto
            {
                RuntimeProjectId = updated.RuntimeProjectId,
                ProjectAlias = updated.ProjectAlias,
                State = updated.State,
                IsEnabled = updated.IsEnabled,
                Reason = target.Reason,
            });
        }

        return new AdminQuotaBulkActionPreviewDto
        {
            Action = preview.Action,
            Provider = preview.Provider,
            AffectedCount = committedTargets.Count,
            Committed = true,
            Targets = committedTargets,
        };
    }

    private async Task<AdminRuntimeSnapshotDto?> TryGetSnapshotAsync(
        List<AdminQuotaRecommendationDto> warnings,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _runtimeSnapshotCache.GetLatestAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load runtime snapshot for quota overview.");
            warnings.Add(new AdminQuotaRecommendationDto
            {
                Severity = "warning",
                Title = "Runtime snapshot chưa sẵn sàng",
                Detail = "Quota overview vẫn trả response rỗng an toàn thay vì render dữ liệu giả.",
            });
            return null;
        }
    }

    private async Task<List<AdminRuntimeProjectDto>> TryGetRuntimeProjectsAsync(
        List<AdminQuotaRecommendationDto> warnings,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _runtimeProjectService.GetRuntimeProjectsAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load runtime projects for quota overview.");
            warnings.Add(new AdminQuotaRecommendationDto
            {
                Severity = "warning",
                Title = "Runtime projects chưa sẵn sàng",
                Detail = "Không bật/tắt project khi backend chưa đọc được nguồn runtime thật.",
            });
            return new List<AdminRuntimeProjectDto>();
        }
    }

    private async Task<List<AdminRuntimeTelemetryDto>> TryGetTelemetryAsync(
        List<AdminQuotaRecommendationDto> warnings,
        CancellationToken cancellationToken)
    {
        try
        {
            return await _runtimeProjectService.GetTelemetryAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load runtime telemetry for quota overview.");
            warnings.Add(new AdminQuotaRecommendationDto
            {
                Severity = "warning",
                Title = "Telemetry token chưa sẵn sàng",
                Detail = "Timeline/model mix chỉ hiển thị khi backend đọc được usage metadata thật.",
            });
            return new List<AdminRuntimeTelemetryDto>();
        }
    }

    private static List<AdminQuotaProviderDto> BuildGeminiProviders(
        AdminRuntimeSnapshotDto? snapshot,
        IReadOnlyCollection<AdminRuntimeProjectDto> runtimeProjects)
    {
        if (snapshot?.Projects.Count > 0)
        {
            return snapshot.Projects
                .Select(project => BuildProviderFromSnapshot(project, snapshot.Limits, runtimeProjects))
                .Where(provider => !string.IsNullOrWhiteSpace(provider.ProjectAlias) || !string.IsNullOrWhiteSpace(provider.ProjectId))
                .OrderBy(provider => provider.ProviderLabel, StringComparer.OrdinalIgnoreCase)
                .ThenBy(provider => provider.ProjectAlias, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        return runtimeProjects
            .Select(BuildProviderFromRuntimeProject)
            .OrderBy(provider => provider.ProjectAlias, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static AdminQuotaProviderDto BuildProviderFromSnapshot(
        RuntimeProjectStateDto project,
        RuntimeLimitsDto limits,
        IReadOnlyCollection<AdminRuntimeProjectDto> runtimeProjects)
    {
        var runtimeProject = FindRuntimeProject(project, runtimeProjects);
        var provider = new AdminQuotaProviderDto
        {
            Provider = GeminiProvider,
            ProviderLabel = "Gemini",
            RuntimeProjectId = runtimeProject?.RuntimeProjectId ?? project.ProjectId,
            ProjectId = project.ProjectId,
            ProjectAlias = project.ProjectAlias,
            KeyAlias = project.KeyAlias,
            Model = project.Model,
            State = string.IsNullOrWhiteSpace(project.State) ? runtimeProject?.State ?? "unknown" : project.State,
            IsEnabled = runtimeProject?.IsEnabled ?? project.Available,
            Available = project.Available,
            AvailabilityReason = project.AvailabilityReason,
            QuotaSource = project.QuotaSource,
            LastUsedAt = project.LastUsedAt ?? runtimeProject?.LastUsedAt,
            AvailableAfter = project.AvailableAfter ?? project.CooldownUntil,
            TotalRequests = project.TotalRequests,
            TotalTokens = project.TotalTokens,
        };

        AddWindow(provider.Windows, "rpm", "session", project.RpmUsed, project.RpmRemaining, limits.Rpm, project.RpmRecoveryAt);
        AddWindow(provider.Windows, "tpm", "tokens", project.TpmUsed, project.TpmRemaining, limits.Tpm, project.TpmRecoveryAt);
        AddWindow(provider.Windows, "rpd", "daily", project.RpdUsed, project.RpdRemaining, limits.Rpd, project.RpdRecoveryAt);

        return provider;
    }

    private static AdminQuotaProviderDto BuildProviderFromRuntimeProject(AdminRuntimeProjectDto project)
    {
        var provider = new AdminQuotaProviderDto
        {
            Provider = GeminiProvider,
            ProviderLabel = "Gemini",
            RuntimeProjectId = project.RuntimeProjectId,
            ProjectId = project.ProjectId,
            ProjectAlias = project.ProjectAlias,
            KeyAlias = project.PrimaryKeyName,
            Model = project.LastModel ?? "gemini",
            State = project.State,
            IsEnabled = project.IsEnabled,
            Available = project.IsEnabled && string.Equals(project.State, "available", StringComparison.OrdinalIgnoreCase),
            AvailabilityReason = project.LastProviderStatus,
            QuotaSource = "runtime-projects",
            LastUsedAt = project.LastUsedAt,
            AvailableAfter = project.CooldownUntil,
            TotalRequests = project.TotalRequests,
            TotalTokens = 0,
        };

        var dailyLimit = project.KeyCount > 0 ? project.KeyCount * 20 : (int?)null;
        AddWindow(
            provider.Windows,
            "rpd",
            "daily",
            project.TotalRequests,
            dailyLimit.HasValue ? Math.Max(0, dailyLimit.Value - project.TotalRequests) : null,
            dailyLimit,
            null);

        return provider;
    }

    private static AdminRuntimeProjectDto? FindRuntimeProject(
        RuntimeProjectStateDto snapshotProject,
        IReadOnlyCollection<AdminRuntimeProjectDto> runtimeProjects)
    {
        if (snapshotProject.PrimaryKeyId != Guid.Empty)
        {
            var byKey = runtimeProjects.FirstOrDefault(project => project.PrimaryKeyId == snapshotProject.PrimaryKeyId);
            if (byKey != null)
            {
                return byKey;
            }
        }

        if (!string.IsNullOrWhiteSpace(snapshotProject.ProjectId))
        {
            var byProjectId = runtimeProjects.FirstOrDefault(project =>
                string.Equals(project.RuntimeProjectId, snapshotProject.ProjectId, StringComparison.OrdinalIgnoreCase)
                || string.Equals(project.ProjectId, snapshotProject.ProjectId, StringComparison.OrdinalIgnoreCase));
            if (byProjectId != null)
            {
                return byProjectId;
            }
        }

        return runtimeProjects.FirstOrDefault(project =>
            !string.IsNullOrWhiteSpace(snapshotProject.ProjectAlias)
            && string.Equals(project.ProjectAlias, snapshotProject.ProjectAlias, StringComparison.OrdinalIgnoreCase));
    }

    private static void AddWindow(
        List<AdminQuotaWindowDto> windows,
        string kind,
        string label,
        int? used,
        int? remaining,
        int? configuredLimit,
        string? recoveryAt)
    {
        if (!used.HasValue && !remaining.HasValue && !configuredLimit.HasValue)
        {
            return;
        }

        var normalizedUsed = Math.Max(0, used ?? 0);
        var normalizedRemaining = Math.Max(0, remaining ?? Math.Max(0, (configuredLimit ?? normalizedUsed) - normalizedUsed));
        var limit = ResolveLimit(normalizedUsed, normalizedRemaining, configuredLimit);
        var percentUsed = limit.HasValue && limit.Value > 0
            ? Math.Clamp((double)normalizedUsed / limit.Value * 100, 0, 100)
            : 0;

        windows.Add(new AdminQuotaWindowDto
        {
            Kind = kind,
            Label = label,
            Used = normalizedUsed,
            Remaining = normalizedRemaining,
            Limit = limit,
            PercentUsed = Math.Round(percentUsed, 2),
            PercentRemaining = Math.Round(Math.Clamp(100 - percentUsed, 0, 100), 2),
            RecoveryAt = recoveryAt,
        });
    }

    private static int? ResolveLimit(int used, int remaining, int? configuredLimit)
    {
        var derivedLimit = used + remaining;
        if (derivedLimit > 0)
        {
            return derivedLimit;
        }

        return configuredLimit;
    }

    private static List<AdminQuotaTimelinePointDto> BuildTimeline(
        IReadOnlyCollection<AdminRuntimeTelemetryDto> telemetry,
        string window)
    {
        var cutoff = DateTime.UtcNow.AddDays(-ResolveWindowDays(window));
        return telemetry
            .Select(row => new { Row = row, Usage = ParseUsageMetadata(row.UsageMetadataJson) })
            .Where(item => item.Usage != null && item.Row.CompletedAt >= cutoff)
            .GroupBy(item => item.Row.CompletedAt.Date)
            .Select(group => new AdminQuotaTimelinePointDto
            {
                Date = group.Key.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                InputTokens = group.Sum(item => item.Usage!.InputTokens),
                OutputTokens = group.Sum(item => item.Usage!.OutputTokens),
                TotalTokens = group.Sum(item => item.Usage!.TotalTokens),
                RequestCount = group.Count(),
            })
            .OrderBy(point => point.Date, StringComparer.Ordinal)
            .ToList();
    }

    private static List<AdminQuotaModelMixDto> BuildModelMix(
        IReadOnlyCollection<AdminRuntimeTelemetryDto> telemetry,
        string window)
    {
        var cutoff = DateTime.UtcNow.AddDays(-ResolveWindowDays(window));
        return telemetry
            .Select(row => new { Row = row, Usage = ParseUsageMetadata(row.UsageMetadataJson) })
            .Where(item => item.Usage != null && item.Row.CompletedAt >= cutoff)
            .GroupBy(item => string.IsNullOrWhiteSpace(item.Row.Model) ? "unknown" : item.Row.Model)
            .Select(group => new AdminQuotaModelMixDto
            {
                Provider = GeminiProvider,
                Model = group.Key,
                RequestCount = group.Count(),
                InputTokens = group.Sum(item => item.Usage!.InputTokens),
                OutputTokens = group.Sum(item => item.Usage!.OutputTokens),
                TotalTokens = group.Sum(item => item.Usage!.TotalTokens),
            })
            .OrderByDescending(model => model.TotalTokens)
            .ToList();
    }

    private static AdminQuotaCostEstimateDto BuildCostEstimate(IReadOnlyCollection<AdminQuotaModelMixDto> modelMix)
    {
        return new AdminQuotaCostEstimateDto
        {
            Currency = "USD",
            EstimatedTotal = 0,
            Source = "not_configured",
            InputTokens = modelMix.Sum(model => model.InputTokens),
            OutputTokens = modelMix.Sum(model => model.OutputTokens),
            TotalTokens = modelMix.Sum(model => model.TotalTokens),
            Items = modelMix.Select(model => new AdminQuotaCostEstimateItemDto
            {
                Provider = model.Provider,
                Model = model.Model,
                TotalTokens = model.TotalTokens,
                EstimatedCost = 0,
                PricingSource = "not_configured",
            }).ToList(),
        };
    }

    private static List<AdminQuotaRecommendationDto> BuildRecommendations(AdminQuotaOverviewDto overview)
    {
        var recommendations = new List<AdminQuotaRecommendationDto>();

        if (overview.Providers.Count == 0)
        {
            recommendations.Add(new AdminQuotaRecommendationDto
            {
                Severity = "info",
                Title = "Chưa có dữ liệu token thật",
                Detail = "Không render card giả cho Codex/OpenAI/Claude khi backend chưa có adapter dữ liệu thật.",
            });
            return recommendations;
        }

        foreach (var provider in overview.Providers)
        {
            if (provider.Windows.Any(window => window.Limit.HasValue && window.Limit.Value > 0 && window.Remaining == 0))
            {
                recommendations.Add(new AdminQuotaRecommendationDto
                {
                    Severity = "critical",
                    Title = $"{provider.ProjectAlias} đã hết quota",
                    Detail = "Ưu tiên giữ project này disabled hoặc chuyển traffic sang project còn quota.",
                });
                continue;
            }

            if (IsAuthInvalid(provider.State) || string.Equals(provider.AvailabilityReason, "auth_invalid", StringComparison.OrdinalIgnoreCase))
            {
                recommendations.Add(new AdminQuotaRecommendationDto
                {
                    Severity = "critical",
                    Title = $"{provider.ProjectAlias} cần kiểm tra credential",
                    Detail = "Provider báo lỗi xác thực; không tự bật lại trước khi probe thành công.",
                });
                continue;
            }

            if (IsRateLimited(provider.State))
            {
                recommendations.Add(new AdminQuotaRecommendationDto
                {
                    Severity = "warning",
                    Title = $"{provider.ProjectAlias} đang cooldown",
                    Detail = "Chờ recovery time hoặc giảm traffic trước khi đưa project về pool chính.",
                });
            }
        }

        if (overview.CostEstimate.TotalTokens > 0 && overview.CostEstimate.Source == "not_configured")
        {
            recommendations.Add(new AdminQuotaRecommendationDto
            {
                Severity = "info",
                Title = "Chi phí đang ở chế độ token-only",
                Detail = "Backend chưa có pricing table nên chỉ trả token thật, không tự bịa USD estimate.",
            });
        }

        return recommendations;
    }

    private static TokenUsage? ParseUsageMetadata(string? usageMetadataJson)
    {
        if (string.IsNullOrWhiteSpace(usageMetadataJson))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(usageMetadataJson);
            var root = document.RootElement;
            var inputTokens = ReadInt(root, "promptTokenCount")
                ?? ReadInt(root, "inputTokens")
                ?? ReadInt(root, "prompt_tokens")
                ?? 0;
            var outputTokens = ReadInt(root, "candidatesTokenCount")
                ?? ReadInt(root, "outputTokens")
                ?? ReadInt(root, "completion_tokens")
                ?? 0;
            var totalTokens = ReadInt(root, "totalTokenCount")
                ?? ReadInt(root, "totalTokens")
                ?? ReadInt(root, "total_tokens")
                ?? inputTokens + outputTokens;

            if (totalTokens <= 0 && inputTokens <= 0 && outputTokens <= 0)
            {
                return null;
            }

            if (totalTokens <= 0)
            {
                totalTokens = inputTokens + outputTokens;
            }

            return new TokenUsage(inputTokens, outputTokens, totalTokens);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static int? ReadInt(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property) || property.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return property.ValueKind switch
        {
            JsonValueKind.Number when property.TryGetInt32(out var value) => value,
            JsonValueKind.String when int.TryParse(property.GetString(), out var value) => value,
            _ => null,
        };
    }

    private static AdminQuotaBulkActionTargetDto ToBulkTarget(AdminQuotaProviderDto provider, string reason)
    {
        return new AdminQuotaBulkActionTargetDto
        {
            RuntimeProjectId = provider.RuntimeProjectId,
            ProjectAlias = provider.ProjectAlias,
            State = provider.State,
            IsEnabled = provider.IsEnabled,
            Reason = reason,
        };
    }

    private static bool IsEmptyProvider(AdminQuotaProviderDto provider)
    {
        return provider.TotalRequests == 0
            && provider.TotalTokens == 0
            && provider.Windows.All(window => window.Used == 0);
    }

    private static bool IsSafeToEnable(AdminQuotaProviderDto provider)
    {
        return !IsAuthInvalid(provider.State)
            && !IsRateLimited(provider.State)
            && !string.Equals(provider.State, "exhausted", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAuthInvalid(string? state)
    {
        return string.Equals(state, "auth_invalid", StringComparison.OrdinalIgnoreCase)
            || string.Equals(state, "unauthenticated", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsRateLimited(string? state)
    {
        return string.Equals(state, "cooling_down", StringComparison.OrdinalIgnoreCase)
            || string.Equals(state, "rate_limited", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ShouldIncludeGemini(string provider)
    {
        return string.Equals(provider, AllProviders, StringComparison.OrdinalIgnoreCase)
            || string.Equals(provider, GeminiProvider, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeProvider(string? provider)
    {
        var normalized = provider?.Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? AllProviders : normalized;
    }

    private static string NormalizeWindow(string? window)
    {
        return window?.Trim().ToLowerInvariant() switch
        {
            "1d" => "1d",
            "24h" => "1d",
            "30d" => "30d",
            _ => "7d",
        };
    }

    private static int ResolveWindowDays(string window)
    {
        return window switch
        {
            "1d" => 1,
            "30d" => 30,
            _ => 7,
        };
    }

    private static string NormalizeAction(string? action)
    {
        var normalized = action?.Trim().ToLowerInvariant();
        return normalized switch
        {
            TurnOffEmptyAction => TurnOffEmptyAction,
            TurnOnAvailableAction => TurnOnAvailableAction,
            _ => throw new ArgumentException($"Unsupported quota bulk action: {action}", nameof(action)),
        };
    }

    private sealed record TokenUsage(int InputTokens, int OutputTokens, int TotalTokens);
}
