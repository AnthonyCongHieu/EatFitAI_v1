using System.Text.Json;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Subscription;
using EatFitAI.API.Models;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public sealed class EntitlementService : IEntitlementService
{
    private const string FreePlanCode = "free";

    private static readonly SubscriptionPlan FreePlanFallback = new()
    {
        PlanCode = FreePlanCode,
        DisplayName = "EatFitAI Free",
        IsPremium = false,
        FeaturesJson = """{"basicLogging":true,"aiScan":true,"mochiCoach":true}""",
        LimitsJson = """{"aiScansPerDay":-1,"aiFeatureUsesPerDay":20,"recipeSuggestionsPerDay":20}""",
        IsActive = true,
        SortOrder = 0,
    };

    private readonly ApplicationDbContext _context;

    public EntitlementService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SubscriptionStatusDto> GetSubscriptionStatusAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var entitlement = await _context.UserEntitlements
            .AsNoTracking()
            .Include(item => item.Plan)
            .Where(item => item.UserId == userId
                && item.StartsAt <= now
                && (item.ExpiresAt == null || item.ExpiresAt > now)
                && (item.Status == "active" || item.Status == "trialing"))
            .OrderByDescending(item => item.Plan.IsPremium)
            .ThenByDescending(item => item.StartsAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (entitlement is not null)
        {
            return BuildStatus(entitlement.Plan, entitlement.Status, entitlement.ExpiresAt);
        }

        var freePlan = await _context.SubscriptionPlans
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.PlanCode == FreePlanCode && item.IsActive, cancellationToken)
            ?? FreePlanFallback;

        return BuildStatus(freePlan, "active", null);
    }

    private static SubscriptionStatusDto BuildStatus(
        SubscriptionPlan plan,
        string status,
        DateTime? expiresAt)
    {
        return new SubscriptionStatusDto
        {
            PlanCode = plan.PlanCode,
            Status = status,
            IsPremium = plan.IsPremium,
            Features = ParseBoolMap(plan.FeaturesJson),
            Limits = ParseIntMap(plan.LimitsJson),
            ExpiresAt = expiresAt,
        };
    }

    private static Dictionary<string, bool> ParseBoolMap(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, bool>();
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, bool>>(json) ?? new Dictionary<string, bool>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, bool>();
        }
    }

    private static Dictionary<string, int> ParseIntMap(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, int>();
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new Dictionary<string, int>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, int>();
        }
    }
}
