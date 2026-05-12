using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EatFitAI.API.Services;

public sealed class VisionDetectConcurrencyGate
{
    private readonly ILogger<VisionDetectConcurrencyGate> _logger;
    private readonly SemaphoreSlim? _semaphore;
    private readonly int _queueLimit;
    private int _waitingCount;

    public VisionDetectConcurrencyGate(
        IConfiguration configuration,
        ILogger<VisionDetectConcurrencyGate> logger)
    {
        _logger = logger;

        MaxConcurrentRequests = Math.Max(
            0,
            configuration.GetValue<int?>("AIProvider:VisionMaxConcurrentRequests") ?? 0);
        _queueLimit = Math.Max(
            0,
            configuration.GetValue<int?>("AIProvider:VisionQueueLimit") ?? 0);

        var configuredQueueTimeoutSeconds = configuration.GetValue<int?>("AIProvider:VisionQueueTimeoutSeconds") ?? 5;
        QueueTimeout = TimeSpan.FromSeconds(Math.Clamp(configuredQueueTimeoutSeconds, 1, 60));
        RetryAfter = QueueTimeout;

        if (MaxConcurrentRequests > 0)
        {
            _semaphore = new SemaphoreSlim(MaxConcurrentRequests, MaxConcurrentRequests);
        }
    }

    public int MaxConcurrentRequests { get; }

    public TimeSpan QueueTimeout { get; }

    public TimeSpan RetryAfter { get; }

    public bool IsEnabled => _semaphore is not null;

    public async Task<Lease?> TryAcquireAsync(CancellationToken cancellationToken)
    {
        if (_semaphore is null)
        {
            return new Lease(null, acquired: false);
        }

        if (_semaphore.Wait(0))
        {
            return new Lease(this, acquired: true);
        }

        if (_queueLimit <= 0)
        {
            _logger.LogWarning(
                "Vision detect concurrency gate rejected request immediately. max_concurrent={MaxConcurrent} queue_limit={QueueLimit}",
                MaxConcurrentRequests,
                _queueLimit);
            return null;
        }

        var waitingCount = Interlocked.Increment(ref _waitingCount);
        if (waitingCount > _queueLimit)
        {
            Interlocked.Decrement(ref _waitingCount);
            _logger.LogWarning(
                "Vision detect concurrency gate rejected request because queue is full. max_concurrent={MaxConcurrent} queue_limit={QueueLimit} waiting={Waiting}",
                MaxConcurrentRequests,
                _queueLimit,
                waitingCount);
            return null;
        }

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(QueueTimeout);

            try
            {
                await _semaphore.WaitAsync(timeoutCts.Token);
                return new Lease(this, acquired: true);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "Vision detect concurrency gate rejected request after queue timeout. max_concurrent={MaxConcurrent} queue_timeout_ms={QueueTimeoutMs}",
                    MaxConcurrentRequests,
                    QueueTimeout.TotalMilliseconds);
                return null;
            }
        }
        finally
        {
            Interlocked.Decrement(ref _waitingCount);
        }
    }

    private void Release()
    {
        _semaphore?.Release();
    }

    public sealed class Lease : IDisposable
    {
        private readonly VisionDetectConcurrencyGate? _owner;
        private bool _disposed;

        internal Lease(VisionDetectConcurrencyGate? owner, bool acquired)
        {
            _owner = owner;
            Acquired = acquired;
        }

        public bool Acquired { get; }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            if (Acquired)
            {
                _owner?.Release();
            }
        }
    }
}
