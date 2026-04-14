using System;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Security;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin/ai")]
[ApiController]
[Authorize(Policy = AdminPolicies.AuditRead)]
public class AdminAILogController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly IAdminAuditService _auditService;

    public AdminAILogController(
        ApplicationDbContext context,
        IAdminRealtimeEventBus eventBus,
        IAdminAuditService auditService)
    {
        _context = context;
        _eventBus = eventBus;
        _auditService = auditService;
    }

    // ===================== AI LOGS =====================
    [HttpGet("logs")]
    public async Task<IActionResult> GetAILogs(
        [FromQuery] string? search,
        [FromQuery] string? action,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.AILogs
            .Include(l => l.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l => l.Action.ToLower().Contains(action.ToLower()));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(l =>
                l.Action.ToLower().Contains(normalizedSearch)
                || (l.User != null && (
                    l.User.Email.ToLower().Contains(normalizedSearch)
                    || (l.User.DisplayName != null && l.User.DisplayName.ToLower().Contains(normalizedSearch))))
                || (l.InputData != null && l.InputData.ToLower().Contains(normalizedSearch))
                || (l.OutputData != null && l.OutputData.ToLower().Contains(normalizedSearch)));
        }

        var total = await query.CountAsync();
        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = logs.Select(l => new AdminAILogDto
        {
            AILogId = l.AILogId,
            UserId = l.UserId,
            UserName = l.User != null ? (string.IsNullOrEmpty(l.User.DisplayName) ? l.User.Email : l.User.DisplayName) : null,
            Action = l.Action,
            InputPreview = l.InputData != null ? (l.InputData.Length > 200 ? l.InputData.Substring(0, 200) + "..." : l.InputData) : null,
            OutputPreview = l.OutputData != null ? (l.OutputData.Length > 200 ? l.OutputData.Substring(0, 200) + "..." : l.OutputData) : null,
            DurationMs = null,
            CreatedAt = l.CreatedAt
        }).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(new { data = result, total, page, pageSize }, "Thành công"));
    }

    // ===================== CORRECTION EVENTS =====================
    [HttpGet("corrections")]
    public async Task<IActionResult> GetCorrections(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.AiCorrectionEvents
            .Include(c => c.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(c =>
                c.Label.ToLower().Contains(normalizedSearch)
                || (c.SelectedFoodName != null && c.SelectedFoodName.ToLower().Contains(normalizedSearch))
                || (c.Source != null && c.Source.ToLower().Contains(normalizedSearch))
                || (c.User != null && (
                    c.User.Email.ToLower().Contains(normalizedSearch)
                    || (c.User.DisplayName != null && c.User.DisplayName.ToLower().Contains(normalizedSearch)))));
        }

        var total = await query.CountAsync();
        var corrections = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = corrections.Select(c => new AdminCorrectionDto
        {
            AiCorrectionEventId = c.AiCorrectionEventId,
            UserId = c.UserId,
            UserName = c.User != null ? (string.IsNullOrEmpty(c.User.DisplayName) ? c.User.Email : c.User.DisplayName) : null,
            Label = c.Label,
            FoodItemId = c.FoodItemId,
            SelectedFoodName = c.SelectedFoodName,
            DetectedConfidence = c.DetectedConfidence,
            Source = c.Source,
            CreatedAt = c.CreatedAt
        }).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(new { data = result, total, page, pageSize }, "Thành công"));
    }

    // ===================== LABEL MAP =====================
    [HttpGet("label-map")]
    public async Task<IActionResult> GetLabelMap()
    {
        var labels = await _context.AiLabelMaps.ToListAsync();

        // Get food names for linked items
        var foodIds = labels.Where(l => l.FoodItemId.HasValue).Select(l => l.FoodItemId!.Value).Distinct().ToList();
        var foodNames = await _context.FoodItems
            .Where(f => foodIds.Contains(f.FoodItemId))
            .Select(f => new { f.FoodItemId, f.FoodName })
            .ToDictionaryAsync(f => f.FoodItemId, f => f.FoodName);

        var result = labels.Select(l => new AdminLabelMapDto
        {
            Label = l.Label,
            FoodItemId = l.FoodItemId,
            FoodName = l.FoodItemId.HasValue && foodNames.ContainsKey(l.FoodItemId.Value) ? foodNames[l.FoodItemId.Value] : null,
            MinConfidence = l.MinConfidence,
            CreatedAt = l.CreatedAt
        }).OrderBy(l => l.Label).ToList();

        return Ok(ApiResponse<object>.SuccessResponse(result, "Thành công"));
    }

    [HttpPut("label-map/{label}")]
    [Authorize(Policy = AdminPolicies.FoodsWrite)]
    public async Task<IActionResult> UpdateLabelMap(string label, [FromBody] UpdateLabelMapRequest request)
    {
        var map = await _context.AiLabelMaps.FirstOrDefaultAsync(l => l.Label == label);
        if (map == null) return NotFound(ApiResponse<object>.ErrorResponse("Label not found"));

        if (request.FoodItemId.HasValue) map.FoodItemId = request.FoodItemId;
        if (request.MinConfidence.HasValue) map.MinConfidence = request.MinConfidence.Value;

        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync(
            "update",
            "ai-label-map",
            label,
            "success",
            $"FoodItemId={map.FoodItemId};MinConfidence={map.MinConfidence}",
            severity: "high");
        _eventBus.Publish("admin.resource.updated", "ai-label-map", label, new { Label = label, Mutation = "updated" });
        return Ok(BuildMutationResponse(
            "Cập nhật label map thành công.",
            "high",
            auditRef,
            new { Label = label, map.FoodItemId, map.MinConfidence }));
    }

    [HttpDelete("label-map/{label}")]
    [Authorize(Policy = AdminPolicies.FoodsWrite)]
    public async Task<IActionResult> DeleteLabelMap(string label)
    {
        var map = await _context.AiLabelMaps.FirstOrDefaultAsync(l => l.Label == label);
        if (map == null) return NotFound(ApiResponse<object>.ErrorResponse("Label not found"));

        _context.AiLabelMaps.Remove(map);
        await _context.SaveChangesAsync();
        var auditRef = await WriteAuditAsync(
            "delete",
            "ai-label-map",
            label,
            "success",
            $"FoodItemId={map.FoodItemId}",
            severity: "critical");
        _eventBus.Publish("admin.resource.updated", "ai-label-map", label, new { Label = label, Mutation = "deleted" });
        return Ok(BuildMutationResponse(
            "Xóa label map thành công.",
            "critical",
            auditRef,
            new { Label = label, Deleted = true }));
    }

    // ===================== AI STATS =====================
    [HttpGet("stats")]
    public async Task<IActionResult> GetAIStats()
    {
        var totalRequests = await _context.AILogs.CountAsync();
        var totalCorrections = await _context.AiCorrectionEvents.CountAsync();
        var totalLabels = await _context.AiLabelMaps.CountAsync();

        // Accuracy rate: if no corrections, assume 100%
        double accuracyRate = totalRequests > 0
            ? Math.Round(100.0 * (1.0 - (double)totalCorrections / totalRequests), 1)
            : 100.0;
        if (accuracyRate < 0) accuracyRate = 0;

        // Top corrected labels
        var topLabels = await _context.AiCorrectionEvents
            .GroupBy(c => c.Label)
            .Select(g => new TopCorrectionDto { Label = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync();

        var stats = new AdminAIStatsDto
        {
            TotalAIRequests = totalRequests,
            TotalCorrections = totalCorrections,
            TotalLabels = totalLabels,
            AccuracyRate = accuracyRate,
            TopCorrectedLabels = topLabels
        };

        return Ok(ApiResponse<AdminAIStatsDto>.SuccessResponse(stats, "Thành công"));
    }

    private async Task<string?> WriteAuditAsync(
        string action,
        string entity,
        string entityId,
        string outcome,
        string? detail = null,
        string severity = "info")
    {
        var auditRef = Guid.NewGuid().ToString("N");
        await _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
        {
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Outcome = outcome,
            Severity = severity,
            DiffSummary = auditRef,
            Detail = detail
        });
        return auditRef;
    }

    private ApiResponse<AdminMutationResponseDto> BuildMutationResponse(
        string message,
        string severity,
        string? auditRef,
        object? data = null)
    {
        return ApiResponse<AdminMutationResponseDto>.SuccessResponse(
            new AdminMutationResponseDto
            {
                Status = "success",
                Severity = severity,
                RequestId = HttpContext.TraceIdentifier,
                AuditRef = auditRef,
                Data = data
            },
            message,
            requestId: HttpContext.TraceIdentifier,
            severity: severity,
            auditRef: auditRef);
    }
}

// Request DTOs for this controller
public class UpdateLabelMapRequest
{
    public int? FoodItemId { get; set; }
    public decimal? MinConfidence { get; set; }
}
