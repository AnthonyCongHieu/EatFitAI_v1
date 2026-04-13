using System.Collections.Concurrent;
using System.Threading.Channels;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Services.Interfaces;

namespace EatFitAI.API.Services;

public sealed class AdminRealtimeEventBus : IAdminRealtimeEventBus
{
    private readonly ConcurrentDictionary<Guid, Channel<AdminRuntimeEventDto>> _subscribers = new();
    private long _version;

    public long CurrentVersion => Interlocked.Read(ref _version);

    public AdminRuntimeEventDto Publish(string eventType, string entityType, string entityId, object payload)
    {
        var version = Interlocked.Increment(ref _version);
        var evt = new AdminRuntimeEventDto
        {
            EventId = $"{version}-{Guid.NewGuid():N}",
            EventType = eventType,
            EntityType = entityType,
            EntityId = entityId,
            OccurredAt = DateTime.UtcNow,
            Version = version,
            Payload = payload,
        };

        foreach (var subscriber in _subscribers.ToArray())
        {
            if (!subscriber.Value.Writer.TryWrite(evt))
            {
                _subscribers.TryRemove(subscriber.Key, out _);
            }
        }

        return evt;
    }

    public ChannelReader<AdminRuntimeEventDto> Subscribe(CancellationToken cancellationToken = default)
    {
        var channel = Channel.CreateUnbounded<AdminRuntimeEventDto>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });
        var subscriberId = Guid.NewGuid();
        _subscribers[subscriberId] = channel;

        cancellationToken.Register(() =>
        {
            if (_subscribers.TryRemove(subscriberId, out var subscriberChannel))
            {
                subscriberChannel.Writer.TryComplete();
            }
        });

        return channel.Reader;
    }
}
