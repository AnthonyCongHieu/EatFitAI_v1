using System.Threading.Channels;
using EatFitAI.API.DTOs.Admin;

namespace EatFitAI.API.Services.Interfaces;

public interface IAdminRealtimeEventBus
{
    long CurrentVersion { get; }
    AdminRuntimeEventDto Publish(string eventType, string entityType, string entityId, object payload);
    ChannelReader<AdminRuntimeEventDto> Subscribe(CancellationToken cancellationToken = default);
}
