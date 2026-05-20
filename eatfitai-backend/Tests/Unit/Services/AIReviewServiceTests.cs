using EatFitAI.API.Data;
using EatFitAI.API.DTOs;
using EatFitAI.API.Models;
using EatFitAI.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EatFitAI.API.Tests.Unit.Services;

public sealed class AIReviewServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly AIReviewService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DateOnly _today = new(2026, 5, 20);

    public AIReviewServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);
        _service = new AIReviewService(
            _context,
            NullLogger<AIReviewService>.Instance,
            new FixedBusinessDateService(_today));

        _context.Users.Add(new User
        {
            UserId = _userId,
            Email = "weekly@example.com",
            PasswordHash = "test",
            CreatedAt = _today.AddDays(-14).ToDateTime(TimeOnly.MinValue),
            EmailVerified = true
        });
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task AnalyzeWeeklyProgress_ReturnsOnlyOnePrimaryAction()
    {
        var review = await _service.AnalyzeWeeklyProgress(_userId);

        Assert.NotNull(review.PrimaryAction);
        Assert.False(string.IsNullOrWhiteSpace(review.PrimaryAction.ActionKey));
        Assert.True(review.Insights.Recommendations.Count <= 1);
    }

    [Fact]
    public async Task RecordReviewAction_PersistsWeeklyActionStatusForCurrentWeek()
    {
        var result = await _service.RecordReviewAction(
            _userId,
            new ReviewActionRequestDto
            {
                Action = "accept",
                ActionKey = "log_four_days",
                Label = "Log 4 ngày trong tuần",
                WeekStartDate = new DateTime(2026, 5, 18)
            });

        Assert.Equal("accepted", result.Status);
        Assert.Equal(new DateTime(2026, 5, 18), result.WeekStartDate);

        var saved = await _context.WeeklyReviewActions.SingleAsync();
        Assert.Equal(_userId, saved.UserId);
        Assert.Equal(new DateOnly(2026, 5, 18), saved.WeekStartDate);
        Assert.Equal("log_four_days", saved.ActionKey);
        Assert.Equal("accepted", saved.Status);
    }

    [Fact]
    public async Task RecordReviewAction_ReplaceStoresReplacementText()
    {
        var result = await _service.RecordReviewAction(
            _userId,
            new ReviewActionRequestDto
            {
                Action = "replace",
                ActionKey = "log_four_days",
                Label = "Log 4 ngày trong tuần",
                ReplacementText = "Chuẩn bị bữa trưa trước 3 ngày",
                WeekStartDate = new DateTime(2026, 5, 18)
            });

        Assert.Equal("replaced", result.Status);
        Assert.Equal("Chuẩn bị bữa trưa trước 3 ngày", result.ReplacementText);

        var saved = await _context.WeeklyReviewActions.SingleAsync();
        Assert.Equal("replaced", saved.Status);
        Assert.Equal("Chuẩn bị bữa trưa trước 3 ngày", saved.ReplacementText);
    }

    private sealed class FixedBusinessDateService : IBusinessDateService
    {
        private readonly DateOnly _today;

        public FixedBusinessDateService(DateOnly today)
        {
            _today = today;
        }

        public Task<DateOnly> GetTodayAsync(Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult(_today);

        public Task<string> GetUserTimeZoneIdAsync(Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult(BusinessTimeZone.DefaultTimeZoneId);

        public DateOnly ToDateOnly(DateTime value, string? timeZoneId = null)
            => DateOnly.FromDateTime(value);

        public DateOnly ToDateOnly(DateTimeOffset instant, string? timeZoneId = null)
            => DateOnly.FromDateTime(instant.UtcDateTime);

        public (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly localDate, string? timeZoneId = null)
            => (localDate.ToDateTime(TimeOnly.MinValue), localDate.AddDays(1).ToDateTime(TimeOnly.MinValue));
    }
}
