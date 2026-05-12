using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class PushNotificationCampaignService
{
    private const int ExpoChunkSize = 100;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PushNotificationCampaignService> _logger;

    public PushNotificationCampaignService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<PushNotificationCampaignService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<PushDeviceRegistrationDto> RegisterDeviceAsync(
        Guid userId,
        RegisterPushDeviceRequest request,
        CancellationToken cancellationToken)
    {
        var token = NormalizeToken(request.ExpoPushToken);
        if (!LooksLikeExpoToken(token))
        {
            throw new ArgumentException("Expo push token không hợp lệ.");
        }

        var now = DateTime.UtcNow;
        var device = await _context.PushDevices.FirstOrDefaultAsync(
            item => item.ExpoPushToken == token,
            cancellationToken);

        if (device == null)
        {
            device = new PushDevice
            {
                PushDeviceId = Guid.NewGuid(),
                ExpoPushToken = token,
                CreatedAt = now,
            };
            _context.PushDevices.Add(device);
        }

        device.UserId = userId;
        device.Platform = Limit(request.Platform, 40) ?? "unknown";
        device.DeviceId = Limit(request.DeviceId, 160);
        device.AppVersion = Limit(request.AppVersion, 40);
        device.RuntimeVersion = Limit(request.RuntimeVersion, 40);
        device.Channel = Limit(request.Channel, 80);
        device.PermissionStatus = Limit(request.PermissionStatus, 40) ?? "granted";
        device.IsEnabled = string.Equals(device.PermissionStatus, "granted", StringComparison.OrdinalIgnoreCase);
        device.DisabledReason = device.IsEnabled ? null : "permission_not_granted";
        device.LastRegisteredAt = now;
        device.LastSeenAt = now;
        device.UpdatedAt = now;

        await _context.SaveChangesAsync(cancellationToken);
        return new PushDeviceRegistrationDto
        {
            PushDeviceId = device.PushDeviceId,
            IsEnabled = device.IsEnabled,
            LastRegisteredAt = device.LastRegisteredAt,
        };
    }

    public async Task<PushAudiencePreviewDto> PreviewAudienceAsync(CancellationToken cancellationToken)
    {
        var query = EligibleDevices();
        return new PushAudiencePreviewDto
        {
            EligibleDeviceCount = await query.CountAsync(cancellationToken),
            DistinctUserCount = await query.Select(item => item.UserId).Distinct().CountAsync(cancellationToken),
        };
    }

    public async Task<IReadOnlyList<PushCampaignDto>> ListCampaignsAsync(CancellationToken cancellationToken)
    {
        var campaigns = await _context.PushCampaigns
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        return campaigns.Select(ToDto).ToArray();
    }

    public async Task<PushCampaignDto> CreateCampaignAsync(
        ClaimsPrincipal actor,
        CreatePushCampaignRequest request,
        CancellationToken cancellationToken)
    {
        var title = Limit(request.Title, 120);
        var body = Limit(request.Body, 512);
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(body))
        {
            throw new ArgumentException("Tiêu đề và nội dung thông báo là bắt buộc.");
        }

        var now = DateTime.UtcNow;
        var scheduleAt = request.ScheduleNow ? now : request.ScheduledAt?.ToUniversalTime();
        var campaign = new PushCampaign
        {
            PushCampaignId = Guid.NewGuid(),
            Title = title,
            Body = body,
            DataJson = AdminControlPlaneJson.Serialize(request.Data ?? new Dictionary<string, string>()),
            AudienceFilterJson = AdminControlPlaneJson.Serialize(new { type = "enabled_devices" }),
            Status = scheduleAt.HasValue ? "scheduled" : "draft",
            ScheduledAt = scheduleAt,
            CreatedBy = ResolveActor(actor),
            UpdatedBy = ResolveActor(actor),
            CreatedAt = now,
            UpdatedAt = now,
        };

        _context.PushCampaigns.Add(campaign);
        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(campaign);
    }

    public async Task<PushCampaignDto> ScheduleCampaignAsync(
        Guid campaignId,
        DateTime? scheduledAt,
        ClaimsPrincipal actor,
        CancellationToken cancellationToken)
    {
        var campaign = await _context.PushCampaigns.FirstOrDefaultAsync(
            item => item.PushCampaignId == campaignId,
            cancellationToken);
        if (campaign == null)
        {
            throw new KeyNotFoundException("Không tìm thấy campaign.");
        }

        if (!string.Equals(campaign.Status, "draft", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(campaign.Status, "scheduled", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Campaign đã gửi hoặc đã hủy, không thể schedule lại.");
        }

        campaign.ScheduledAt = scheduledAt?.ToUniversalTime() ?? DateTime.UtcNow;
        campaign.Status = "scheduled";
        campaign.UpdatedBy = ResolveActor(actor);
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(campaign);
    }

    public async Task<PushCampaignDto> CancelCampaignAsync(
        Guid campaignId,
        ClaimsPrincipal actor,
        CancellationToken cancellationToken)
    {
        var campaign = await _context.PushCampaigns.FirstOrDefaultAsync(
            item => item.PushCampaignId == campaignId,
            cancellationToken);
        if (campaign == null)
        {
            throw new KeyNotFoundException("Không tìm thấy campaign.");
        }

        if (string.Equals(campaign.Status, "completed", StringComparison.OrdinalIgnoreCase)
            || string.Equals(campaign.Status, "canceled", StringComparison.OrdinalIgnoreCase))
        {
            return ToDto(campaign);
        }

        campaign.Status = "canceled";
        campaign.UpdatedBy = ResolveActor(actor);
        campaign.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(campaign);
    }

    public async Task ProcessDueCampaignsAsync(CancellationToken cancellationToken)
    {
        await MaterializeDueCampaignsAsync(cancellationToken);
        await SendPendingDeliveriesAsync(cancellationToken);
        await CheckReceiptsAsync(cancellationToken);
        await RecomputeCampaignSummariesAsync(cancellationToken);
    }

    private async Task MaterializeDueCampaignsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var dueCampaigns = await _context.PushCampaigns
            .Where(item => item.Status == "scheduled"
                && item.ScheduledAt != null
                && item.ScheduledAt <= now)
            .OrderBy(item => item.ScheduledAt)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var campaign in dueCampaigns)
        {
            var devices = await EligibleDevices().ToListAsync(cancellationToken);
            foreach (var device in devices)
            {
                var exists = await _context.PushCampaignDeliveries.AnyAsync(
                    item => item.PushCampaignId == campaign.PushCampaignId
                        && item.PushDeviceId == device.PushDeviceId,
                    cancellationToken);
                if (exists)
                {
                    continue;
                }

                _context.PushCampaignDeliveries.Add(new PushCampaignDelivery
                {
                    PushCampaignDeliveryId = Guid.NewGuid(),
                    PushCampaignId = campaign.PushCampaignId,
                    PushDeviceId = device.PushDeviceId,
                    ExpoPushToken = device.ExpoPushToken,
                    Status = "pending",
                    NextAttemptAt = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            campaign.Status = devices.Count == 0 ? "completed" : "sending";
            campaign.TargetCount = devices.Count;
            campaign.SentAt = now;
            campaign.CompletedAt = devices.Count == 0 ? now : null;
            campaign.UpdatedAt = now;
        }

        if (dueCampaigns.Count > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task SendPendingDeliveriesAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var deliveries = await _context.PushCampaignDeliveries
            .Include(item => item.Campaign)
            .Where(item => item.Status == "pending"
                && (item.NextAttemptAt == null || item.NextAttemptAt <= now)
                && item.AttemptCount < 4
                && item.Campaign != null
                && item.Campaign.Status == "sending")
            .OrderBy(item => item.CreatedAt)
            .Take(ExpoChunkSize)
            .ToListAsync(cancellationToken);

        if (deliveries.Count == 0)
        {
            return;
        }

        var response = await SendExpoChunkAsync(deliveries, cancellationToken);
        for (var index = 0; index < deliveries.Count; index += 1)
        {
            var delivery = deliveries[index];
            var ticket = index < response.Count ? response[index] : null;
            delivery.AttemptCount += 1;
            delivery.LastAttemptAt = now;
            delivery.UpdatedAt = now;

            if (ticket?.Status == "ok" && !string.IsNullOrWhiteSpace(ticket.Id))
            {
                delivery.Status = "sent";
                delivery.TicketId = ticket.Id;
                delivery.NextAttemptAt = null;
                continue;
            }

            delivery.ErrorCode = ticket?.Details?.Error ?? "expo_send_failed";
            delivery.ErrorMessage = ticket?.Message;
            if (IsPermanentExpoError(delivery.ErrorCode))
            {
                delivery.Status = "failed";
                await DisableDeviceAsync(delivery.PushDeviceId, delivery.ErrorCode, cancellationToken);
            }
            else if (delivery.AttemptCount >= 4)
            {
                delivery.Status = "failed";
            }
            else
            {
                delivery.Status = "pending";
                delivery.NextAttemptAt = now.AddMinutes(Math.Pow(2, delivery.AttemptCount));
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task CheckReceiptsAsync(CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-15);
        var deliveries = await _context.PushCampaignDeliveries
            .Where(item => item.Status == "sent"
                && item.TicketId != null
                && item.LastAttemptAt != null
                && item.LastAttemptAt <= cutoff
                && item.ReceiptCheckedAt == null)
            .OrderBy(item => item.LastAttemptAt)
            .Take(300)
            .ToListAsync(cancellationToken);

        if (deliveries.Count == 0)
        {
            return;
        }

        var receipts = await FetchReceiptsAsync(
            deliveries.Select(item => item.TicketId!).ToArray(),
            cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var delivery in deliveries)
        {
            delivery.ReceiptCheckedAt = now;
            delivery.UpdatedAt = now;
            if (!receipts.TryGetValue(delivery.TicketId!, out var receipt))
            {
                continue;
            }

            if (receipt.Status == "ok")
            {
                delivery.Status = "receipt_ok";
                continue;
            }

            delivery.Status = "failed";
            delivery.ErrorCode = receipt.Details?.Error ?? "expo_receipt_failed";
            delivery.ErrorMessage = receipt.Message;
            if (IsPermanentExpoError(delivery.ErrorCode))
            {
                await DisableDeviceAsync(delivery.PushDeviceId, delivery.ErrorCode, cancellationToken);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task RecomputeCampaignSummariesAsync(CancellationToken cancellationToken)
    {
        var campaignIds = await _context.PushCampaigns
            .Where(item => item.Status == "sending")
            .Select(item => item.PushCampaignId)
            .Take(20)
            .ToListAsync(cancellationToken);

        foreach (var campaignId in campaignIds)
        {
            var campaign = await _context.PushCampaigns.FirstAsync(
                item => item.PushCampaignId == campaignId,
                cancellationToken);
            var deliveries = _context.PushCampaignDeliveries.Where(item => item.PushCampaignId == campaignId);
            var pending = await deliveries.CountAsync(
                item => item.Status == "pending" || item.Status == "sent",
                cancellationToken);
            campaign.DeliveredCount = await deliveries.CountAsync(item => item.Status == "receipt_ok", cancellationToken);
            campaign.FailedCount = await deliveries.CountAsync(item => item.Status == "failed", cancellationToken);
            campaign.TargetCount = await deliveries.CountAsync(cancellationToken);
            if (pending == 0)
            {
                campaign.Status = "completed";
                campaign.CompletedAt = DateTime.UtcNow;
            }

            campaign.UpdatedAt = DateTime.UtcNow;
        }

        if (campaignIds.Count > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private IQueryable<PushDevice> EligibleDevices()
    {
        return _context.PushDevices
            .Where(item => item.IsEnabled
                && item.PermissionStatus == "granted"
                && item.ExpoPushToken != "");
    }

    private async Task<IReadOnlyList<ExpoTicketDto>> SendExpoChunkAsync(
        IReadOnlyList<PushCampaignDelivery> deliveries,
        CancellationToken cancellationToken)
    {
        var client = CreateExpoClient();
        var messages = deliveries.Select(item => new ExpoPushMessageDto
        {
            To = item.ExpoPushToken,
            Title = item.Campaign?.Title ?? string.Empty,
            Body = item.Campaign?.Body ?? string.Empty,
            Data = AdminControlPlaneJson.Deserialize(
                item.Campaign?.DataJson,
                new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)),
            Sound = "default",
            Priority = "default",
        }).ToArray();

        try
        {
            var response = await client.PostAsJsonAsync(
                "https://exp.host/--/api/v2/push/send",
                messages,
                JsonOptions,
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Expo push send failed with {StatusCode}: {Body}", response.StatusCode, body);
                return deliveries.Select(_ => new ExpoTicketDto
                {
                    Status = "error",
                    Message = $"expo_http_{(int)response.StatusCode}",
                }).ToArray();
            }

            var payload = await response.Content.ReadFromJsonAsync<ExpoTicketResponseDto>(JsonOptions, cancellationToken);
            return payload?.Data ?? new List<ExpoTicketDto>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo push send request failed.");
            return deliveries.Select(_ => new ExpoTicketDto
            {
                Status = "error",
                Message = "expo_request_failed",
            }).ToArray();
        }
    }

    private async Task<Dictionary<string, ExpoTicketDto>> FetchReceiptsAsync(
        IReadOnlyList<string> ticketIds,
        CancellationToken cancellationToken)
    {
        var client = CreateExpoClient();
        try
        {
            var response = await client.PostAsJsonAsync(
                "https://exp.host/--/api/v2/push/getReceipts",
                new { ids = ticketIds },
                JsonOptions,
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new Dictionary<string, ExpoTicketDto>();
            }

            var payload = await response.Content.ReadFromJsonAsync<ExpoReceiptResponseDto>(JsonOptions, cancellationToken);
            return payload?.Data ?? new Dictionary<string, ExpoTicketDto>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo receipt request failed.");
            return new Dictionary<string, ExpoTicketDto>();
        }
    }

    private HttpClient CreateExpoClient()
    {
        var client = _httpClientFactory.CreateClient();
        var accessToken = _configuration["ExpoPush:AccessToken"];
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken.Trim());
        }

        client.Timeout = TimeSpan.FromSeconds(20);
        return client;
    }

    private async Task DisableDeviceAsync(Guid pushDeviceId, string? reason, CancellationToken cancellationToken)
    {
        var device = await _context.PushDevices.FirstOrDefaultAsync(
            item => item.PushDeviceId == pushDeviceId,
            cancellationToken);
        if (device == null)
        {
            return;
        }

        device.IsEnabled = false;
        device.DisabledReason = Limit(reason, 120) ?? "push_failed";
        device.UpdatedAt = DateTime.UtcNow;
    }

    private static PushCampaignDto ToDto(PushCampaign campaign)
    {
        return new PushCampaignDto
        {
            PushCampaignId = campaign.PushCampaignId,
            Title = campaign.Title,
            Body = campaign.Body,
            Data = AdminControlPlaneJson.Deserialize(
                campaign.DataJson,
                new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)),
            Status = campaign.Status,
            ScheduledAt = campaign.ScheduledAt,
            TargetCount = campaign.TargetCount,
            DeliveredCount = campaign.DeliveredCount,
            FailedCount = campaign.FailedCount,
            CreatedAt = campaign.CreatedAt,
            UpdatedAt = campaign.UpdatedAt,
        };
    }

    private static string NormalizeToken(string? value)
    {
        return value?.Trim() ?? string.Empty;
    }

    private static bool LooksLikeExpoToken(string value)
    {
        return value.StartsWith("ExponentPushToken[", StringComparison.Ordinal)
            || value.StartsWith("ExpoPushToken[", StringComparison.Ordinal);
    }

    private static bool IsPermanentExpoError(string? errorCode)
    {
        return string.Equals(errorCode, "DeviceNotRegistered", StringComparison.OrdinalIgnoreCase)
            || string.Equals(errorCode, "InvalidCredentials", StringComparison.OrdinalIgnoreCase);
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

    private sealed class ExpoTicketResponseDto
    {
        [JsonPropertyName("data")]
        public List<ExpoTicketDto> Data { get; set; } = new();
    }

    private sealed class ExpoReceiptResponseDto
    {
        [JsonPropertyName("data")]
        public Dictionary<string, ExpoTicketDto> Data { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private sealed class ExpoTicketDto
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = "error";

        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("details")]
        public ExpoTicketDetailsDto? Details { get; set; }
    }

    private sealed class ExpoTicketDetailsDto
    {
        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    private sealed class ExpoPushMessageDto
    {
        [JsonPropertyName("to")]
        public string To { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("body")]
        public string Body { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public Dictionary<string, string> Data { get; set; } = new();

        [JsonPropertyName("sound")]
        public string Sound { get; set; } = "default";

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "default";
    }
}

public sealed class PushCampaignBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PushCampaignBackgroundService> _logger;

    public PushCampaignBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<PushCampaignBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await timer.WaitForNextTickAsync(stoppingToken);
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<PushNotificationCampaignService>();
                await service.ProcessDueCampaignsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Push campaign processing failed.");
            }
        }
    }
}
