using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class MobileRuntimeConfigService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<MobileRuntimeConfigService> _logger;

    public MobileRuntimeConfigService(
        ApplicationDbContext context,
        ILogger<MobileRuntimeConfigService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<MobileRuntimeConfigDto> GetAsync(
        string? environment,
        string? platform,
        string? channel,
        CancellationToken cancellationToken)
    {
        var normalizedEnvironment = NormalizeTarget(environment, "production");
        var normalizedPlatform = NormalizeTarget(platform, "all");
        var normalizedChannel = NormalizeTarget(channel, "production");

        var entity = await FindBestMatchAsync(
            normalizedEnvironment,
            normalizedPlatform,
            normalizedChannel,
            cancellationToken);

        entity ??= BuildDefault(normalizedEnvironment, "all", normalizedChannel);
        return ToDto(entity);
    }

    public async Task<MobileRuntimeConfigDto> UpdateAsync(
        ClaimsPrincipal actor,
        UpdateMobileRuntimeConfigRequest request,
        CancellationToken cancellationToken)
    {
        var environment = NormalizeTarget(request.Environment, "production");
        var platform = NormalizeTarget(request.Platform, "all");
        var channel = NormalizeTarget(request.Channel, "production");
        var entity = await _context.MobileRuntimeConfigs.FirstOrDefaultAsync(
            item => item.Environment == environment
                && item.Platform == platform
                && item.Channel == channel,
            cancellationToken);

        if (entity == null)
        {
            entity = BuildDefault(environment, platform, channel);
            _context.MobileRuntimeConfigs.Add(entity);
        }
        else if (request.ExpectedConfigVersion.HasValue
                 && entity.ConfigVersion != request.ExpectedConfigVersion.Value)
        {
            throw new InvalidOperationException("mobile_config_version_conflict");
        }

        entity.MaintenanceEnabled = request.MaintenanceEnabled;
        entity.MaintenanceMessage = Limit(request.MaintenanceMessage, 500);
        entity.ForceUpdateEnabled = request.ForceUpdateEnabled;
        entity.MinSupportedVersion = Limit(request.MinSupportedVersion, 40);
        entity.LatestVersion = Limit(request.LatestVersion, 40);
        entity.UpdateUrl = Limit(request.UpdateUrl, 500);
        entity.FeatureFlagsJson = AdminControlPlaneJson.Serialize(request.FeatureFlags ?? new Dictionary<string, bool>());
        entity.TelemetrySampleRate = Math.Clamp(request.TelemetrySampleRate, 0, 1);
        entity.ConfigVersion += 1;
        entity.UpdatedBy = ResolveActor(actor);
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(entity);
    }

    private async Task<MobileRuntimeConfig?> FindBestMatchAsync(
        string environment,
        string platform,
        string channel,
        CancellationToken cancellationToken)
    {
        var candidates = await _context.MobileRuntimeConfigs
            .AsNoTracking()
            .Where(item => item.Environment == environment
                && (item.Platform == platform || item.Platform == "all")
                && (item.Channel == channel || item.Channel == "production"))
            .ToListAsync(cancellationToken);

        return candidates
            .OrderByDescending(item => item.Platform == platform ? 1 : 0)
            .ThenByDescending(item => item.Channel == channel ? 1 : 0)
            .FirstOrDefault();
    }

    private static MobileRuntimeConfig BuildDefault(string environment, string platform, string channel)
    {
        var now = DateTime.UtcNow;
        return new MobileRuntimeConfig
        {
            MobileRuntimeConfigId = Guid.NewGuid(),
            Environment = environment,
            Platform = platform,
            Channel = channel,
            MaintenanceEnabled = false,
            MaintenanceMessage = "EatFitAI đang bảo trì ngắn. Vui lòng thử lại sau ít phút.",
            ForceUpdateEnabled = false,
            FeatureFlagsJson = AdminControlPlaneJson.Serialize(new Dictionary<string, bool>
            {
                ["aiScan"] = true,
                ["voice"] = true,
                ["recipes"] = true,
                ["pushCampaigns"] = true,
            }),
            TelemetrySampleRate = 1,
            ConfigVersion = 1,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    private MobileRuntimeConfigDto ToDto(MobileRuntimeConfig entity)
    {
        var dto = new MobileRuntimeConfigDto
        {
            Environment = entity.Environment,
            Platform = entity.Platform,
            Channel = entity.Channel,
            MaintenanceEnabled = entity.MaintenanceEnabled,
            MaintenanceMessage = entity.MaintenanceMessage,
            ForceUpdateEnabled = entity.ForceUpdateEnabled,
            MinSupportedVersion = entity.MinSupportedVersion,
            LatestVersion = entity.LatestVersion,
            UpdateUrl = entity.UpdateUrl,
            FeatureFlags = AdminControlPlaneJson.Deserialize(
                entity.FeatureFlagsJson,
                new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)),
            TelemetrySampleRate = Math.Clamp(entity.TelemetrySampleRate, 0, 1),
            ConfigVersion = entity.ConfigVersion,
            UpdatedBy = entity.UpdatedBy,
            UpdatedAt = entity.UpdatedAt,
        };
        dto.ETag = ComputeETag(dto);
        return dto;
    }

    private static string ComputeETag(MobileRuntimeConfigDto dto)
    {
        var source = $"{dto.Environment}|{dto.Platform}|{dto.Channel}|{dto.ConfigVersion}|{dto.UpdatedAt:O}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(source));
        return $"\"{Convert.ToHexString(hash)[..16].ToLowerInvariant()}\"";
    }

    private static string NormalizeTarget(string? value, string fallback)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    private static string? Limit(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }

    private static string? ResolveActor(ClaimsPrincipal actor)
    {
        return actor.FindFirstValue(ClaimTypes.Email)
            ?? actor.FindFirstValue("email")
            ?? actor.Identity?.Name;
    }
}
