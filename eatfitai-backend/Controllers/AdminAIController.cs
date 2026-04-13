using System;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
using EatFitAI.API.DTOs.Admin;
using EatFitAI.API.DTOs.AdminAi;
using EatFitAI.API.DTOs.Common;
using EatFitAI.API.Models;
using EatFitAI.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers;

[Route("api/admin-ai")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AdminAIController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly IAdminRealtimeEventBus _eventBus;
    private readonly IAdminAuditService _auditService;
    private readonly IGeminiRuntimeProjectService _runtimeProjectService;

    public AdminAIController(
        ApplicationDbContext context,
        IEncryptionService encryptionService,
        IAdminRealtimeEventBus eventBus,
        IAdminAuditService auditService,
        IGeminiRuntimeProjectService runtimeProjectService)
    {
        _context = context;
        _encryptionService = encryptionService;
        _eventBus = eventBus;
        _auditService = auditService;
        _runtimeProjectService = runtimeProjectService;
    }

    [HttpGet("keys")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetAllKeys()
    {
        var runtimeProjects = await _runtimeProjectService.GetRuntimeProjectsAsync(HttpContext.RequestAborted);
        var runtimeByProjectId = runtimeProjects.ToDictionary(project => project.RuntimeProjectId, project => project, StringComparer.OrdinalIgnoreCase);

        var keys = await _context.GeminiKeys
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();

        var result = keys.Select(k =>
        {
            var runtimeProjectId = ResolveRuntimeProjectIdForDto(k);
            var runtimeProject = runtimeByProjectId.GetValueOrDefault(runtimeProjectId);
            // Cố gắng giải mã để hiển thị Masked Key
            string maskedKey = "N/A";
            try
            {
                var originalKey = _encryptionService.Decrypt(k.EncryptedApiKey);
                if (!string.IsNullOrEmpty(originalKey) && originalKey.Length > 8)
                {
                    maskedKey = originalKey.Substring(0, 4) + new string('*', originalKey.Length - 8) + originalKey.Substring(originalKey.Length - 4);
                }
                else if (!string.IsNullOrEmpty(originalKey))
                {
                    maskedKey = "***";
                }
            }
            catch
            {
                maskedKey = "Error Decrypting";
            }

            return new GeminiKeyDto
            {
                Id = k.Id,
                KeyName = k.KeyName,
                MaskedApiKey = maskedKey,
                DailyRequestsUsed = k.DailyRequestsUsed,
                TotalRequestsUsed = k.TotalRequestsUsed,
                LastUsedAt = k.LastUsedAt,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                Tier = k.Tier,
                Model = k.Model,
                DailyQuotaLimit = k.DailyQuotaLimit,
                ProjectId = k.ProjectId,
                Notes = k.Notes,
                RuntimeProjectId = runtimeProjectId,
                CredentialRole = runtimeProject?.ManualRole ?? "warm_spare",
                LastProbeStatus = runtimeProject?.LastProviderStatus,
                LastProbeAt = runtimeProject?.LastSuccessAt
            };
        });

        return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách Gemini Keys thành công."));
    }

    private static string ResolveRuntimeProjectIdForDto(Models.GeminiKey key)
    {
        return string.IsNullOrWhiteSpace(key.ProjectId)
            ? $"key-{key.Id:N}"
            : key.ProjectId.Trim();
    }

    [HttpPost("keys")]
    [ProducesResponseType(typeof(ApiResponse<GeminiKeyDto>), 201)]
    public async Task<IActionResult> CreateKey([FromBody] CreateGeminiKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey))
        {
            await WriteAuditAsync("create", "gemini-key", "-", "failed", "API key was empty");
            return BadRequest(ApiResponse<object>.ErrorResponse("API Key không được để trống."));
        }

        var encryptedKey = _encryptionService.Encrypt(request.ApiKey.Trim());

        var newKey = new GeminiKey
        {
            Id = Guid.NewGuid(),
            KeyName = request.KeyName.Trim(),
            EncryptedApiKey = encryptedKey,
            IsActive = request.IsActive,
            DailyRequestsUsed = 0,
            TotalRequestsUsed = 0,
            CreatedAt = DateTime.UtcNow,
            Tier = request.Tier,
            Model = request.Model,
            DailyQuotaLimit = request.DailyQuotaLimit,
            ProjectId = request.ProjectId,
            Notes = request.Notes
        };

        _context.GeminiKeys.Add(newKey);
        await _context.SaveChangesAsync();
        await WriteAuditAsync("create", "gemini-key", newKey.Id.ToString(), "success", $"KeyName={newKey.KeyName}");
        PublishKeyUpdated(newKey.Id, new { newKey.Id, newKey.KeyName, newKey.ProjectId, Mutation = "created" });

        return Created("", ApiResponse<object>.SuccessResponse(new { Id = newKey.Id }, "Thêm Gemini Key mới thành công."));
    }

    // Bulk import nhiều keys cùng lúc
    [HttpPost("keys/bulk")]
    [ProducesResponseType(typeof(ApiResponse<object>), 201)]
    public async Task<IActionResult> BulkCreateKeys([FromBody] BulkCreateGeminiKeysRequest request)
    {
        if (request.Keys == null || request.Keys.Count == 0)
        {
            await WriteAuditAsync("bulk-create", "gemini-key", "-", "failed", "Key list was empty");
            return BadRequest(ApiResponse<object>.ErrorResponse("Danh sách keys không được trống."));
        }

        var created = new List<Guid>();
        var errors = new List<string>();

        foreach (var keyReq in request.Keys)
        {
            if (string.IsNullOrWhiteSpace(keyReq.ApiKey))
            {
                errors.Add($"Key '{keyReq.KeyName}' bị bỏ qua — API Key trống.");
                continue;
            }

            var newKey = new GeminiKey
            {
                Id = Guid.NewGuid(),
                KeyName = keyReq.KeyName.Trim(),
                EncryptedApiKey = _encryptionService.Encrypt(keyReq.ApiKey.Trim()),
                IsActive = keyReq.IsActive,
                DailyRequestsUsed = 0,
                TotalRequestsUsed = 0,
                CreatedAt = DateTime.UtcNow,
                Tier = keyReq.Tier,
                Model = keyReq.Model,
                DailyQuotaLimit = keyReq.DailyQuotaLimit,
                ProjectId = keyReq.ProjectId,
                Notes = keyReq.Notes
            };

            _context.GeminiKeys.Add(newKey);
            created.Add(newKey.Id);
        }

        await _context.SaveChangesAsync();
        await WriteAuditAsync("bulk-create", "gemini-key", string.Join(",", created), "success", $"Created={created.Count};Errors={errors.Count}");
        foreach (var keyId in created)
        {
            PublishKeyUpdated(keyId, new { Id = keyId, Mutation = "bulk-created" });
        }

        return Created("", ApiResponse<object>.SuccessResponse(
            new { Created = created.Count, Ids = created, Errors = errors },
            $"Đã thêm {created.Count}/{request.Keys.Count} keys."
        ));
    }

    [HttpPut("keys/{id}")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> UpdateKey(Guid id, [FromBody] UpdateGeminiKeyRequest request)
    {
        var key = await _context.GeminiKeys.FindAsync(id);
        if (key == null)
        {
            await WriteAuditAsync("update", "gemini-key", id.ToString(), "failed", "Gemini key not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        if (request.KeyName != null) key.KeyName = request.KeyName.Trim();
        if (request.IsActive.HasValue) key.IsActive = request.IsActive.Value;
        if (request.Tier != null) key.Tier = request.Tier;
        if (request.Model != null) key.Model = request.Model;
        if (request.DailyQuotaLimit.HasValue) key.DailyQuotaLimit = request.DailyQuotaLimit.Value;
        if (request.ProjectId != null) key.ProjectId = request.ProjectId;
        if (request.Notes != null) key.Notes = request.Notes;

        await _context.SaveChangesAsync();
        await WriteAuditAsync("update", "gemini-key", key.Id.ToString(), "success", $"KeyName={key.KeyName};IsActive={key.IsActive}");
        PublishKeyUpdated(key.Id, new { key.Id, key.KeyName, key.ProjectId, Mutation = "updated" });
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = key.Id }, "Cập nhật Gemini Key thành công."));
    }

    // Toggle active/inactive nhanh
    [HttpPost("keys/{id}/toggle")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> ToggleKey(Guid id)
    {
        var key = await _context.GeminiKeys.FindAsync(id);
        if (key == null)
        {
            await WriteAuditAsync("toggle", "gemini-key", id.ToString(), "failed", "Gemini key not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        key.IsActive = !key.IsActive;
        await _context.SaveChangesAsync();
        await WriteAuditAsync("toggle", "gemini-key", key.Id.ToString(), "success", $"IsActive={key.IsActive}");
        PublishKeyUpdated(key.Id, new { key.Id, key.IsActive, Mutation = "toggled" });
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = key.Id, IsActive = key.IsActive }, 
            key.IsActive ? "Đã kích hoạt Key." : "Đã vô hiệu hóa Key."));
    }

    // Test key connectivity — gửi request nhỏ tới Gemini API — with rich status
    [HttpPost("keys/{id}/test")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> TestKey(Guid id)
    {
        var key = await _context.GeminiKeys.FindAsync(id);
        if (key == null)
        {
            await WriteAuditAsync("test", "gemini-key", id.ToString(), "failed", "Gemini key not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        var result = await TestSingleKey(key);
        await WriteAuditAsync("test", "gemini-key", key.Id.ToString(), result.Status == "Active" ? "success" : "failed", $"{result.Status}:{result.StatusCode}");
        return Ok(ApiResponse<object>.SuccessResponse(result, result.Message));
    }

    // Test ALL keys at once
    [HttpPost("keys/test-all")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> TestAllKeys()
    {
        var keys = await _context.GeminiKeys.ToListAsync();
        var results = new List<object>();

        foreach (var key in keys)
        {
            var result = await TestSingleKey(key);
            results.Add(new { key.Id, key.KeyName, result.Status, result.StatusCode, result.Message });
        }

        var active = results.Count(r => ((dynamic)r).Status == "Active");
        var rateLimited = results.Count(r => ((dynamic)r).Status == "RateLimited");
        await WriteAuditAsync("test-all", "gemini-key", "all", "success", $"Total={keys.Count};Active={active};RateLimited={rateLimited}");

        return Ok(ApiResponse<object>.SuccessResponse(
            new { Results = results, Summary = new { Total = keys.Count, Active = active, RateLimited = rateLimited, Dead = keys.Count - active - rateLimited } },
            $"Đã test {keys.Count} keys: {active} active, {rateLimited} rate-limited."));
    }

    [HttpGet("runtime-projects")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetRuntimeProjects()
    {
        var projects = await _runtimeProjectService.GetRuntimeProjectsAsync(HttpContext.RequestAborted);
        return Ok(ApiResponse<object>.SuccessResponse(projects, "Runtime projects ready."));
    }

    [HttpGet("runtime-projects/metrics")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetRuntimeMetrics()
    {
        var metrics = await _runtimeProjectService.GetMetricsAsync(HttpContext.RequestAborted);
        return Ok(ApiResponse<object>.SuccessResponse(metrics, "Runtime metrics ready."));
    }

    [HttpGet("runtime-projects/telemetry")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetRuntimeTelemetry()
    {
        var rows = await _runtimeProjectService.GetTelemetryAsync(HttpContext.RequestAborted);
        return Ok(ApiResponse<object>.SuccessResponse(rows, "Runtime telemetry ready."));
    }

    [HttpGet("runtime-projects/{runtimeProjectId}")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetRuntimeProject(string runtimeProjectId)
    {
        var project = await _runtimeProjectService.GetRuntimeProjectAsync(runtimeProjectId, HttpContext.RequestAborted);
        if (project == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy runtime project."));
        }

        return Ok(ApiResponse<object>.SuccessResponse(project, "Runtime project ready."));
    }

    [HttpPost("runtime-projects/import")]
    [ProducesResponseType(typeof(ApiResponse<object>), 201)]
    public async Task<IActionResult> ImportRuntimeProject([FromBody] RuntimeProjectImportRequest request)
    {
        var keyId = await _runtimeProjectService.ImportProjectAsync(request, HttpContext.RequestAborted);
        await WriteAuditAsync("import", "gemini-runtime-project", keyId.ToString(), "success", $"ProjectId={request.ProjectId}");
        return Created("", ApiResponse<object>.SuccessResponse(new { Id = keyId }, "Imported runtime project."));
    }

    [HttpPost("runtime-projects/{runtimeProjectId}/probe")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> ProbeRuntimeProject(string runtimeProjectId)
    {
        var result = await _runtimeProjectService.ProbeProjectAsync(runtimeProjectId, HttpContext.RequestAborted);
        await WriteAuditAsync("probe", "gemini-runtime-project", runtimeProjectId, result.Status == "Active" ? "success" : "failed", result.Status);
        return Ok(ApiResponse<object>.SuccessResponse(result, result.Message));
    }

    [HttpPost("runtime-projects/{runtimeProjectId}/toggle")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> ToggleRuntimeProject(string runtimeProjectId)
    {
        var project = await _runtimeProjectService.ToggleProjectAsync(runtimeProjectId, HttpContext.RequestAborted);
        if (project == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy runtime project."));
        }

        await WriteAuditAsync("toggle", "gemini-runtime-project", runtimeProjectId, "success", $"IsEnabled={project.IsEnabled}");
        return Ok(ApiResponse<object>.SuccessResponse(project, "Runtime project toggled."));
    }

    [HttpPost("runtime-projects/{runtimeProjectId}/set-role")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> SetRuntimeProjectRole(string runtimeProjectId, [FromBody] SetRuntimeProjectRoleRequest request)
    {
        var project = await _runtimeProjectService.SetRoleAsync(runtimeProjectId, request.ManualRole, HttpContext.RequestAborted);
        if (project == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy runtime project."));
        }

        await WriteAuditAsync("set-role", "gemini-runtime-project", runtimeProjectId, "success", $"ManualRole={project.ManualRole}");
        return Ok(ApiResponse<object>.SuccessResponse(project, "Runtime project role updated."));
    }

    [HttpPost("runtime-projects/simulate-request")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> SimulateRuntimeRequest([FromBody] SimulateRuntimeRequest request)
    {
        var row = await _runtimeProjectService.SimulateRequestAsync(request.ForcedStatusCode, request.TriggerSource, HttpContext.RequestAborted);
        await WriteAuditAsync("simulate-request", "gemini-runtime-project", row.RuntimeProjectId, "success", $"Status={row.ProviderStatusCode}");
        return Ok(ApiResponse<object>.SuccessResponse(row, "Runtime request simulated."));
    }

    private async Task<KeyTestResult> TestSingleKey(Models.GeminiKey key)
    {
        try
        {
            var apiKey = _encryptionService.Decrypt(key.EncryptedApiKey);
            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

            var response = await httpClient.GetAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}");

            var statusCode = (int)response.StatusCode;

            if (response.IsSuccessStatusCode)
                return new KeyTestResult { Status = "Active", StatusCode = statusCode, Message = "Key hoạt động bình thường." };

            if (statusCode == 429)
                return new KeyTestResult { Status = "RateLimited", StatusCode = statusCode, Message = "Key bị rate limit — vẫn sống nhưng hết quota." };

            if (statusCode == 403)
                return new KeyTestResult { Status = "Disabled", StatusCode = statusCode, Message = "Key bị vô hiệu hóa hoặc bị thu hồi." };

            if (statusCode == 400)
                return new KeyTestResult { Status = "Invalid", StatusCode = statusCode, Message = "Key sai format hoặc request lỗi." };

            var body = await response.Content.ReadAsStringAsync();
            return new KeyTestResult { Status = "Error", StatusCode = statusCode, Message = body.Length > 200 ? body.Substring(0, 200) : body };
        }
        catch (TaskCanceledException)
        {
            return new KeyTestResult { Status = "Timeout", StatusCode = 0, Message = "Request timeout — key hoặc network có vấn đề." };
        }
        catch (Exception ex)
        {
            return new KeyTestResult { Status = "Error", StatusCode = 0, Message = ex.Message };
        }
    }

    [HttpDelete("keys/{id}")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> DeleteKey(Guid id)
    {
        var key = await _context.GeminiKeys.FindAsync(id);
        if (key == null)
        {
            await WriteAuditAsync("delete", "gemini-key", id.ToString(), "failed", "Gemini key not found");
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        _context.GeminiKeys.Remove(key);
        await _context.SaveChangesAsync();
        await WriteAuditAsync("delete", "gemini-key", id.ToString(), "success", $"KeyName={key.KeyName}");
        PublishKeyUpdated(id, new { Id = id, Mutation = "deleted" });

        return Ok(ApiResponse<object>.SuccessResponse(null, "Xóa Gemini Key thành công."));
    }

    [HttpPost("keys/reset-quota")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> ResetAllQuotas()
    {
        // Reset manual
        var keys = await _context.GeminiKeys.ToListAsync();
        foreach (var key in keys)
        {
            key.DailyRequestsUsed = 0;
        }

        await _context.SaveChangesAsync();
        await WriteAuditAsync("reset-quota", "gemini-key", "all", "success", $"Count={keys.Count}");
        _eventBus.Publish("admin.resource.updated", "gemini-key", "all", new { Mutation = "quota-reset", Count = keys.Count });

        return Ok(ApiResponse<object>.SuccessResponse(null, $"Đã reset quota trong ngày cho {keys.Count} keys."));
    }

    private void PublishKeyUpdated(Guid keyId, object payload)
    {
        _eventBus.Publish("admin.resource.updated", "gemini-key", keyId.ToString(), payload);
    }

    private Task WriteAuditAsync(string action, string entity, string entityId, string outcome, string? detail = null)
    {
        return _auditService.WriteAsync(HttpContext, new AdminAuditWriteRequest
        {
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Outcome = outcome,
            Detail = detail
        });
    }
}

public class KeyTestResult
{
    public string Status { get; set; } = "Unknown";
    public int StatusCode { get; set; }
    public string Message { get; set; } = "";
}
