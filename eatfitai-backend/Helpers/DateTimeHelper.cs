namespace EatFitAI.API.Helpers;

public static class DateTimeHelper
{
    private static readonly TimeZoneInfo VietnamTimeZone = ResolveVietnamTimeZone();

    public static DateTime GetVietnamNow()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone);
    }

    public static DateOnly GetVietnamToday()
    {
        return DateOnly.FromDateTime(GetVietnamNow());
    }

    public static DateTime ToVietnamTime(DateTime value)
    {
        if (value.Kind == DateTimeKind.Utc)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(value, VietnamTimeZone);
        }

        if (value.Kind == DateTimeKind.Unspecified)
        {
            return value;
        }

        return TimeZoneInfo.ConvertTime(value, VietnamTimeZone);
    }

    public static DateOnly ToVietnamDateOnly(DateTime value)
    {
        return DateOnly.FromDateTime(ToVietnamTime(value));
    }

    public static int? GetAge(DateOnly? dateOfBirth)
    {
        if (!dateOfBirth.HasValue)
        {
            return null;
        }

        var today = GetVietnamToday();
        var age = today.Year - dateOfBirth.Value.Year;
        if (dateOfBirth.Value.DayNumber > today.AddYears(-age).DayNumber)
        {
            age -= 1;
        }

        return age < 0 ? 0 : age;
    }

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        foreach (var timeZoneId in new[] { "SE Asia Standard Time", "Asia/Ho_Chi_Minh", "Asia/Saigon" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Utc;
    }
}
