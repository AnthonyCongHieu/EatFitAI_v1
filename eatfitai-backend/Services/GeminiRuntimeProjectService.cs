using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.AdminAi;
using EatFitAI.API.Models;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class GeminiRuntimeProjectService : IGeminiRuntimeProjectService
{
    private sealed class RuntimeProjectState
    {
        public bool? IsEnabled { get; set; }
        public string ManualRole { get; set; } = "warm_spare";
        public string State { get; set; } = "available";
        public string LastProviderStatus { get; set; } = "unknown";
        public DateTime? CooldownUntilUtc { get; set; }
        public DateTime? LastSuccessAtUtc { get; set; }
        public DateTime? LastFailureAtUtc { get; set; }
        public DateTime? LastRateLimitedAtUtc { get; set; }
        public int ConsecutiveFailures { get; set; }
        public int PriorityWeight { get; set; }
        public string? LastModel { get; set; }
        public int? LastLatencyMs { get; set; }
        public string? LastUsageMetadataJson { get; set; }
        public Guid? LastKeyId { get; set; }
        public string? LastKeyName { get; set; }
    }

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IEncryptionService _encryptionService;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly ILogger<GeminiRuntimeProjectService> _logger;
    private readonly ConcurrentDictionary<string, RuntimeProjectState> _projectStates = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<Guid, string> _keyProjectIndex = new();
    private readonly ConcurrentQueue<AdminRuntimeTelemetryDto> _telemetry = new();
    private readonly SemaphoreSlim _selectionLock = new(1, 1);
    private string? _activeProjectId;
    private string? _activeProjectAlias;
    private const int MaxTelemetryRows = 300;

    public GeminiRuntimeProjectService(
        IServiceScopeFactory scopeFactory,
        IEncryptionService encryptionService,
        IAdminRealtimeEventBus eventBus,
        ILogger<GeminiRuntimeProjectService> logger)
    {
        _scopeFactory = scopeFactory;
        _encryptionService = encryptionService;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task<List<AdminRuntimeProjectDto>> GetRuntimeProjectsAsync(CancellationToken cancellationToken = default)
    {
        var groupedProjects = await LoadGroupedProjectsAsync(cancellationToken);
        return groupedProjects
            .Select(MapRuntimeProject)
            .OrderByDescending(project => project.IsActiveNow)
            .ThenBy(project => RoleRank(project.ManualRole))
            .ThenBy(project => project.CooldownUntil is null ? 0 : 1)
            .ThenBy(project => project.ProjectAlias, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public async Task<AdminRuntimeProjectDto?> GetRuntimeProjectAsync(string runtimeProjectId, CancellationToken cancellationToken = default)
    {
        var groupedProjects = await LoadGroupedProjectsAsync(cancellationToken);
        var project = groupedProjects.FirstOrDefault(item => item.RuntimeProjectId.Equals(runtimeProjectId, StringComparison.OrdinalIgnoreCase));
        return project is null ? null : MapRuntimeProject(project);
    }

    public async Task<AdminRuntimeMetricsDto> GetMetricsAsync(CancellationToken cancellationToken = default)
    {
        var projects = await GetRuntimeProjectsAsync(cancellationToken);
        var telemetryRows = await GetTelemetryAsync(cancellationToken);
        var recentWindow = DateTime.UtcNow.AddMinutes(-30);
        var recentRows = telemetryRows.Where(row => row.CompletedAt >= recentWindow).ToList();

        return new AdminRuntimeMetricsDto
        {
            ActiveProjectId = _activeProjectId,
            ActiveProjectAlias = _activeProjectAlias,
            DistinctProjectCount = projects.Count,
            AvailableProjectCount = projects.Count(project => project.State == "available"),
            CoolingDownProjectCount = projects.Count(project => project.State == "cooling_down"),
            AuthInvalidProjectCount = projects.Count(project => project.State == "auth_invalid"),
            DisabledProjectCount = projects.Count(project => !project.IsEnabled || project.State == "disabled"),
            TotalTelemetryCount = telemetryRows.Count,
            RecentSuccessCount = recentRows.Count(row => row.Outcome == "success"),
            RecentFailureCount = recentRows.Count(row => row.Outcome != "success"),
            RecentRateLimitedCount = recentRows.Count(row => row.ProviderStatusCode == 429),
        };
    }

    public Task<List<AdminRuntimeTelemetryDto>> GetTelemetryAsync(CancellationToken cancellationToken = default)
    {
        var rows = _telemetry
            .ToArray()
            .OrderByDescending(row => row.CompletedAt)
            .ToList();
        return Task.FromResult(rows);
    }

    public async Task<ProbeRuntimeProjectResult> ProbeProjectAsync(string runtimeProjectId, CancellationToken cancellationToken = default)
    {
        var project = await GetInternalProjectAsync(runtimeProjectId, cancellationToken);
        if (project is null)
        {
            return new ProbeRuntimeProjectResult
            {
                RuntimeProjectId = runtimeProjectId,
                Status = "NotFound",
                StatusCode = 404,
                Message = "Runtime project not found.",
            };
        }

        var result = await SendModelsProbeAsync(project.PrimaryKey, cancellationToken);
        ApplyProbeState(project.RuntimeProjectId, project.ProjectAlias, project.PrimaryKey, result.StatusCode, result.Status, result.LatencyMs);

        return new ProbeRuntimeProjectResult
        {
            RuntimeProjectId = project.RuntimeProjectId,
            ProjectAlias = project.ProjectAlias,
            Status = result.Status,
            StatusCode = result.StatusCode,
            Message = result.Message,
            LatencyMs = result.LatencyMs,
        };
    }

    public async Task<AdminRuntimeProjectDto?> ToggleProjectAsync(string runtimeProjectId, CancellationToken cancellationToken = default)
    {
        var normalizedRuntimeProjectId = runtimeProjectId.Trim();
        var project = await GetInternalProjectAsync(normalizedRuntimeProjectId, cancellationToken);
        if (project is null)
        {
            return null;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var keys = await LoadKeysForToggleAsync(db, normalizedRuntimeProjectId, cancellationToken);
        if (keys.Count == 0)
        {
            return null;
        }

        var nextIsActive = !keys.All(key => key.IsActive);
        foreach (var key in keys)
        {
            key.IsActive = nextIsActive;
        }

        await db.SaveChangesAsync(cancellationToken);

        var state = GetOrCreateState(normalizedRuntimeProjectId);
        state.IsEnabled = nextIsActive;
        state.State = nextIsActive ? "available" : "disabled";

        PublishStateChanged(normalizedRuntimeProjectId, project.ProjectAlias, state.State, "toggle");
        return await GetRuntimeProjectAsync(normalizedRuntimeProjectId, cancellationToken);
    }

    public async Task<AdminRuntimeProjectDto?> SetRoleAsync(string runtimeProjectId, string manualRole, CancellationToken cancellationToken = default)
    {
        var project = await GetInternalProjectAsync(runtimeProjectId, cancellationToken);
        if (project is null)
        {
            return null;
        }

        var normalized = NormalizeRole(manualRole);
        var state = GetOrCreateState(runtimeProjectId);
        state.ManualRole = normalized;
        if (normalized == "disabled")
        {
            state.IsEnabled = false;
            state.State = "disabled";
        }
        else if (state.State == "disabled")
        {
            state.IsEnabled = true;
            state.State = "available";
        }

        PublishStateChanged(runtimeProjectId, project.ProjectAlias, state.State, $"role:{normalized}");
        return await GetRuntimeProjectAsync(runtimeProjectId, cancellationToken);
    }

    public async Task<AdminRuntimeSnapshotDto> BuildSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var projects = await GetRuntimeProjectsAsync(cancellationToken);
        var active = projects.FirstOrDefault(project => project.IsActiveNow);

        return new AdminRuntimeSnapshotDto
        {
            CheckedAt = DateTime.UtcNow,
            PoolHealth = projects.Any(project => project.State == "available") ? "Healthy" : "Degraded",
            ActiveProject = active?.ProjectAlias,
            ActiveProjectId = active?.RuntimeProjectId,
            ActiveProjectAlias = active?.ProjectAlias,
            AvailableProjectCount = projects.Count(project => project.State == "available"),
            ExhaustedProjectCount = projects.Count(project => project.State == "exhausted"),
            CooldownProjectCount = projects.Count(project => project.State == "cooling_down"),
            AuthInvalidProjectCount = projects.Count(project => project.State == "auth_invalid"),
            DistinctProjectCount = projects.Count,
            Limits = new RuntimeLimitsDto
            {
                Rpd = projects.Sum(project => project.KeyCount * 20),
            },
            Projects = projects.Select(project => new RuntimeProjectStateDto
            {
                ProjectAlias = project.ProjectAlias,
                ProjectId = project.ProjectId,
                KeyAlias = project.PrimaryKeyName,
                Model = project.LastModel ?? "gemini-2.5-flash",
                State = project.State,
                Available = project.IsEnabled && project.State == "available",
                AvailabilityReason = project.LastProviderStatus,
                QuotaSource = "local-runtime-pool",
                AvailableAfter = project.CooldownUntil,
                RpdUsed = project.TotalRequests,
                RpdRemaining = Math.Max(0, (project.KeyCount * 20) - project.TotalRequests),
                TotalRequests = project.TotalRequests,
                TotalTokens = 0,
                LastUsedAt = project.LastUsedAt,
                LastProviderStatusCode = project.LastProviderStatus,
                ManualRole = project.ManualRole,
                PrimaryKeyId = project.PrimaryKeyId,
                CooldownUntil = project.CooldownUntil,
            }).ToList(),
        };
    }

    public async Task<AdminRuntimeTelemetryDto> SimulateRequestAsync(int? forcedStatusCode, string triggerSource, CancellationToken cancellationToken = default)
    {
        var startedAt = DateTime.UtcNow;
        var selection = await AcquireKeyForRequestAsync(triggerSource, cancellationToken);
        var requestId = Guid.NewGuid().ToString("N");

        int providerStatusCode;
        string outcome;
        string? providerErrorCode = null;
        string? finishReason = null;
        string? usageMetadataJson = null;

        if (forcedStatusCode.HasValue)
        {
            providerStatusCode = forcedStatusCode.Value;
            outcome = providerStatusCode >= 200 && providerStatusCode < 300 ? "success" : "failure";
            providerErrorCode = providerStatusCode switch
            {
                429 => "RESOURCE_EXHAUSTED",
                401 => "UNAUTHENTICATED",
                403 => "PERMISSION_DENIED",
                408 => "TIMEOUT",
                _ => "SIMULATED_FAILURE",
            };
        }
        else
        {
            var probe = await SendModelsProbeAsync(new GeminiKey
            {
                Id = selection.KeyId,
                EncryptedApiKey = _encryptionService.Encrypt(selection.ApiKey),
                KeyName = selection.ProjectAlias,
                Model = selection.Model,
            }, cancellationToken);

            providerStatusCode = probe.StatusCode;
            outcome = probe.Status == "Active" ? "success" : "failure";
            providerErrorCode = probe.Status;
            finishReason = probe.Message;
            if (probe.Status == "Active")
            {
                usageMetadataJson = "{\"observed\":true,\"type\":\"models_probe\"}";
            }
        }

        await RecordRequestOutcomeAsync(
            requestId,
            selection.KeyId,
            selection.RuntimeProjectId,
            selection.ProjectAlias,
            selection.Model,
            triggerSource,
            startedAt,
            providerStatusCode,
            outcome,
            usageMetadataJson,
            finishReason,
            providerErrorCode,
            null,
            cancellationToken);

        return (await GetTelemetryAsync(cancellationToken)).First(row => row.RequestId == requestId);
    }

    public async Task<Guid> ImportProjectAsync(RuntimeProjectImportRequest request, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var key = new GeminiKey
        {
            Id = Guid.NewGuid(),
            KeyName = request.KeyName.Trim(),
            EncryptedApiKey = _encryptionService.Encrypt(request.ApiKey.Trim()),
            IsActive = true,
            Tier = request.Tier,
            Model = request.Model,
            DailyQuotaLimit = request.DailyQuotaLimit,
            ProjectId = request.ProjectId.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.ProjectAlias)
                ? request.Notes
                : $"project_alias={request.ProjectAlias.Trim()}" + (string.IsNullOrWhiteSpace(request.Notes) ? string.Empty : $" | {request.Notes}"),
        };

        db.GeminiKeys.Add(key);
        await db.SaveChangesAsync(cancellationToken);

        var runtimeProjectId = ResolveRuntimeProjectId(key);
        var state = GetOrCreateState(runtimeProjectId);
        state.IsEnabled = true;
        state.State = "available";
        state.ManualRole = "warm_spare";

        PublishStateChanged(runtimeProjectId, ResolveProjectAlias(key), state.State, "import");
        return key.Id;
    }

    public async Task<(Guid KeyId, string ApiKey, string RuntimeProjectId, string ProjectAlias, string Model)> AcquireKeyForRequestAsync(string triggerSource, CancellationToken cancellationToken = default)
    {
        await _selectionLock.WaitAsync(cancellationToken);
        try
        {
            var projects = await LoadGroupedProjectsAsync(cancellationToken);
            var candidates = projects
                .Select(project => new { project, dto = MapRuntimeProject(project) })
                .Where(item => item.dto.IsEnabled && item.dto.State == "available")
                .OrderBy(item => RoleRank(item.dto.ManualRole))
                .ThenBy(item => item.dto.ConsecutiveFailures)
                .ThenBy(item => item.dto.LastUsedAt is null ? 0 : 1)
                .ThenBy(item => item.dto.LastUsedAt)
                .ThenBy(item => item.dto.PriorityWeight)
                .ToList();

            if (candidates.Count == 0)
            {
                throw new InvalidOperationException("No runtime project is currently available.");
            }

            var selected = candidates[0].project;
            _activeProjectId = selected.RuntimeProjectId;
            _activeProjectAlias = selected.ProjectAlias;
            _eventBus.Publish("runtime.project.selected", "gemini-runtime-project", selected.RuntimeProjectId, new
            {
                selected.RuntimeProjectId,
                selected.ProjectAlias,
                TriggerSource = triggerSource,
                selected.PrimaryKey.Id,
                selected.PrimaryKey.KeyName,
            });

            return (
                selected.PrimaryKey.Id,
                _encryptionService.Decrypt(selected.PrimaryKey.EncryptedApiKey),
                selected.RuntimeProjectId,
                selected.ProjectAlias,
                selected.PrimaryKey.Model
            );
        }
        finally
        {
            _selectionLock.Release();
        }
    }

    public async Task RecordRequestOutcomeAsync(
        string requestId,
        Guid keyId,
        string runtimeProjectId,
        string projectAlias,
        string model,
        string triggerSource,
        DateTime startedAtUtc,
        int providerStatusCode,
        string outcome,
        string? usageMetadataJson,
        string? finishReason,
        string? providerErrorCode,
        string? failoverFromProjectId,
        CancellationToken cancellationToken = default)
    {
        var completedAt = DateTime.UtcNow;
        var state = GetOrCreateState(runtimeProjectId);
        state.LastModel = model;
        state.LastLatencyMs = (int)(completedAt - startedAtUtc).TotalMilliseconds;
        state.LastUsageMetadataJson = usageMetadataJson;

        if (outcome == "success")
        {
            state.State = state.IsEnabled == false ? "disabled" : "available";
            state.LastProviderStatus = providerStatusCode.ToString();
            state.LastSuccessAtUtc = completedAt;
            state.ConsecutiveFailures = 0;

            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var key = await db.GeminiKeys.FindAsync([keyId], cancellationToken);
            if (key is not null)
            {
                key.DailyRequestsUsed += 1;
                key.TotalRequestsUsed += 1;
                key.LastUsedAt = completedAt;
                await db.SaveChangesAsync(cancellationToken);
                state.LastKeyId = key.Id;
                state.LastKeyName = key.KeyName;
            }
        }
        else
        {
            ApplyFailureState(state, providerStatusCode);
        }

        var row = new AdminRuntimeTelemetryDto
        {
            RequestId = requestId,
            RuntimeProjectId = runtimeProjectId,
            ProjectAlias = projectAlias,
            GeminiKeyId = keyId,
            KeyName = state.LastKeyName ?? string.Empty,
            Model = model,
            TriggerSource = triggerSource,
            StartedAt = startedAtUtc,
            CompletedAt = completedAt,
            LatencyMs = Math.Max(0, (int)(completedAt - startedAtUtc).TotalMilliseconds),
            Outcome = outcome,
            ProviderStatusCode = providerStatusCode,
            ProviderErrorCode = providerErrorCode,
            FinishReason = finishReason,
            UsageMetadataJson = usageMetadataJson,
            FailoverFromProjectId = failoverFromProjectId,
        };

        _telemetry.Enqueue(row);
        while (_telemetry.Count > MaxTelemetryRows && _telemetry.TryDequeue(out _))
        {
        }

        PublishStateChanged(runtimeProjectId, projectAlias, state.State, outcome);
        _eventBus.Publish("runtime.request.completed", "gemini-runtime-telemetry", requestId, row);
    }

    public void RecordFailure(Guid keyId, string runtimeProjectId, int statusCode)
    {
        var state = GetOrCreateState(runtimeProjectId);
        ApplyFailureState(state, statusCode);
        _eventBus.Publish("runtime.project.state_changed", "gemini-runtime-project", runtimeProjectId, new
        {
            RuntimeProjectId = runtimeProjectId,
            state.State,
            state.LastProviderStatus,
            KeyId = keyId,
        });
    }

    public string ResolveRuntimeProjectIdForKey(Guid keyId)
    {
        if (_keyProjectIndex.TryGetValue(keyId, out var runtimeProjectId) && !string.IsNullOrWhiteSpace(runtimeProjectId))
        {
            return runtimeProjectId;
        }

        return $"key-{keyId:N}";
    }

    private async Task<List<GroupedProject>> LoadGroupedProjectsAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var keys = await db.GeminiKeys
            .OrderBy(key => key.CreatedAt)
            .ToListAsync(cancellationToken);

        var grouped = keys
            .GroupBy(ResolveRuntimeProjectId, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var primary = group
                    .OrderByDescending(key => key.IsActive)
                    .ThenByDescending(key => key.LastUsedAt)
                    .ThenBy(key => key.CreatedAt)
                    .First();
                return new GroupedProject
                {
                    RuntimeProjectId = group.Key,
                    ProjectId = primary.ProjectId?.Trim() ?? group.Key,
                    ProjectAlias = ResolveProjectAlias(primary),
                    Keys = group.ToList(),
                    PrimaryKey = primary,
                };
            })
            .ToList();

        foreach (var project in grouped)
        {
            foreach (var key in project.Keys)
            {
                _keyProjectIndex[key.Id] = project.RuntimeProjectId;
            }
        }

        return grouped;
    }

    private async Task<GroupedProject?> GetInternalProjectAsync(string runtimeProjectId, CancellationToken cancellationToken)
    {
        var projects = await LoadGroupedProjectsAsync(cancellationToken);
        return projects.FirstOrDefault(project => project.RuntimeProjectId.Equals(runtimeProjectId, StringComparison.OrdinalIgnoreCase));
    }

    private AdminRuntimeProjectDto MapRuntimeProject(GroupedProject project)
    {
        var state = GetOrCreateState(project.RuntimeProjectId);
        if (state.CooldownUntilUtc.HasValue && state.CooldownUntilUtc <= DateTime.UtcNow && state.State == "cooling_down")
        {
            state.CooldownUntilUtc = null;
            state.State = project.Keys.Any(key => key.IsActive) ? "available" : "disabled";
        }

        var lastUsedAt = project.Keys
            .Where(key => key.LastUsedAt.HasValue)
            .OrderByDescending(key => key.LastUsedAt)
            .Select(key => key.LastUsedAt)
            .FirstOrDefault();

        var isEnabled = state.IsEnabled ?? project.Keys.Any(key => key.IsActive);
        var stateValue = !isEnabled ? "disabled" : state.State;

        return new AdminRuntimeProjectDto
        {
            RuntimeProjectId = project.RuntimeProjectId,
            ProjectId = project.ProjectId,
            ProjectAlias = project.ProjectAlias,
            PrimaryKeyId = project.PrimaryKey.Id,
            PrimaryKeyName = project.PrimaryKey.KeyName,
            IsEnabled = isEnabled,
            State = stateValue,
            ManualRole = NormalizeRole(state.ManualRole),
            LastProviderStatus = state.LastProviderStatus,
            CooldownUntil = state.CooldownUntilUtc?.ToString("O"),
            LastSuccessAt = state.LastSuccessAtUtc?.ToString("O"),
            LastFailureAt = state.LastFailureAtUtc?.ToString("O"),
            LastRateLimitedAt = state.LastRateLimitedAtUtc?.ToString("O"),
            ConsecutiveFailures = state.ConsecutiveFailures,
            PriorityWeight = state.PriorityWeight,
            LastModel = state.LastModel ?? project.PrimaryKey.Model,
            LastLatencyMs = state.LastLatencyMs,
            LastUsedAt = (lastUsedAt ?? state.LastSuccessAtUtc)?.ToString("O"),
            LastUsageMetadataJson = state.LastUsageMetadataJson,
            KeyCount = project.Keys.Count,
            IsActiveNow = _activeProjectId != null && _activeProjectId.Equals(project.RuntimeProjectId, StringComparison.OrdinalIgnoreCase) && stateValue == "available",
            TotalRequests = project.Keys.Sum(key => key.TotalRequestsUsed),
        };
    }

    private RuntimeProjectState GetOrCreateState(string runtimeProjectId)
    {
        return _projectStates.GetOrAdd(runtimeProjectId, _ => new RuntimeProjectState());
    }

    private static string ResolveRuntimeProjectId(GeminiKey key)
    {
        return string.IsNullOrWhiteSpace(key.ProjectId)
            ? $"key-{key.Id:N}"
            : key.ProjectId.Trim();
    }

    private static bool TryParseSingleKeyRuntimeProjectId(string runtimeProjectId, out Guid keyId)
    {
        const string Prefix = "key-";
        if (runtimeProjectId.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase))
        {
            var rawKeyId = runtimeProjectId[Prefix.Length..];
            if (Guid.TryParseExact(rawKeyId, "N", out keyId) || Guid.TryParse(rawKeyId, out keyId))
            {
                return true;
            }
        }

        keyId = Guid.Empty;
        return false;
    }

    private static async Task<List<GeminiKey>> LoadKeysForToggleAsync(ApplicationDbContext db, string runtimeProjectId, CancellationToken cancellationToken)
    {
        if (TryParseSingleKeyRuntimeProjectId(runtimeProjectId, out var keyId))
        {
            return await db.GeminiKeys
                .Where(key => key.Id == keyId)
                .ToListAsync(cancellationToken);
        }

        var candidateKeys = await db.GeminiKeys
            .Where(key => key.ProjectId != null)
            .ToListAsync(cancellationToken);

        return candidateKeys
            .Where(key => ResolveRuntimeProjectId(key).Equals(runtimeProjectId, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    private static string ResolveProjectAlias(GeminiKey key)
    {
        if (!string.IsNullOrWhiteSpace(key.ProjectId))
        {
            return key.ProjectId.Trim();
        }

        return key.KeyName;
    }

    private static string NormalizeRole(string? manualRole)
    {
        return manualRole?.Trim().ToLowerInvariant() switch
        {
            "active" => "active",
            "backup" => "backup",
            "disabled" => "disabled",
            _ => "warm_spare",
        };
    }

    private static int RoleRank(string role)
    {
        return NormalizeRole(role) switch
        {
            "active" => 0,
            "warm_spare" => 1,
            "backup" => 2,
            _ => 3,
        };
    }

    private void ApplyFailureState(RuntimeProjectState state, int statusCode)
    {
        state.LastProviderStatus = statusCode.ToString();
        state.LastFailureAtUtc = DateTime.UtcNow;
        state.ConsecutiveFailures += 1;

        if (statusCode == (int)HttpStatusCode.TooManyRequests)
        {
            state.State = "cooling_down";
            state.LastRateLimitedAtUtc = DateTime.UtcNow;
            state.CooldownUntilUtc = DateTime.UtcNow.AddMinutes(15);
            return;
        }

        if (statusCode == (int)HttpStatusCode.Unauthorized || statusCode == (int)HttpStatusCode.Forbidden)
        {
            state.State = "auth_invalid";
            state.CooldownUntilUtc = null;
            return;
        }

        if (statusCode == (int)HttpStatusCode.RequestTimeout || statusCode >= 500)
        {
            state.State = "cooling_down";
            state.CooldownUntilUtc = DateTime.UtcNow.AddMinutes(2);
            return;
        }

        state.State = "degraded";
    }

    private void ApplyProbeState(string runtimeProjectId, string projectAlias, GeminiKey key, int statusCode, string status, int latencyMs)
    {
        var state = GetOrCreateState(runtimeProjectId);
        state.LastProviderStatus = status;
        state.LastLatencyMs = latencyMs;
        state.LastModel = key.Model;
        state.LastKeyId = key.Id;
        state.LastKeyName = key.KeyName;

        switch (status)
        {
            case "Active":
                state.State = key.IsActive ? "available" : "disabled";
                state.IsEnabled = key.IsActive;
                state.LastSuccessAtUtc = DateTime.UtcNow;
                state.ConsecutiveFailures = 0;
                state.CooldownUntilUtc = null;
                break;
            case "RateLimited":
                state.IsEnabled = key.IsActive;
                ApplyFailureState(state, 429);
                break;
            case "Disabled":
            case "Invalid":
                state.IsEnabled = false;
                ApplyFailureState(state, statusCode == 0 ? 403 : statusCode);
                break;
            default:
                ApplyFailureState(state, statusCode == 0 ? 500 : statusCode);
                break;
        }

        PublishStateChanged(runtimeProjectId, projectAlias, state.State, $"probe:{status}");
    }

    private async Task<(string Status, int StatusCode, string Message, int LatencyMs)> SendModelsProbeAsync(GeminiKey key, CancellationToken cancellationToken)
    {
        try
        {
            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            var apiKey = _encryptionService.Decrypt(key.EncryptedApiKey);
            var timer = Stopwatch.StartNew();
            var response = await httpClient.GetAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}",
                cancellationToken);
            timer.Stop();

            var statusCode = (int)response.StatusCode;
            if (response.IsSuccessStatusCode)
            {
                return ("Active", statusCode, "Project probe succeeded.", (int)timer.ElapsedMilliseconds);
            }

            return statusCode switch
            {
                429 => ("RateLimited", statusCode, "Project hit provider rate limit.", (int)timer.ElapsedMilliseconds),
                403 => ("Disabled", statusCode, "Project key is forbidden or disabled.", (int)timer.ElapsedMilliseconds),
                400 => ("Invalid", statusCode, "Project key is invalid or malformed.", (int)timer.ElapsedMilliseconds),
                _ => ("Error", statusCode, $"Provider probe failed with status {statusCode}.", (int)timer.ElapsedMilliseconds),
            };
        }
        catch (TaskCanceledException)
        {
            return ("Timeout", 408, "Project probe timed out.", 10000);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to probe runtime project for key {KeyId}", key.Id);
            return ("Error", 500, ex.Message, 0);
        }
    }

    private void PublishStateChanged(string runtimeProjectId, string projectAlias, string state, string reason)
    {
        _eventBus.Publish("runtime.project.state_changed", "gemini-runtime-project", runtimeProjectId, new
        {
            RuntimeProjectId = runtimeProjectId,
            ProjectAlias = projectAlias,
            State = state,
            Reason = reason,
        });
        _eventBus.Publish("admin.resource.updated", "gemini-runtime-project", runtimeProjectId, new
        {
            RuntimeProjectId = runtimeProjectId,
            ProjectAlias = projectAlias,
            State = state,
            Reason = reason,
        });
    }

    private sealed class GroupedProject
    {
        public string RuntimeProjectId { get; set; } = string.Empty;
        public string ProjectId { get; set; } = string.Empty;
        public string ProjectAlias { get; set; } = string.Empty;
        public GeminiKey PrimaryKey { get; set; } = null!;
        public List<GeminiKey> Keys { get; set; } = new();
    }
}
