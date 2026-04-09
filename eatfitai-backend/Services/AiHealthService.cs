using System.Text.Json;
using EatFitAI.API.DTOs.AI;
using Microsoft.Extensions.Hosting;

namespace EatFitAI.API.Services;

public interface IAiHealthService
{
    AiHealthStatusDto GetStatus();

    Task RefreshAsync(CancellationToken cancellationToken = default);
}

public sealed class AiHealthService : IAiHealthService
{
    private static readonly TimeSpan DefaultPollInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(5);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiHealthService> _logger;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private readonly object _sync = new();

    private AiHealthState _state = AiHealthState.Degraded;
    private DateTimeOffset? _lastCheckedAt;
    private DateTimeOffset? _lastHealthyAt;
    private int _consecutiveFailures;
    private bool _modelLoaded;
    private bool _geminiConfigured;
    private string _message = "AI health chưa được kiểm tra lần nào.";

    public AiHealthService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AiHealthService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public AiHealthStatusDto GetStatus()
    {
        lock (_sync)
        {
            return new AiHealthStatusDto
            {
                State = _state.ToString().ToUpperInvariant(),
                ProviderUrl = GetProviderBaseUrl(),
                LastCheckedAt = _lastCheckedAt,
                LastHealthyAt = _lastHealthyAt,
                ConsecutiveFailures = _consecutiveFailures,
                ModelLoaded = _modelLoaded,
                GeminiConfigured = _geminiConfigured,
                Message = _message
            };
        }
    }

    public async Task RefreshAsync(CancellationToken cancellationToken = default)
    {
        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            var checkedAt = DateTimeOffset.UtcNow;
            var providerUrl = GetProviderBaseUrl();
            var url = $"{providerUrl}/healthz";

            using var client = _httpClientFactory.CreateClient();
            client.Timeout = GetTimeout();

            try
            {
                using var response = await client.GetAsync(url, cancellationToken);
                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    ApplyHttpFailure(checkedAt, $"AI health check HTTP {(int)response.StatusCode} từ /healthz.");
                    return;
                }

                ApplyProbePayload(checkedAt, body);
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "AI health check timeout for {Url}", url);
                ApplyHttpFailure(checkedAt, "AI health check timeout khi gọi /healthz.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogWarning(ex, "AI health check request failed for {Url}", url);
                ApplyHttpFailure(checkedAt, "Không thể kết nối AI provider qua /healthz.");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "AI health check returned invalid JSON from {Url}", url);
                ApplyDegraded(checkedAt, "AI provider phản hồi /healthz nhưng JSON không hợp lệ.", modelLoaded: false, geminiConfigured: false);
            }
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    private void ApplyProbePayload(DateTimeOffset checkedAt, string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var providerStatus = root.TryGetProperty("status", out var statusProp)
            ? statusProp.GetString()
            : null;
        var modelLoaded = root.TryGetProperty("model_loaded", out var modelProp) && modelProp.ValueKind == JsonValueKind.True;
        var geminiConfigured = root.TryGetProperty("gemini_configured", out var geminiProp) && geminiProp.ValueKind == JsonValueKind.True;

        if (string.Equals(providerStatus, "ok", StringComparison.OrdinalIgnoreCase) && modelLoaded && geminiConfigured)
        {
            lock (_sync)
            {
                _state = AiHealthState.Healthy;
                _lastCheckedAt = checkedAt;
                _lastHealthyAt = checkedAt;
                _consecutiveFailures = 0;
                _modelLoaded = true;
                _geminiConfigured = true;
                _message = "AI provider healthy.";
            }
            return;
        }

        var reasons = new List<string>();
        if (!string.Equals(providerStatus, "ok", StringComparison.OrdinalIgnoreCase))
        {
            reasons.Add("status khác ok");
        }
        if (!modelLoaded)
        {
            reasons.Add("model chưa sẵn sàng");
        }
        if (!geminiConfigured)
        {
            reasons.Add("Gemini chưa cấu hình");
        }

        ApplyDegraded(
            checkedAt,
            $"AI provider phản hồi /healthz nhưng chưa sẵn sàng hoàn toàn: {string.Join(", ", reasons)}.",
            modelLoaded,
            geminiConfigured);
    }

    private void ApplyHttpFailure(DateTimeOffset checkedAt, string message)
    {
        lock (_sync)
        {
            _lastCheckedAt = checkedAt;
            _consecutiveFailures++;
            _state = _consecutiveFailures >= 2 ? AiHealthState.Down : AiHealthState.Degraded;
            _message = message;
            _modelLoaded = false;
            _geminiConfigured = false;
        }
    }

    private void ApplyDegraded(
        DateTimeOffset checkedAt,
        string message,
        bool modelLoaded,
        bool geminiConfigured)
    {
        lock (_sync)
        {
            _state = AiHealthState.Degraded;
            _lastCheckedAt = checkedAt;
            _consecutiveFailures = 0;
            _modelLoaded = modelLoaded;
            _geminiConfigured = geminiConfigured;
            _message = message;
        }
    }

    private string GetProviderBaseUrl()
    {
        return AiProviderUrlResolver.GetVisionBaseUrl(_configuration);
    }

    private TimeSpan GetTimeout()
    {
        var configuredSeconds = _configuration.GetValue<int?>("AIProvider:HealthCheckTimeoutSeconds");
        return configuredSeconds.HasValue && configuredSeconds.Value > 0
            ? TimeSpan.FromSeconds(configuredSeconds.Value)
            : DefaultTimeout;
    }

    public static TimeSpan GetPollInterval(IConfiguration configuration)
    {
        var configuredSeconds = configuration.GetValue<int?>("AIProvider:HealthCheckIntervalSeconds");
        return configuredSeconds.HasValue && configuredSeconds.Value > 0
            ? TimeSpan.FromSeconds(configuredSeconds.Value)
            : DefaultPollInterval;
    }
}

public sealed class AiHealthBackgroundService : BackgroundService
{
    private readonly IAiHealthService _aiHealthService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiHealthBackgroundService> _logger;

    public AiHealthBackgroundService(
        IAiHealthService aiHealthService,
        IConfiguration configuration,
        ILogger<AiHealthBackgroundService> logger)
    {
        _aiHealthService = aiHealthService;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = AiHealthService.GetPollInterval(_configuration);
        _logger.LogInformation("Starting AI health monitor with interval {IntervalSeconds}s", interval.TotalSeconds);

        await SafeRefreshAsync(stoppingToken);

        using var timer = new PeriodicTimer(interval);
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await SafeRefreshAsync(stoppingToken);
        }
    }

    private async Task SafeRefreshAsync(CancellationToken stoppingToken)
    {
        try
        {
            await _aiHealthService.RefreshAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception while refreshing AI health state.");
        }
    }
}
