using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.AdminAi;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public class AdminQuotaOverviewServiceTests
{
    [Fact]
    public async Task GetOverviewAsync_WhenNoRuntimeData_ReturnsNoFakeProviders()
    {
        var cache = new Mock<IAdminRuntimeSnapshotCache>();
        cache
            .Setup(service => service.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto());

        var runtime = CreateRuntimeService();
        runtime
            .Setup(service => service.GetRuntimeProjectsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AdminRuntimeProjectDto>());
        runtime
            .Setup(service => service.GetTelemetryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AdminRuntimeTelemetryDto>());

        var service = new AdminQuotaOverviewService(
            cache.Object,
            runtime.Object,
            Mock.Of<ILogger<AdminQuotaOverviewService>>());

        var overview = await service.GetOverviewAsync(new AdminQuotaOverviewQuery(), CancellationToken.None);

        Assert.Empty(overview.Providers);
        Assert.Empty(overview.TokenTimeline);
        Assert.Equal("all", overview.ProviderFilter);
        Assert.Equal(60, overview.CacheTtlSeconds);
    }

    [Fact]
    public async Task GetOverviewAsync_WithGeminiRuntimeSnapshot_UsesRealQuotaWindows()
    {
        var telemetryCompletedAt = DateTime.UtcNow.AddDays(-1);
        var cache = new Mock<IAdminRuntimeSnapshotCache>();
        cache
            .Setup(service => service.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto
            {
                RuntimeStatusSource = "ai-provider",
                Limits = new RuntimeLimitsDto { Rpm = 60, Tpm = 1_000_000, Rpd = 100 },
                Projects =
                [
                    new RuntimeProjectStateDto
                    {
                        ProjectAlias = "EatFit Primary",
                        ProjectId = "eatfit-primary",
                        KeyAlias = "primary-key",
                        Model = "gemini-2.0-flash",
                        State = "available",
                        Available = true,
                        QuotaSource = "provider-runtime",
                        RpmUsed = 2,
                        RpmRemaining = 58,
                        TpmUsed = 1_500,
                        TpmRemaining = 998_500,
                        RpdUsed = 16,
                        RpdRemaining = 84,
                        TotalRequests = 16,
                        TotalTokens = 3_000,
                        LastUsedAt = telemetryCompletedAt.ToString("O"),
                    },
                ],
            });

        var runtime = CreateRuntimeService();
        runtime
            .Setup(service => service.GetRuntimeProjectsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new AdminRuntimeProjectDto
                {
                    RuntimeProjectId = "eatfit-primary",
                    ProjectId = "eatfit-primary",
                    ProjectAlias = "EatFit Primary",
                    IsEnabled = true,
                    State = "available",
                    LastModel = "gemini-2.0-flash",
                },
            ]);
        runtime
            .Setup(service => service.GetTelemetryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new AdminRuntimeTelemetryDto
                {
                    RuntimeProjectId = "eatfit-primary",
                    ProjectAlias = "EatFit Primary",
                    Model = "gemini-2.0-flash",
                    CompletedAt = telemetryCompletedAt,
                    Outcome = "success",
                    UsageMetadataJson = "{\"promptTokenCount\":1000,\"candidatesTokenCount\":2000,\"totalTokenCount\":3000}",
                },
            ]);

        var service = new AdminQuotaOverviewService(
            cache.Object,
            runtime.Object,
            Mock.Of<ILogger<AdminQuotaOverviewService>>());

        var overview = await service.GetOverviewAsync(new AdminQuotaOverviewQuery { Provider = "gemini", Window = "7d" }, CancellationToken.None);

        var provider = Assert.Single(overview.Providers);
        Assert.Equal("gemini", provider.Provider);
        Assert.Equal("EatFit Primary", provider.ProjectAlias);
        Assert.True(provider.IsEnabled);
        Assert.True(provider.Available);
        Assert.Equal(3_000, provider.TotalTokens);
        Assert.Contains(provider.Windows, window => window.Kind == "rpd" && window.Used == 16 && window.Remaining == 84 && window.Limit == 100);
        Assert.Contains(overview.TokenTimeline, point => point.TotalTokens == 3_000);
        Assert.Contains(overview.ModelMix, model => model.Model == "gemini-2.0-flash" && model.TotalTokens == 3_000);
    }

    [Fact]
    public async Task GetOverviewAsync_WhenUsageMetadataMissing_DoesNotInventTokenCounts()
    {
        var cache = new Mock<IAdminRuntimeSnapshotCache>();
        cache
            .Setup(service => service.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto
            {
                Projects =
                [
                    new RuntimeProjectStateDto
                    {
                        ProjectAlias = "No Metadata",
                        ProjectId = "no-metadata",
                        State = "available",
                        Available = true,
                    },
                ],
            });

        var runtime = CreateRuntimeService();
        runtime
            .Setup(service => service.GetRuntimeProjectsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AdminRuntimeProjectDto>());
        runtime
            .Setup(service => service.GetTelemetryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new AdminRuntimeTelemetryDto
                {
                    RuntimeProjectId = "no-metadata",
                    ProjectAlias = "No Metadata",
                    Model = "gemini-2.0-flash",
                    CompletedAt = DateTime.UtcNow,
                    Outcome = "failure",
                    ProviderStatusCode = 400,
                    UsageMetadataJson = null,
                },
            ]);

        var service = new AdminQuotaOverviewService(
            cache.Object,
            runtime.Object,
            Mock.Of<ILogger<AdminQuotaOverviewService>>());

        var overview = await service.GetOverviewAsync(new AdminQuotaOverviewQuery(), CancellationToken.None);

        var point = Assert.Single(overview.TokenTimeline);
        Assert.Equal(1, point.RequestCount);
        Assert.Equal(0, point.TotalTokens);
        var model = Assert.Single(overview.ModelMix);
        Assert.Equal(1, model.RequestCount);
        Assert.Equal(0, model.TotalTokens);
        Assert.All(overview.Providers, provider => Assert.Equal(0, provider.TotalTokens));
    }

    [Fact]
    public async Task GetOverviewAsync_WithOneHourWindow_BucketsTrafficEveryFiveMinutes()
    {
        var now = DateTime.UtcNow;
        var cache = new Mock<IAdminRuntimeSnapshotCache>();
        cache
            .Setup(service => service.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto());

        var runtime = CreateRuntimeService();
        runtime
            .Setup(service => service.GetTelemetryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new AdminRuntimeTelemetryDto
                {
                    RuntimeProjectId = "key-a",
                    ProjectAlias = "Key A",
                    Model = "gemini-2.5-flash",
                    CompletedAt = new DateTime(now.Year, now.Month, now.Day, now.Hour, 12, 30, DateTimeKind.Utc),
                    Outcome = "success",
                    UsageMetadataJson = "{\"promptTokenCount\":10,\"candidatesTokenCount\":5,\"totalTokenCount\":15}",
                },
                new AdminRuntimeTelemetryDto
                {
                    RuntimeProjectId = "key-a",
                    ProjectAlias = "Key A",
                    Model = "gemini-2.5-flash",
                    CompletedAt = new DateTime(now.Year, now.Month, now.Day, now.Hour, 14, 10, DateTimeKind.Utc),
                    Outcome = "success",
                    UsageMetadataJson = "{\"promptTokenCount\":20,\"candidatesTokenCount\":5,\"totalTokenCount\":25}",
                },
                new AdminRuntimeTelemetryDto
                {
                    RuntimeProjectId = "key-old",
                    ProjectAlias = "Old Key",
                    Model = "gemini-2.5-flash",
                    CompletedAt = now.AddHours(-2),
                    Outcome = "success",
                    UsageMetadataJson = "{\"totalTokenCount\":99}",
                },
            ]);

        var service = new AdminQuotaOverviewService(
            cache.Object,
            runtime.Object,
            Mock.Of<ILogger<AdminQuotaOverviewService>>());

        var overview = await service.GetOverviewAsync(
            new AdminQuotaOverviewQuery { Provider = "gemini", Window = "1h" },
            CancellationToken.None);

        Assert.Equal("1h", overview.Window);
        var point = Assert.Single(overview.TokenTimeline);
        Assert.Equal(2, point.RequestCount);
        Assert.Equal(40, point.TotalTokens);
        Assert.EndsWith(":10:00.0000000Z", point.Date);
    }

    private static Mock<IGeminiRuntimeProjectService> CreateRuntimeService()
    {
        var runtime = new Mock<IGeminiRuntimeProjectService>();
        runtime
            .Setup(service => service.GetRuntimeProjectsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AdminRuntimeProjectDto>());
        runtime
            .Setup(service => service.GetTelemetryAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AdminRuntimeTelemetryDto>());
        return runtime;
    }
}
