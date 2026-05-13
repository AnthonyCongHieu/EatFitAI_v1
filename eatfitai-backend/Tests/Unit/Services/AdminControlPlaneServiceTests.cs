using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class AdminControlPlaneServiceTests
{
    [Fact]
    public async Task GetSnapshotAsync_UsesBackendEvidenceWithoutRenderFallback()
    {
        var runtimeCache = new Mock<IAdminRuntimeSnapshotCache>();
        runtimeCache
            .Setup(cache => cache.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto
            {
                CheckedAt = new DateTime(2026, 5, 13, 1, 0, 0, DateTimeKind.Utc),
                PoolHealth = "Healthy",
                RuntimeStatusSource = "ai-provider-cache",
                AvailableProjectCount = 1,
                Limits = new RuntimeLimitsDto { Rpd = 20 },
                Projects =
                [
                    new RuntimeProjectStateDto
                    {
                        ProjectAlias = "primary",
                        ProjectId = "eatfit-primary",
                        Available = true,
                        RpdUsed = 3,
                        RpdRemaining = 17,
                    },
                ],
            });

        await using var provider = CreateProvider(runtimeCache.Object, new Dictionary<string, string?>
        {
            ["ASPNETCORE_ENVIRONMENT"] = "Production",
            ["Media:R2:AccountId"] = "configured",
            ["Media:R2:Bucket"] = "eatfitai-media",
            ["Media:R2:AccessKeyId"] = "configured",
            ["Media:R2:SecretAccessKey"] = "configured",
            ["Brevo:BaseUrl"] = "https://api.brevo.com",
            ["Brevo:ApiKey"] = "configured",
            ["Brevo:SenderEmail"] = "admin@eatfit.ai",
            ["Brevo:SenderName"] = "EatFitAI",
            ["AIProvider:VisionBaseUrl"] = "http://172.26.11.92:5050",
            ["FoodBarcodeProvider:TemplateUrl"] = "https://world.openfoodfacts.org/api/v0/product/{barcode}.json",
            ["FoodBarcodeProvider:Name"] = "OpenFoodFacts",
        });

        var service = provider.GetRequiredService<IAdminControlPlaneService>();

        var snapshot = await service.GetSnapshotAsync(CancellationToken.None);

        Assert.Equal("Production", snapshot.Environment);
        Assert.Contains(snapshot.Services, service => service.ServiceId == "backend-api" && service.Status == "healthy");
        Assert.Contains(snapshot.Services, service => service.ServiceId == "ai-provider" && service.Status == "healthy");
        Assert.Contains(snapshot.Services, service => service.ServiceId == "render-cold-backup" && service.Status == "legacy");
        Assert.Contains(snapshot.Quota, quota => quota.Provider == "gemini" && quota.Used == 3 && quota.Remaining == 17);
        Assert.Contains(snapshot.CleanupCandidates, candidate => candidate.CandidateId == "keep-alive");
        Assert.DoesNotContain(
            snapshot.Evidence.Select(evidence => evidence.Summary),
            summary => summary.Contains("onrender.com", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task RefreshAsync_RequiresJustification()
    {
        await using var provider = CreateProvider(Mock.Of<IAdminRuntimeSnapshotCache>());
        var service = provider.GetRequiredService<IAdminControlPlaneService>();

        await Assert.ThrowsAsync<ArgumentException>(() => service.RefreshAsync(
            new AdminControlPlaneRefreshRequest { Targets = ["runtime"], Justification = "short" },
            new DefaultHttpContext(),
            CancellationToken.None));
    }

    [Fact]
    public async Task RefreshAsync_RateLimitsRepeatedRuntimeRefresh()
    {
        var runtimeCache = new Mock<IAdminRuntimeSnapshotCache>();
        runtimeCache
            .Setup(cache => cache.GetLatestAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto { PoolHealth = "Healthy", AvailableProjectCount = 1 });
        runtimeCache
            .Setup(cache => cache.RefreshNowAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminRuntimeSnapshotDto { PoolHealth = "Healthy", AvailableProjectCount = 1 });

        var audit = new Mock<IAdminAuditService>();
        await using var provider = CreateProvider(runtimeCache.Object, audit.Object);
        var service = provider.GetRequiredService<IAdminControlPlaneService>();
        var httpContext = new DefaultHttpContext();
        httpContext.TraceIdentifier = "refresh-test";

        var first = await service.RefreshAsync(
            new AdminControlPlaneRefreshRequest { Targets = ["runtime"], Justification = "manual production check" },
            httpContext,
            CancellationToken.None);
        var second = await service.RefreshAsync(
            new AdminControlPlaneRefreshRequest { Targets = ["runtime"], Justification = "manual production check" },
            httpContext,
            CancellationToken.None);

        Assert.Contains(first.Targets, target => target.Target == "runtime" && target.Status == "refreshed");
        Assert.Contains(second.Targets, target => target.Target == "runtime" && target.Status == "rate_limited");
        runtimeCache.Verify(cache => cache.RefreshNowAsync(It.IsAny<CancellationToken>()), Times.Once);
        audit.Verify(service => service.WriteAsync(
            It.IsAny<HttpContext>(),
            It.Is<AdminAuditWriteRequest>(request => request.Action == "control-plane.refresh"),
            It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    private static ServiceProvider CreateProvider(
        IAdminRuntimeSnapshotCache runtimeCache,
        IAdminAuditService? auditService = null)
    {
        return CreateProvider(runtimeCache, new Dictionary<string, string?>(), auditService);
    }

    private static ServiceProvider CreateProvider(
        IAdminRuntimeSnapshotCache runtimeCache,
        Dictionary<string, string?> configuration,
        IAdminAuditService? auditService = null)
    {
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configuration)
            .Build();

        services.AddSingleton<IConfiguration>(config);
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase($"admin-control-plane-{Guid.NewGuid():N}"));
        services.AddSingleton(runtimeCache);
        services.AddSingleton(auditService ?? Mock.Of<IAdminAuditService>());
        services.AddSingleton<IAdminControlPlaneService, AdminControlPlaneService>();
        services.AddLogging();

        return services.BuildServiceProvider();
    }
}
