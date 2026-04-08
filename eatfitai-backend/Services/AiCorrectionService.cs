using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using EatFitAI.API.DTOs.AI;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public interface IAiCorrectionService
{
    Task<int> LogCorrectionAsync(Guid userId, AiCorrectionRequestDto request, CancellationToken cancellationToken = default);

    Task<int> LogTeachLabelCorrectionAsync(Guid userId, TeachLabelRequestDto request, CancellationToken cancellationToken = default);

    Task<AiCorrectionStatsDto> GetStatsAsync(Guid userId, CancellationToken cancellationToken = default);
}

public sealed class AiCorrectionService : IAiCorrectionService
{
    private readonly EatFitAIDbContext _db;

    public AiCorrectionService(EatFitAIDbContext db)
    {
        _db = db;
    }

    public Task<int> LogCorrectionAsync(
        Guid userId,
        AiCorrectionRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return PersistAsync(
            userId,
            request.Label,
            request.FoodItemId,
            request.DetectedConfidence,
            request.SelectedFoodName,
            request.Source,
            request.ClientTimestamp,
            cancellationToken);
    }

    public Task<int> LogTeachLabelCorrectionAsync(
        Guid userId,
        TeachLabelRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        return PersistAsync(
            userId,
            request.Label,
            request.FoodItemId,
            request.DetectedConfidence,
            request.SelectedFoodName,
            request.Source,
            request.ClientTimestamp,
            cancellationToken);
    }

    public async Task<AiCorrectionStatsDto> GetStatsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var todayStartUtc = DateTime.UtcNow.Date;
        var baseQuery = _db.AiCorrectionEvents
            .AsNoTracking()
            .Where(x => x.UserId == userId);

        var totalCorrections = await baseQuery.CountAsync(cancellationToken);
        var todayCorrections = await baseQuery.CountAsync(
            x => x.CreatedAt >= todayStartUtc,
            cancellationToken);

        var topSources = await baseQuery
            .Where(x => x.Source != null && x.Source != string.Empty)
            .GroupBy(x => x.Source!)
            .Select(g => new AiCorrectionBucketDto
            {
                Value = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Value)
            .Take(5)
            .ToListAsync(cancellationToken);

        var topCorrectedLabels = await baseQuery
            .GroupBy(x => x.Label)
            .Select(g => new AiCorrectionBucketDto
            {
                Value = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Value)
            .Take(10)
            .ToListAsync(cancellationToken);

        return new AiCorrectionStatsDto
        {
            TotalCorrections = totalCorrections,
            TodayCorrections = todayCorrections,
            TopSources = topSources,
            TopCorrectedLabels = topCorrectedLabels
        };
    }

    private async Task<int> PersistAsync(
        Guid userId,
        string label,
        int? foodItemId,
        double? detectedConfidence,
        string? selectedFoodName,
        string? source,
        DateTimeOffset? clientTimestamp,
        CancellationToken cancellationToken)
    {
        var normalizedLabel = NormalizeRequired(label, nameof(label));
        var normalizedSource = NormalizeOptional(source);
        var normalizedFoodName = NormalizeOptional(selectedFoodName);

        var entity = new AiCorrectionEvent
        {
            UserId = userId,
            Label = normalizedLabel,
            FoodItemId = foodItemId,
            DetectedConfidence = detectedConfidence.HasValue
                ? Convert.ToDecimal(detectedConfidence.Value)
                : null,
            SelectedFoodName = normalizedFoodName,
            Source = normalizedSource,
            ClientTimestamp = clientTimestamp?.UtcDateTime,
            CreatedAt = DateTime.UtcNow
        };

        await _db.AiCorrectionEvents.AddAsync(entity, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return entity.AiCorrectionEventId;
    }

    private static string NormalizeRequired(string value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Value is required.", paramName);
        }

        return value.Trim().ToLowerInvariant();
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
