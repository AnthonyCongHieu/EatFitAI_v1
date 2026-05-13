using System.Collections.Concurrent;
using System.Reflection;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class AdminControlPlaneService : IAdminControlPlaneService
{
    private static readonly TimeSpan SnapshotTtl = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan ConfigSnapshotTtl = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan RefreshCooldown = TimeSpan.FromSeconds(60);
    private static readonly StringComparer KeyComparer = StringComparer.OrdinalIgnoreCase;
    private static readonly ConcurrentDictionary<string, DateTimeOffset> NextAllowedRefresh = new(KeyComparer);

    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAdminRuntimeSnapshotCache _runtimeSnapshotCache;
    private readonly ILogger<AdminControlPlaneService> _logger;
    private readonly SemaphoreSlim _snapshotLock = new(1, 1);

    private AdminControlPlaneSnapshotDto? _snapshot;
    private DateTimeOffset _snapshotExpiresAt;

    public AdminControlPlaneService(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        IAdminRuntimeSnapshotCache runtimeSnapshotCache,
        ILogger<AdminControlPlaneService> logger)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _runtimeSnapshotCache = runtimeSnapshotCache;
        _logger = logger;
    }

    public async Task<AdminControlPlaneSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        if (_snapshot != null && DateTimeOffset.UtcNow < _snapshotExpiresAt)
        {
            return _snapshot;
        }

        await _snapshotLock.WaitAsync(cancellationToken);
        try
        {
            if (_snapshot != null && DateTimeOffset.UtcNow < _snapshotExpiresAt)
            {
                return _snapshot;
            }

            _snapshot = await BuildSnapshotAsync(cancellationToken);
            _snapshotExpiresAt = DateTimeOffset.UtcNow.Add(SnapshotTtl);
            return _snapshot;
        }
        finally
        {
            _snapshotLock.Release();
        }
    }

    public async Task<AdminControlPlaneRefreshResultDto> RefreshAsync(
        AdminControlPlaneRefreshRequest request,
        HttpContext httpContext,
        CancellationToken cancellationToken = default)
    {
        var justification = request.Justification?.Trim();
        if (string.IsNullOrWhiteSpace(justification) || justification.Length < 8)
        {
            throw new ArgumentException("Refresh production cần justification rõ ràng tối thiểu 8 ký tự.", nameof(request));
        }

        var requestedTargets = NormalizeTargets(request.Targets);
        var now = DateTimeOffset.UtcNow;
        var targetResults = new List<AdminControlPlaneRefreshTargetResultDto>();

        foreach (var target in requestedTargets)
        {
            if (NextAllowedRefresh.TryGetValue(target, out var nextAllowed) && now < nextAllowed)
            {
                targetResults.Add(new AdminControlPlaneRefreshTargetResultDto
                {
                    Target = target,
                    Status = "rate_limited",
                    Detail = "Target vừa được refresh; dùng snapshot cache để tránh quota/request nền không cần thiết.",
                    NextAllowedRefreshAt = nextAllowed.UtcDateTime,
                });
                continue;
            }

            try
            {
                if (target is "runtime" or "quota")
                {
                    await _runtimeSnapshotCache.RefreshNowAsync(cancellationToken);
                }

                NextAllowedRefresh[target] = DateTimeOffset.UtcNow.Add(RefreshCooldown);
                targetResults.Add(new AdminControlPlaneRefreshTargetResultDto
                {
                    Target = target,
                    Status = "refreshed",
                    Detail = target is "runtime" or "quota"
                        ? "Runtime cache đã được refresh qua backend."
                        : "Control-plane cache đã được làm mới từ nguồn backend/config an toàn.",
                    NextAllowedRefreshAt = NextAllowedRefresh[target].UtcDateTime,
                });
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Control-plane refresh failed for target {Target}", target);
                targetResults.Add(new AdminControlPlaneRefreshTargetResultDto
                {
                    Target = target,
                    Status = "failed",
                    Detail = ex.GetType().Name,
                });
            }
        }

        _snapshot = await BuildSnapshotAsync(cancellationToken);
        _snapshotExpiresAt = DateTimeOffset.UtcNow.Add(SnapshotTtl);

        await WriteAuditAsync(httpContext, requestedTargets, justification, targetResults, cancellationToken);

        return new AdminControlPlaneRefreshResultDto
        {
            RequestedAt = now.UtcDateTime,
            Justification = justification,
            Targets = targetResults,
            Snapshot = _snapshot,
        };
    }

    private async Task<AdminControlPlaneSnapshotDto> BuildSnapshotAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var runtimeResult = await TryGetRuntimeSnapshotAsync(cancellationToken);
        var databaseResult = await TryCheckDatabaseAsync(cancellationToken);
        var services = BuildServices(now, runtimeResult, databaseResult);
        var quota = BuildQuota(now, runtimeResult.Snapshot);
        var evidence = services
            .SelectMany(service => service.Evidence)
            .Concat(BuildPolicyEvidence(now))
            .ToList();

        return new AdminControlPlaneSnapshotDto
        {
            CheckedAt = now,
            Environment = _configuration["ASPNETCORE_ENVIRONMENT"]
                ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                ?? "unknown",
            CacheTtlSeconds = (int)SnapshotTtl.TotalSeconds,
            Services = services,
            Quota = quota,
            Release = BuildRelease(now),
            Incidents = BuildIncidents(services, now),
            CleanupCandidates = BuildCleanupCandidates(),
            Evidence = evidence,
        };
    }

    private async Task<(AdminRuntimeSnapshotDto? Snapshot, string? Error)> TryGetRuntimeSnapshotAsync(CancellationToken cancellationToken)
    {
        try
        {
            return (await _runtimeSnapshotCache.GetLatestAsync(cancellationToken), null);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read runtime snapshot for admin control plane.");
            return (null, ex.GetType().Name);
        }
    }

    private async Task<(bool? CanConnect, string Source, string? Error)> TryCheckDatabaseAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return (await context.Database.CanConnectAsync(cancellationToken), "ef-can-connect", null);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to run database readiness check for admin control plane.");
            return (null, "ef-can-connect", ex.GetType().Name);
        }
    }

    private List<AdminControlPlaneServiceDto> BuildServices(
        DateTime now,
        (AdminRuntimeSnapshotDto? Snapshot, string? Error) runtime,
        (bool? CanConnect, string Source, string? Error) database)
    {
        var services = new List<AdminControlPlaneServiceDto>
        {
            CreateService(
                now,
                "backend-api",
                "Backend API",
                "aws-lightsail",
                "critical",
                "healthy",
                "current-request",
                "Không cần keep-alive; readiness/metrics xử lý qua backend và Lightsail.",
                Evidence("backend-api", "http", "current-request", "healthy", "Control-plane endpoint đang được phục vụ bởi backend hiện tại.", now)),

            CreateService(
                now,
                "ai-provider",
                "AI Provider",
                "aws-lightsail-private",
                "critical",
                MapRuntimeStatus(runtime),
                runtime.Snapshot?.RuntimeStatusSource ?? "runtime-cache",
                runtime.Error == null
                    ? "Giữ provider private; chỉ refresh runtime cache thủ công khi cần."
                    : "Kiểm tra AI provider private health và runtime cache.",
                Evidence(
                    "ai-provider",
                    "runtime-cache",
                    runtime.Snapshot?.RuntimeStatusSource ?? "runtime-cache",
                    MapRuntimeStatus(runtime),
                    runtime.Snapshot == null
                        ? $"Runtime snapshot chưa sẵn sàng: {runtime.Error ?? "unknown"}"
                        : $"Pool={runtime.Snapshot.PoolHealth}; available={runtime.Snapshot.AvailableProjectCount}; source={runtime.Snapshot.RuntimeStatusSource}",
                    runtime.Snapshot?.CheckedAt ?? now)),

            CreateService(
                now,
                "supabase",
                "Supabase DB/Auth",
                "supabase",
                "critical",
                MapDatabaseStatus(database),
                database.Source,
                database.CanConnect == true
                    ? "Không ping Supabase Auth từ browser; dùng backend readiness và audit."
                    : "Kiểm tra connection string/Supabase env và readiness endpoint.",
                Evidence(
                    "supabase",
                    "database",
                    database.Source,
                    MapDatabaseStatus(database),
                    database.CanConnect == true
                        ? "Database connection check passed."
                        : $"Database connection check unavailable: {database.Error ?? "not_connected"}",
                    now)),
        };

        services.Add(BuildConfigService(
            now,
            "cloudflare-r2",
            "Cloudflare R2 Media",
            "cloudflare-r2",
            "high",
            "Media:R2",
            new[] { "Media:R2:AccountId", "Media:R2:Bucket", "Media:R2:AccessKeyId", "Media:R2:SecretAccessKey" },
            "Không list bucket từ admin page load; dùng aggregate/cache và CDN/custom-domain policy."));
        services.Add(BuildConfigService(
            now,
            "brevo-email",
            "Brevo Transactional Email",
            "brevo",
            "high",
            "Brevo",
            new[] { "Brevo:BaseUrl", "Brevo:ApiKey", "Brevo:SenderEmail", "Brevo:SenderName" },
            "Gửi email theo queue/backoff; hiển thị 429/rate-limit từ backend nếu có."));
        services.Add(BuildConfigService(
            now,
            "gemini",
            "Gemini API",
            "google-gemini",
            "critical",
            "AIProvider",
            new[] { "AIProvider:VisionBaseUrl" },
            "Không probe model từ admin; dùng runtime/quota snapshot cache."));
        services.Add(BuildConfigService(
            now,
            "expo-push",
            "Expo/FCM Push",
            "expo-fcm",
            "medium",
            "ExpoPush",
            Array.Empty<string>(),
            "Access token có thể optional; campaign phải có audience preview, batch và backoff."));
        services.Add(BuildConfigService(
            now,
            "vercel-admin",
            "Vercel Admin Web",
            "vercel",
            "medium",
            "AllowedOrigins",
            Array.Empty<string>(),
            "Giữ admin request nền thấp để tránh observability/event usage không cần thiết."));
        services.Add(BuildConfigService(
            now,
            "duckdns-caddy",
            "DuckDNS/Caddy TLS",
            "duckdns-caddy",
            "high",
            "ProductionDns",
            Array.Empty<string>(),
            "Theo dõi qua runbook DNS/TLS; backend không tự gọi DNS provider."));
        services.Add(BuildConfigService(
            now,
            "openfoodfacts",
            "Open Food Facts Barcode",
            "openfoodfacts",
            "medium",
            "FoodBarcodeProvider",
            new[] { "FoodBarcodeProvider:TemplateUrl", "FoodBarcodeProvider:Name" },
            "Dùng cache và custom User-Agent; không bulk-probe barcode từ admin."));
        services.Add(CreateService(
            now,
            "render-cold-backup",
            "Render Cold Backup",
            "render",
            "low",
            "legacy",
            "repo-policy",
            "Giữ suspended/cold backup; không wake trong production admin.",
            Evidence("render-cold-backup", "policy", "repo-policy", "legacy", "Render không còn là production runtime chính.", now)));

        return services;
    }

    private AdminControlPlaneServiceDto BuildConfigService(
        DateTime now,
        string serviceId,
        string label,
        string provider,
        string criticality,
        string source,
        IReadOnlyCollection<string> requiredKeys,
        string recommendedAction)
    {
        var missingKeys = requiredKeys
            .Where(key => string.IsNullOrWhiteSpace(_configuration[key]))
            .ToList();
        var status = missingKeys.Count == 0
            ? requiredKeys.Count == 0 ? "unknown" : "healthy"
            : "not_configured";
        var summary = missingKeys.Count == 0
            ? requiredKeys.Count == 0
                ? "No safe live probe configured; status intentionally unknown."
                : "Required backend configuration is present."
            : $"Missing configuration keys: {string.Join(", ", missingKeys)}";

        return CreateService(
            now,
            serviceId,
            label,
            provider,
            criticality,
            status,
            source,
            recommendedAction,
            Evidence(serviceId, "config-presence", source, status, summary, now));
    }

    private static AdminControlPlaneServiceDto CreateService(
        DateTime now,
        string serviceId,
        string label,
        string provider,
        string criticality,
        string status,
        string source,
        string recommendedAction,
        AdminControlPlaneEvidenceDto evidence)
    {
        return new AdminControlPlaneServiceDto
        {
            ServiceId = serviceId,
            Label = label,
            Provider = provider,
            Criticality = criticality,
            Status = status,
            LastCheckedAt = evidence.ObservedAt,
            FreshUntil = now.Add(status == "healthy" ? SnapshotTtl : ConfigSnapshotTtl),
            Source = source,
            RecommendedAction = recommendedAction,
            Evidence = new List<AdminControlPlaneEvidenceDto> { evidence },
        };
    }

    private List<AdminControlPlaneQuotaDto> BuildQuota(DateTime now, AdminRuntimeSnapshotDto? runtime)
    {
        if (runtime == null)
        {
            return new List<AdminControlPlaneQuotaDto>
            {
                new()
                {
                    Provider = "gemini",
                    Status = "unknown",
                    Window = "runtime-cache",
                    LastCheckedAt = now,
                    Source = "runtime-cache",
                    RecommendedAction = "Runtime cache chưa có quota snapshot; không probe Gemini từ admin.",
                }
            };
        }

        return new List<AdminControlPlaneQuotaDto>
        {
            new()
            {
                Provider = "gemini",
                Status = MapRuntimeStatus((runtime, null)),
                Used = runtime.Projects.Sum(project => project.RpdUsed ?? 0),
                Remaining = runtime.Projects.Sum(project => project.RpdRemaining ?? 0),
                Limit = runtime.Limits.Rpd,
                Window = "rpd",
                LastCheckedAt = runtime.CheckedAt,
                Source = runtime.RuntimeStatusSource,
                RecommendedAction = "Dùng snapshot cache; chỉ refresh thủ công khi điều tra quota.",
            }
        };
    }

    private AdminControlPlaneReleaseDto BuildRelease(DateTime now)
    {
        return new AdminControlPlaneReleaseDto
        {
            BackendSha = FirstConfigured(
                "Release:Sha",
                "SOURCE_VERSION",
                "GIT_COMMIT_SHA",
                "RENDER_GIT_COMMIT",
                "VERCEL_GIT_COMMIT_SHA") ?? "unknown",
            BackendVersion = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown",
            MobileChannel = FirstConfigured("Mobile:Channel", "EAS_BUILD_PROFILE") ?? "production",
            MobileBuild = FirstConfigured("Mobile:BuildNumber", "EAS_BUILD_ID") ?? "unknown",
            RuntimeTarget = "aws-lightsail",
            RollbackTarget = "render-cold-backup",
            CheckedAt = now,
        };
    }

    private static List<AdminControlPlaneIncidentDto> BuildIncidents(
        IEnumerable<AdminControlPlaneServiceDto> services,
        DateTime now)
    {
        return services
            .Where(service => service.Criticality is "critical" or "high")
            .Where(service => service.Status is "down" or "degraded" or "not_configured")
            .Select(service => new AdminControlPlaneIncidentDto
            {
                IncidentId = $"service-{service.ServiceId}",
                Severity = service.Criticality == "critical" ? "high" : "medium",
                Title = $"{service.Label} cần kiểm tra",
                Status = "open",
                CreatedAt = now,
                Source = "control-plane-snapshot",
            })
            .ToList();
    }

    private static List<AdminControlPlaneCleanupCandidateDto> BuildCleanupCandidates()
    {
        return new List<AdminControlPlaneCleanupCandidateDto>
        {
            Candidate("keep-alive", "admin-runtime", "Bỏ keep-alive route/UI", "`/api/keep-alive` và wake dev servers không còn phù hợp Lightsail production.", "high", "Remove after frontend is wired to control-plane refresh."),
            Candidate("render-fallback", "admin-runtime", "Bỏ fallback Render mặc định", "Production target là Lightsail/DuckDNS; Render chỉ là cold backup.", "high", "Fail closed when API_BASE_URL is missing."),
            Candidate("runtime-sse-default", "runtime", "Tắt realtime/SSE mặc định", "Realtime connection tăng request và không cần cho ops console mặc định.", "medium", "Keep only behind explicit incident mode."),
            Candidate("coming-soon-nav", "navigation", "Ẩn module coming soon khỏi nav chính", "Nav production nên ưu tiên chức năng có backend contract thật.", "low", "Move to roadmap/internal notes."),
            Candidate("public-ai-smoke-url", "infrastructure", "Đóng public AI provider smoke URL sau QA", "AI provider nên nhận traffic nội bộ backend qua private Lightsail networking.", "high", "Keep public endpoint only as temporary smoke runbook item."),
        };
    }

    private static AdminControlPlaneCleanupCandidateDto Candidate(
        string id,
        string area,
        string title,
        string evidence,
        string risk,
        string recommendation)
    {
        return new AdminControlPlaneCleanupCandidateDto
        {
            CandidateId = id,
            Area = area,
            Title = title,
            Evidence = evidence,
            Risk = risk,
            Recommendation = recommendation,
            ApprovalState = "pending_approval",
        };
    }

    private static List<AdminControlPlaneEvidenceDto> BuildPolicyEvidence(DateTime now)
    {
        return new List<AdminControlPlaneEvidenceDto>
        {
            Evidence("cost-policy", "policy", "official-docs", "healthy", "Production admin uses TTL/manual refresh to avoid unnecessary provider quota usage.", now),
            Evidence("runtime-policy", "policy", "repo-runbook", "healthy", "Lightsail is primary runtime; Render is cold backup only.", now),
        };
    }

    private static AdminControlPlaneEvidenceDto Evidence(
        string target,
        string kind,
        string source,
        string status,
        string summary,
        DateTime observedAt)
    {
        return new AdminControlPlaneEvidenceDto
        {
            Target = target,
            Kind = kind,
            Source = source,
            Status = status,
            Summary = summary,
            ObservedAt = observedAt,
        };
    }

    private static string MapRuntimeStatus((AdminRuntimeSnapshotDto? Snapshot, string? Error) runtime)
    {
        if (runtime.Snapshot == null)
        {
            return runtime.Error == null ? "unknown" : "degraded";
        }

        if (!string.IsNullOrWhiteSpace(runtime.Snapshot.RuntimeStatusError))
        {
            return "degraded";
        }

        if (runtime.Snapshot.AvailableProjectCount > 0
            || string.Equals(runtime.Snapshot.PoolHealth, "Healthy", StringComparison.OrdinalIgnoreCase)
            || string.Equals(runtime.Snapshot.PoolHealth, "Live", StringComparison.OrdinalIgnoreCase))
        {
            return "healthy";
        }

        return string.Equals(runtime.Snapshot.PoolHealth, "Unavailable", StringComparison.OrdinalIgnoreCase)
            ? "down"
            : "unknown";
    }

    private static string MapDatabaseStatus((bool? CanConnect, string Source, string? Error) database)
    {
        if (database.CanConnect == true)
        {
            return "healthy";
        }

        if (database.CanConnect == false)
        {
            return "down";
        }

        return database.Error == null ? "unknown" : "degraded";
    }

    private string? FirstConfigured(params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = _configuration[key] ?? Environment.GetEnvironmentVariable(key.Replace(':', '_'));
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static IReadOnlyList<string> NormalizeTargets(IEnumerable<string>? targets)
    {
        var normalized = (targets ?? new[] { "control-plane" })
            .Select(target => target.Trim().ToLowerInvariant())
            .Where(target => !string.IsNullOrWhiteSpace(target))
            .Select(target => target switch
            {
                "all" => "control-plane",
                "snapshot" => "control-plane",
                "health" => "infrastructure",
                "runtime-quota" => "quota",
                _ => target,
            })
            .Where(target => target is "control-plane" or "infrastructure" or "runtime" or "quota" or "release")
            .Distinct(KeyComparer)
            .ToList();

        return normalized.Count == 0 ? new[] { "control-plane" } : normalized;
    }

    private async Task WriteAuditAsync(
        HttpContext httpContext,
        IReadOnlyList<string> requestedTargets,
        string justification,
        IReadOnlyList<AdminControlPlaneRefreshTargetResultDto> targetResults,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var auditService = scope.ServiceProvider.GetRequiredService<IAdminAuditService>();
            await auditService.WriteAsync(httpContext, new AdminAuditWriteRequest
            {
                Action = "control-plane.refresh",
                Entity = "control-plane",
                EntityId = string.Join(",", requestedTargets),
                Outcome = targetResults.Any(target => target.Status == "failed") ? "partial" : "success",
                Severity = "info",
                Justification = justification,
                Detail = string.Join("; ", targetResults.Select(target => $"{target.Target}:{target.Status}")),
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write control-plane refresh audit event.");
        }
    }
}
