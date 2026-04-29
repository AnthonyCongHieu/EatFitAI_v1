using EatFitAI.API.DTOs.Telemetry;

namespace EatFitAI.API.Services.Interfaces;

public interface ITelemetryService
{
    Task<int> RecordEventsAsync(
        Guid? userId,
        IEnumerable<TelemetryEventRequestDto> events,
        string? requestId,
        CancellationToken cancellationToken = default);
}
