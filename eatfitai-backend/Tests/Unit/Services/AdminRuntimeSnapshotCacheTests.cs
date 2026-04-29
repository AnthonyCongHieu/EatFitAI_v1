using System.Net;
using System.Threading.Channels;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AdminRuntimeSnapshotCacheTests
{
    [Fact]
    public async Task RefreshNowAsync_WhenProviderRuntimeStatusFails_ReturnsLocalFallbackWithWarningMetadata()
    {
        var runtimeStatusService = new Mock<IAiRuntimeStatusService>();
        runtimeStatusService
            .Setup(service => service.GetSnapshotAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("forbidden", null, HttpStatusCode.Forbidden));

        var fallbackSnapshot = new AdminRuntimeSnapshotDto
        {
            PoolHealth = "Healthy",
            AvailableProjectCount = 1,
            RuntimeStatusSource = "local",
        };

        var runtimeProjectService = new Mock<IGeminiRuntimeProjectService>();
        runtimeProjectService
            .Setup(service => service.BuildSnapshotAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(fallbackSnapshot);

        var services = new ServiceCollection();
        services.AddSingleton(runtimeStatusService.Object);
        services.AddSingleton(runtimeProjectService.Object);
        var provider = services.BuildServiceProvider();

        var eventBus = new Mock<IAdminRealtimeEventBus>();
        eventBus
            .Setup(bus => bus.Publish(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object>()))
            .Returns(new AdminRuntimeEventDto());
        eventBus
            .Setup(bus => bus.Subscribe(It.IsAny<CancellationToken>()))
            .Returns(Channel.CreateUnbounded<AdminRuntimeEventDto>().Reader);

        var cache = new AdminRuntimeSnapshotCache(
            provider.GetRequiredService<IServiceScopeFactory>(),
            eventBus.Object,
            Mock.Of<ILogger<AdminRuntimeSnapshotCache>>());

        var snapshot = await cache.RefreshNowAsync();

        Assert.NotNull(snapshot);
        Assert.Equal("local-runtime-fallback", snapshot.RuntimeStatusSource);
        Assert.Equal("ai_provider_runtime_status_unavailable", snapshot.RuntimeStatusWarning);
        Assert.Equal("http_403", snapshot.RuntimeStatusError);

        var state = cache.GetState();
        Assert.Contains("ai_provider_runtime_status_unavailable", state.LastWarning);
    }

    [Fact]
    public async Task RefreshNowAsync_WhenProviderRuntimeStatusIsTemporarilyUnavailable_DoesNotLogWarning()
    {
        var runtimeStatusService = new Mock<IAiRuntimeStatusService>();
        runtimeStatusService
            .Setup(service => service.GetSnapshotAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("warming up", null, HttpStatusCode.ServiceUnavailable));

        var fallbackSnapshot = new AdminRuntimeSnapshotDto
        {
            PoolHealth = "Healthy",
            AvailableProjectCount = 1,
            RuntimeStatusSource = "local",
        };

        var runtimeProjectService = new Mock<IGeminiRuntimeProjectService>();
        runtimeProjectService
            .Setup(service => service.BuildSnapshotAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(fallbackSnapshot);

        var services = new ServiceCollection();
        services.AddSingleton(runtimeStatusService.Object);
        services.AddSingleton(runtimeProjectService.Object);
        var provider = services.BuildServiceProvider();

        var eventBus = new Mock<IAdminRealtimeEventBus>();
        eventBus
            .Setup(bus => bus.Publish(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object>()))
            .Returns(new AdminRuntimeEventDto());
        eventBus
            .Setup(bus => bus.Subscribe(It.IsAny<CancellationToken>()))
            .Returns(Channel.CreateUnbounded<AdminRuntimeEventDto>().Reader);

        var logger = new CapturingLogger<AdminRuntimeSnapshotCache>();
        var cache = new AdminRuntimeSnapshotCache(
            provider.GetRequiredService<IServiceScopeFactory>(),
            eventBus.Object,
            logger);

        var snapshot = await cache.RefreshNowAsync();

        Assert.NotNull(snapshot);
        Assert.Equal("http_503", snapshot.RuntimeStatusError);
        Assert.DoesNotContain(logger.Entries, entry => entry.Level >= LogLevel.Warning);
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<CapturedLogEntry> Entries { get; } = new();

        public IDisposable BeginScope<TState>(TState state)
            where TState : notnull
        {
            return NullScope.Instance;
        }

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add(new CapturedLogEntry(logLevel, formatter(state, exception)));
        }
    }

    private sealed record CapturedLogEntry(LogLevel Level, string Message);

    private sealed class NullScope : IDisposable
    {
        public static readonly NullScope Instance = new();

        public void Dispose()
        {
        }
    }
}
