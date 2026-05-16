using System.Security.Claims;
using EatFitAI.API.Controllers;
using EatFitAI.API.DTOs.Subscription;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Controllers;

public sealed class SubscriptionControllerTests
{
    [Fact]
    public async Task GetCurrent_ReturnsSubscriptionForAuthenticatedUser()
    {
        var userId = Guid.NewGuid();
        var expected = new SubscriptionStatusDto
        {
            PlanCode = "premium",
            Status = "active",
            IsPremium = true,
        };
        var controller = CreateController(userId, new FakeEntitlementService(expected));

        var result = await controller.GetCurrent(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, okResult.Value);
    }

    [Fact]
    public async Task GetCurrent_ReturnsUnauthorized_WhenUserClaimIsMissing()
    {
        var controller = new SubscriptionController(new FakeEntitlementService(new SubscriptionStatusDto()))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
            },
        };

        var result = await controller.GetCurrent(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    private static SubscriptionController CreateController(Guid userId, IEntitlementService service)
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) },
                "unit-test")),
        };

        return new SubscriptionController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = httpContext,
            },
        };
    }

    private sealed class FakeEntitlementService : IEntitlementService
    {
        private readonly SubscriptionStatusDto _status;

        public FakeEntitlementService(SubscriptionStatusDto status)
        {
            _status = status;
        }

        public Task<SubscriptionStatusDto> GetSubscriptionStatusAsync(
            Guid userId,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_status);
        }
    }
}
