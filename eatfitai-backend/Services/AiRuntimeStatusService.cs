using System.Text.Json;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services;

public sealed class AiRuntimeStatusService : IAiRuntimeStatusService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiRuntimeStatusService> _logger;

    public AiRuntimeStatusService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AiRuntimeStatusService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AdminRuntimeSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var providerUrl = $"{AiProviderUrlResolver.GetVisionBaseUrl(_configuration)}/internal/runtime/status";
        using var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);

        using var request = new HttpRequestMessage(HttpMethod.Get, providerUrl);
        var internalToken = _configuration["AIProvider:InternalToken"];
        if (!string.IsNullOrWhiteSpace(internalToken))
        {
            request.Headers.Add("X-Internal-Token", internalToken);
        }

        using var response = await client.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        return MapSnapshot(doc.RootElement);
    }

    private AdminRuntimeSnapshotDto MapSnapshot(JsonElement root)
    {
        var usageEntries = root.TryGetProperty("gemini_usage_entries", out var entriesProp) && entriesProp.ValueKind == JsonValueKind.Array
            ? entriesProp.EnumerateArray().ToList()
            : new List<JsonElement>();

        var projects = usageEntries.Select(MapProject).ToList();
        var checkedAt = root.TryGetProperty("checkedAt", out var checkedProp) && checkedProp.ValueKind == JsonValueKind.Number
            ? DateTimeOffset.FromUnixTimeSeconds((long)checkedProp.GetDouble()).UtcDateTime
            : DateTime.UtcNow;

        var availableCount = ReadInt(root, "gemini_available_project_count");
        var exhaustedCount = ReadInt(root, "gemini_provider_exhausted_project_count");
        var cooldownCount = projects.Count(project =>
            string.Equals(project.State, "provider_rpm_exhausted", StringComparison.OrdinalIgnoreCase)
            || string.Equals(project.State, "provider_tpm_exhausted", StringComparison.OrdinalIgnoreCase)
            || string.Equals(project.State, "transient_backoff", StringComparison.OrdinalIgnoreCase));

        return new AdminRuntimeSnapshotDto
        {
            CheckedAt = checkedAt,
            PoolHealth = availableCount > 0 ? "Healthy" : "Exhausted",
            ActiveProject = ReadString(root, "gemini_active_project"),
            AvailableProjectCount = availableCount,
            ExhaustedProjectCount = exhaustedCount,
            CooldownProjectCount = cooldownCount,
            DistinctProjectCount = ReadInt(root, "gemini_distinct_project_count"),
            Limits = new RuntimeLimitsDto
            {
                Rpm = ReadNestedInt(root, "gemini_limits", "rpm"),
                Tpm = ReadNestedInt(root, "gemini_limits", "tpm"),
                Rpd = ReadNestedInt(root, "gemini_limits", "rpd"),
            },
            Projects = projects,
        };
    }

    private RuntimeProjectStateDto MapProject(JsonElement entry)
    {
        return new RuntimeProjectStateDto
        {
            ProjectAlias = ReadString(entry, "projectAlias"),
            ProjectId = ReadString(entry, "projectId"),
            KeyAlias = ReadString(entry, "keyAlias"),
            Model = ReadString(entry, "model"),
            State = ReadString(entry, "state", "unknown"),
            Available = ReadBool(entry, "available"),
            AvailabilityReason = ReadString(entry, "availabilityReason", "unknown"),
            QuotaSource = ReadString(entry, "quotaSource", "unknown"),
            AvailableAfter = ReadNullableString(entry, "availableAfter"),
            RpmUsed = ReadNullableInt(entry, "rpmUsed"),
            RpmRemaining = ReadNullableInt(entry, "rpmRemaining"),
            RpmRecoveryAt = ReadNullableString(entry, "rpmRecoveryAt"),
            TpmUsed = ReadNullableInt(entry, "tpmUsed"),
            TpmRemaining = ReadNullableInt(entry, "tpmRemaining"),
            TpmRecoveryAt = ReadNullableString(entry, "tpmRecoveryAt"),
            RpdUsed = ReadNullableInt(entry, "rpdUsed"),
            RpdRemaining = ReadNullableInt(entry, "rpdRemaining"),
            RpdRecoveryAt = ReadNullableString(entry, "rpdRecoveryAt"),
            TotalRequests = ReadInt(entry, "totalRequests"),
            TotalTokens = ReadInt(entry, "totalTokens"),
            LastUsedAt = ReadNullableString(entry, "lastUsedAt"),
            LastProviderStatusCode = entry.TryGetProperty("lastProviderStatusCode", out var statusCodeProp)
                && statusCodeProp.ValueKind != JsonValueKind.Null
                ? statusCodeProp.ToString()
                : null,
        };
    }

    private static bool ReadBool(JsonElement root, string propertyName)
    {
        return root.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.True;
    }

    private static int ReadInt(JsonElement root, string propertyName, int fallback = 0)
    {
        if (!root.TryGetProperty(propertyName, out var prop))
        {
            return fallback;
        }

        return prop.ValueKind switch
        {
            JsonValueKind.Number when prop.TryGetInt32(out var value) => value,
            JsonValueKind.String when int.TryParse(prop.GetString(), out var value) => value,
            _ => fallback,
        };
    }

    private static int? ReadNullableInt(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var prop) || prop.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return ReadInt(root, propertyName);
    }

    private static int? ReadNestedInt(JsonElement root, string parentName, string propertyName)
    {
        if (!root.TryGetProperty(parentName, out var parent) || parent.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        return ReadNullableInt(parent, propertyName);
    }

    private static string ReadString(JsonElement root, string propertyName, string fallback = "")
    {
        if (!root.TryGetProperty(propertyName, out var prop) || prop.ValueKind == JsonValueKind.Null)
        {
            return fallback;
        }

        return prop.ValueKind == JsonValueKind.String ? prop.GetString() ?? fallback : prop.ToString();
    }

    private static string? ReadNullableString(JsonElement root, string propertyName)
    {
        var value = ReadString(root, propertyName);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }
}
