using System.Security.Claims;
using EatFitAI.API.Controllers;
using EatFitAI.API.DTOs.Support;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Controllers;

public sealed class SupportFeedbackControllerTests
{
    [Fact]
    public async Task SubmitFeedback_WithValidRequest_SendsFeedbackEmailToConfiguredRecipient()
    {
        var userId = Guid.Parse("c320df25-1496-4e66-ae71-7994ee0c6a5f");
        var emailService = new FakeEmailService();
        var controller = CreateController(userId, "user@example.com", "Người dùng thử", emailService);

        var result = await controller.SubmitFeedback(new FeedbackRequest
        {
            Category = "performance",
            Sentiment = "bad",
            Message = "App hơi lag khi mở màn thống kê.",
            AppVersion = "1.0.0",
            BuildNumber = "1",
            Platform = "android",
            DeviceModel = "Pixel Test",
            Screen = "About",
        }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(emailService.LastMessage);
        Assert.Equal("dinhconghieudch1610@gmail.com", emailService.LastMessage.RecipientEmail);
        Assert.Equal("user@example.com", emailService.LastMessage.UserEmail);
        Assert.Equal(userId, emailService.LastMessage.UserId);
        Assert.Equal("App hơi lag khi mở màn thống kê.", emailService.LastMessage.Message);
        Assert.Contains("traceId", ok.Value!.ToString());
    }

    [Fact]
    public async Task SubmitFeedback_WithShortMessage_ReturnsBadRequestAndDoesNotSend()
    {
        var emailService = new FakeEmailService();
        var controller = CreateController(Guid.NewGuid(), "user@example.com", "User", emailService);

        var result = await controller.SubmitFeedback(new FeedbackRequest
        {
            Category = "performance",
            Sentiment = "bad",
            Message = "lag",
        }, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Null(emailService.LastMessage);
    }

    private static SupportFeedbackController CreateController(
        Guid userId,
        string email,
        string displayName,
        IEmailService emailService)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Feedback:RecipientEmail"] = "dinhconghieudch1610@gmail.com",
            })
            .Build();

        var httpContext = new DefaultHttpContext
        {
            TraceIdentifier = "trace-controller-test",
            User = new ClaimsPrincipal(new ClaimsIdentity(
                new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Email, email),
                    new Claim(ClaimTypes.Name, displayName),
                },
                "unit-test")),
        };

        return new SupportFeedbackController(
            emailService,
            configuration,
            NullLogger<SupportFeedbackController>.Instance)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = httpContext,
            },
        };
    }

    private sealed class FakeEmailService : IEmailService
    {
        public FeedbackEmailMessage? LastMessage { get; private set; }

        public Task SendResetCodeAsync(string email, string code, DateTime expiresAt)
        {
            throw new NotSupportedException();
        }

        public Task SendVerificationCodeAsync(string email, string code, DateTime expiresAt)
        {
            throw new NotSupportedException();
        }

        public Task SendFeedbackAsync(FeedbackEmailMessage message, CancellationToken cancellationToken = default)
        {
            LastMessage = message;
            return Task.CompletedTask;
        }
    }
}
