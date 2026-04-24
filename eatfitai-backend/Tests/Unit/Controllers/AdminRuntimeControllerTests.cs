using System.Text;
using System.Threading.Channels;
using EatFitAI.API.Controllers;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Controllers;

public class AdminRuntimeControllerTests
{
    [Fact]
    public async Task GetEvents_StartsStreamImmediatelyWhenCacheIsEmpty()
    {
        var runtimeSnapshotCache = new Mock<IAdminRuntimeSnapshotCache>();
        runtimeSnapshotCache
            .Setup(cache => cache.GetState())
            .Returns(new AdminRuntimeSnapshotCacheState());
        var eventBus = new Mock<IAdminRealtimeEventBus>();
        eventBus.SetupGet(bus => bus.CurrentVersion).Returns(0);
        eventBus
            .Setup(bus => bus.Subscribe(It.IsAny<CancellationToken>()))
            .Returns(Channel.CreateUnbounded<AdminRuntimeEventDto>().Reader);

        var controller = new AdminRuntimeController(
            runtimeSnapshotCache.Object,
            eventBus.Object,
            Mock.Of<ILogger<AdminRuntimeController>>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var responseBody = new MemoryStream();
        controller.Response.Body = responseBody;

        using var cancellationSource = new CancellationTokenSource(TimeSpan.FromMilliseconds(150));

        await controller.GetEvents(cancellationSource.Token);

        var responseText = Encoding.UTF8.GetString(responseBody.ToArray());

        Assert.Contains(": stream-open", responseText);
        runtimeSnapshotCache.Verify(cache => cache.GetState(), Times.AtLeastOnce);
    }

    [Fact]
    public async Task GetEvents_WritesBootstrapSnapshotFromCache()
    {
        var snapshot = new AdminRuntimeSnapshotDto
        {
            PoolHealth = "Healthy",
            ActiveProject = "gemini-primary",
            AvailableProjectCount = 3,
            ExhaustedProjectCount = 0,
            CooldownProjectCount = 0,
        };

        var runtimeSnapshotCache = new Mock<IAdminRuntimeSnapshotCache>();
        runtimeSnapshotCache
            .Setup(cache => cache.GetState())
            .Returns(new AdminRuntimeSnapshotCacheState
            {
                Snapshot = snapshot,
                LastSuccessAt = DateTimeOffset.UtcNow,
            });

        var eventBus = new Mock<IAdminRealtimeEventBus>();
        eventBus.SetupGet(bus => bus.CurrentVersion).Returns(7);
        eventBus
            .Setup(bus => bus.Subscribe(It.IsAny<CancellationToken>()))
            .Returns(Channel.CreateUnbounded<AdminRuntimeEventDto>().Reader);

        var controller = new AdminRuntimeController(
            runtimeSnapshotCache.Object,
            eventBus.Object,
            Mock.Of<ILogger<AdminRuntimeController>>())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var responseBody = new MemoryStream();
        controller.Response.Body = responseBody;

        using var cancellationSource = new CancellationTokenSource(TimeSpan.FromMilliseconds(150));

        await controller.GetEvents(cancellationSource.Token);

        var responseText = Encoding.UTF8.GetString(responseBody.ToArray());

        Assert.Contains("event: runtime.snapshot", responseText);
        Assert.Contains("event: runtime.health.updated", responseText);
        Assert.Contains("gemini-primary", responseText);
    }

    [Fact]
    public async Task GetSnapshot_WhenCacheHasWarning_ReturnsWarningMetadata()
    {
        var snapshot = new AdminRuntimeSnapshotDto
        {
            PoolHealth = "Healthy",
            ActiveProject = "gemini-primary",
            RuntimeStatusSource = "local-runtime-fallback",
            RuntimeStatusWarning = "ai_provider_runtime_status_unavailable",
            RuntimeStatusError = "http_403",
        };

        var runtimeSnapshotCache = new Mock<IAdminRuntimeSnapshotCache>();
        runtimeSnapshotCache
            .Setup(cache => cache.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(snapshot);
        runtimeSnapshotCache
            .Setup(cache => cache.GetState())
            .Returns(new AdminRuntimeSnapshotCacheState
            {
                Snapshot = snapshot,
                LastWarning = "ai_provider_runtime_status_unavailable: http_403",
            });

        var controller = new AdminRuntimeController(
            runtimeSnapshotCache.Object,
            Mock.Of<IAdminRealtimeEventBus>(),
            Mock.Of<ILogger<AdminRuntimeController>>());

        var result = await controller.GetSnapshot(CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ApiResponse<AdminRuntimeSnapshotDto>>(ok.Value);
        Assert.NotNull(response.Warnings);
        Assert.Contains("ai_provider_runtime_status_unavailable: http_403", response.Warnings);
        Assert.Equal("local-runtime-fallback", response.Data?.RuntimeStatusSource);
        Assert.Equal("http_403", response.Data?.RuntimeStatusError);
    }
}
