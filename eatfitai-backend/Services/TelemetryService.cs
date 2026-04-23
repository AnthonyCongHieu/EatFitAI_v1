using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Telemetry;
using EatFitAI.API.Models;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace EatFitAI.API.Services;

public sealed class TelemetryService : ITelemetryService
{
    private const int NameMaxLength = 120;
    private const int CategoryMaxLength = 60;
    private const int FieldMaxLength = 120;
    private const int StatusMaxLength = 60;

    private readonly ApplicationDbContext _context;
    private readonly ILogger<TelemetryService> _logger;

    public TelemetryService(
        ApplicationDbContext context,
        ILogger<TelemetryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<int> RecordEventsAsync(
        Guid? userId,
        IEnumerable<TelemetryEventRequestDto> events,
        string? requestId,
        CancellationToken cancellationToken = default)
    {
        var entities = events
            .Select(evt => BuildEntity(evt, userId, requestId))
            .Where(entity => entity is not null)
            .Cast<TelemetryEvent>()
            .ToArray();

        if (entities.Length == 0)
        {
            return 0;
        }

        await _context.TelemetryEvents.AddRangeAsync(entities, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return entities.Length;
    }

    private TelemetryEvent? BuildEntity(
        TelemetryEventRequestDto evt,
        Guid? userId,
        string? requestId)
    {
        var name = Limit(evt.Name, NameMaxLength);
        var category = Limit(evt.Category, CategoryMaxLength);
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(category))
        {
            _logger.LogDebug("Skipping telemetry event because required fields are missing.");
            return null;
        }

        return new TelemetryEvent
        {
            UserId = userId,
            Name = name,
            Category = category,
            OccurredAt = (evt.OccurredAt?.UtcDateTime ?? DateTime.UtcNow).ToUniversalTime(),
            Screen = Limit(evt.Screen, FieldMaxLength),
            Flow = Limit(evt.Flow, FieldMaxLength),
            Step = Limit(evt.Step, FieldMaxLength),
            Status = Limit(evt.Status, StatusMaxLength),
            SessionId = Limit(evt.SessionId, FieldMaxLength),
            MetadataJson = NormalizeMetadata(evt.Metadata),
            RequestId = Limit(requestId, FieldMaxLength),
            CreatedAt = DateTime.UtcNow,
        };
    }

    private static string? NormalizeMetadata(JsonElement? metadata)
    {
        if (!metadata.HasValue)
        {
            return null;
        }

        var value = metadata.Value;
        return value.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null
            ? null
            : value.GetRawText();
    }

    private static string? Limit(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }
}
