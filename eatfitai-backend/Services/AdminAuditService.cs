using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.Models;
using EatFitAI.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services;

public class AdminAuditService : IAdminAuditService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminAuditService> _logger;

    public AdminAuditService(ApplicationDbContext context, ILogger<AdminAuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task EnsureTableAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            CREATE TABLE IF NOT EXISTS "AdminAuditEvent" (
                "AdminAuditEventId" uuid PRIMARY KEY,
                "Actor" varchar(256) NOT NULL,
                "Action" varchar(120) NOT NULL,
                "Entity" varchar(120) NOT NULL,
                "EntityId" varchar(120) NOT NULL,
                "Outcome" varchar(40) NOT NULL,
                "OccurredAt" timestamp with time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
                "RequestId" varchar(120) NULL,
                "Detail" text NULL
            );

            CREATE INDEX IF NOT EXISTS "IX_AdminAuditEvent_OccurredAt"
            ON "AdminAuditEvent" ("OccurredAt" DESC);

            CREATE INDEX IF NOT EXISTS "IX_AdminAuditEvent_Action_Entity"
            ON "AdminAuditEvent" ("Action", "Entity");

            CREATE INDEX IF NOT EXISTS "IX_AdminAuditEvent_RequestId"
            ON "AdminAuditEvent" ("RequestId");
            """;

        await _context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }

    public async Task WriteAsync(HttpContext httpContext, AdminAuditWriteRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var actor =
                httpContext.User.FindFirstValue(ClaimTypes.Email)
                ?? httpContext.User.FindFirstValue("email")
                ?? httpContext.User.Identity?.Name
                ?? "unknown";

            var entity = new AdminAuditEvent
            {
                AdminAuditEventId = Guid.NewGuid(),
                Actor = actor,
                Action = request.Action,
                Entity = request.Entity,
                EntityId = string.IsNullOrWhiteSpace(request.EntityId) ? "-" : request.EntityId,
                Outcome = string.IsNullOrWhiteSpace(request.Outcome) ? "unknown" : request.Outcome,
                OccurredAt = DateTime.UtcNow,
                RequestId = httpContext.TraceIdentifier,
                Detail = request.Detail
            };

            _context.AdminAuditEvents.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist admin audit event for {Action} {Entity}", request.Action, request.Entity);
        }
    }

    public async Task<AdminAuditFeedDto> QueryAsync(AdminAuditQuery query, CancellationToken cancellationToken = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 ? 20 : Math.Min(query.PageSize, 100);
        var source = _context.AdminAuditEvents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Actor))
        {
            var actor = query.Actor.Trim().ToLower();
            source = source.Where(item => item.Actor.ToLower().Contains(actor));
        }

        if (!string.IsNullOrWhiteSpace(query.Action))
        {
            var action = query.Action.Trim().ToLower();
            source = source.Where(item => item.Action.ToLower().Contains(action));
        }

        if (!string.IsNullOrWhiteSpace(query.Entity))
        {
            var entity = query.Entity.Trim().ToLower();
            source = source.Where(item => item.Entity.ToLower().Contains(entity));
        }

        if (!string.IsNullOrWhiteSpace(query.Outcome))
        {
            var outcome = query.Outcome.Trim().ToLower();
            source = source.Where(item => item.Outcome.ToLower() == outcome);
        }

        if (!string.IsNullOrWhiteSpace(query.RequestId))
        {
            var requestId = query.RequestId.Trim().ToLower();
            source = source.Where(item => item.RequestId != null && item.RequestId.ToLower().Contains(requestId));
        }

        if (query.From.HasValue)
        {
            source = source.Where(item => item.OccurredAt >= query.From.Value);
        }

        if (query.To.HasValue)
        {
            source = source.Where(item => item.OccurredAt <= query.To.Value);
        }

        var total = await source.CountAsync(cancellationToken);
        var items = await source
            .OrderByDescending(item => item.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new AdminAuditEventDto
            {
                Id = item.AdminAuditEventId,
                Actor = item.Actor,
                Action = item.Action,
                Entity = item.Entity,
                EntityId = item.EntityId,
                Outcome = item.Outcome,
                OccurredAt = item.OccurredAt,
                RequestId = item.RequestId,
                Detail = item.Detail
            })
            .ToListAsync(cancellationToken);

        return new AdminAuditFeedDto
        {
            Data = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }
}
