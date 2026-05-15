using EatFitAI.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface IBusinessDateService
{
    Task<DateOnly> GetTodayAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<string> GetUserTimeZoneIdAsync(Guid userId, CancellationToken cancellationToken = default);
    DateOnly ToDateOnly(DateTime value, string? timeZoneId = null);
    DateOnly ToDateOnly(DateTimeOffset instant, string? timeZoneId = null);
    (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly localDate, string? timeZoneId = null);
}

public sealed class BusinessDateService : IBusinessDateService
{
    private readonly ApplicationDbContext _db;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<BusinessDateService> _logger;

    public BusinessDateService(
        ApplicationDbContext db,
        TimeProvider timeProvider,
        ILogger<BusinessDateService> logger)
    {
        _db = db;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<DateOnly> GetTodayAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var timeZoneId = await GetUserTimeZoneIdAsync(userId, cancellationToken);
        return ToDateOnly(_timeProvider.GetUtcNow(), timeZoneId);
    }

    public async Task<string> GetUserTimeZoneIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var configuredTimeZoneId = await _db.UserPreferences
            .AsNoTracking()
            .Where(pref => pref.UserId == userId)
            .Select(pref => pref.TimeZoneId)
            .FirstOrDefaultAsync(cancellationToken);

        var normalized = BusinessTimeZone.NormalizeOrDefault(configuredTimeZoneId);
        if (!string.IsNullOrWhiteSpace(configuredTimeZoneId)
            && !string.Equals(configuredTimeZoneId.Trim(), normalized, StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "User {UserId} has invalid or legacy TimeZoneId '{TimeZoneId}', falling back to {DefaultTimeZoneId}.",
                userId,
                configuredTimeZoneId,
                normalized);
        }

        return normalized;
    }

    public DateOnly ToDateOnly(DateTime value, string? timeZoneId = null)
    {
        if (value.Kind == DateTimeKind.Unspecified)
        {
            return DateOnly.FromDateTime(value);
        }

        var instant = value.Kind == DateTimeKind.Utc
            ? new DateTimeOffset(value)
            : new DateTimeOffset(value.ToUniversalTime(), TimeSpan.Zero);
        return ToDateOnly(instant, timeZoneId);
    }

    public DateOnly ToDateOnly(DateTimeOffset instant, string? timeZoneId = null)
    {
        var normalized = BusinessTimeZone.NormalizeOrDefault(timeZoneId);
        if (!BusinessTimeZone.TryResolve(normalized, out var timeZone))
        {
            timeZone = BusinessTimeZone.DefaultTimeZone;
        }

        var local = TimeZoneInfo.ConvertTime(instant, timeZone);
        return DateOnly.FromDateTime(local.DateTime);
    }

    public (DateTime StartUtc, DateTime EndUtc) GetUtcRange(DateOnly localDate, string? timeZoneId = null)
    {
        var normalized = BusinessTimeZone.NormalizeOrDefault(timeZoneId);
        if (!BusinessTimeZone.TryResolve(normalized, out var timeZone))
        {
            timeZone = BusinessTimeZone.DefaultTimeZone;
        }

        var localStart = DateTime.SpecifyKind(localDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        var localEnd = DateTime.SpecifyKind(localDate.AddDays(1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return (
            TimeZoneInfo.ConvertTimeToUtc(localStart, timeZone),
            TimeZoneInfo.ConvertTimeToUtc(localEnd, timeZone));
    }
}

public static class BusinessTimeZone
{
    public const string DefaultTimeZoneId = "Asia/Ho_Chi_Minh";
    private const string WindowsVietnamTimeZoneId = "SE Asia Standard Time";

    public static TimeZoneInfo DefaultTimeZone
        => TryResolve(DefaultTimeZoneId, out var timeZone) ? timeZone : TimeZoneInfo.Utc;

    public static string NormalizeOrDefault(string? timeZoneId)
    {
        var candidate = (timeZoneId ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return DefaultTimeZoneId;
        }

        if (string.Equals(candidate, "Asia/Saigon", StringComparison.OrdinalIgnoreCase)
            || string.Equals(candidate, WindowsVietnamTimeZoneId, StringComparison.OrdinalIgnoreCase))
        {
            return DefaultTimeZoneId;
        }

        return TryResolve(candidate, out _) ? candidate : DefaultTimeZoneId;
    }

    public static bool TryResolve(string? timeZoneId, out TimeZoneInfo timeZone)
    {
        timeZone = TimeZoneInfo.Utc;
        var candidate = (timeZoneId ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return false;
        }

        if (string.Equals(candidate, "Asia/Saigon", StringComparison.OrdinalIgnoreCase))
        {
            candidate = DefaultTimeZoneId;
        }

        if (TryFind(candidate, out timeZone))
        {
            return true;
        }

        if (TimeZoneInfo.TryConvertIanaIdToWindowsId(candidate, out var windowsId)
            && TryFind(windowsId, out timeZone))
        {
            return true;
        }

        if (TimeZoneInfo.TryConvertWindowsIdToIanaId(candidate, out var ianaId)
            && TryFind(ianaId, out timeZone))
        {
            return true;
        }

        return false;
    }

    private static bool TryFind(string timeZoneId, out TimeZoneInfo timeZone)
    {
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
        }
        catch (InvalidTimeZoneException)
        {
        }

        timeZone = TimeZoneInfo.Utc;
        return false;
    }
}
