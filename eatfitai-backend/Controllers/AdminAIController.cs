using System;
using System.Linq;
using System.Threading.Tasks;
using EatFitAI.API.Data;
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
// [Authorize(Roles = "Admin")] // Bỏ comment khi Supabase JWT Claims hoạt động đầy đủ
public class AdminAIController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly IGeminiPoolManager _geminiPoolManager;

    public AdminAIController(ApplicationDbContext context, IEncryptionService encryptionService, IGeminiPoolManager geminiPoolManager)
    {
        _context = context;
        _encryptionService = encryptionService;
        _geminiPoolManager = geminiPoolManager;
    }

    [HttpGet("keys")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetAllKeys()
    {
        var keys = await _context.GeminiKeys
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync();

        var result = keys.Select(k =>
        {
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
                Notes = k.Notes
            };
        });

        return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách Gemini Keys thành công."));
    }

    [HttpPost("keys")]
    [ProducesResponseType(typeof(ApiResponse<GeminiKeyDto>), 201)]
    public async Task<IActionResult> CreateKey([FromBody] CreateGeminiKeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ApiKey))
        {
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

        return Created("", ApiResponse<object>.SuccessResponse(new { Id = newKey.Id }, "Thêm Gemini Key mới thành công."));
    }

    // Bulk import nhiều keys cùng lúc
    [HttpPost("keys/bulk")]
    [ProducesResponseType(typeof(ApiResponse<object>), 201)]
    public async Task<IActionResult> BulkCreateKeys([FromBody] BulkCreateGeminiKeysRequest request)
    {
        if (request.Keys == null || request.Keys.Count == 0)
        {
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
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        key.IsActive = !key.IsActive;
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = key.Id, IsActive = key.IsActive }, 
            key.IsActive ? "Đã kích hoạt Key." : "Đã vô hiệu hóa Key."));
    }

    // Test key connectivity — gửi request nhỏ tới Gemini API
    [HttpPost("keys/{id}/test")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> TestKey(Guid id)
    {
        var key = await _context.GeminiKeys.FindAsync(id);
        if (key == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        try
        {
            var apiKey = _encryptionService.Decrypt(key.EncryptedApiKey);
            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            
            var response = await httpClient.GetAsync(
                $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}");

            if (response.IsSuccessStatusCode)
            {
                return Ok(ApiResponse<object>.SuccessResponse(
                    new { Status = "OK", StatusCode = (int)response.StatusCode },
                    "Key hoạt động bình thường."));
            }

            var body = await response.Content.ReadAsStringAsync();
            return Ok(ApiResponse<object>.SuccessResponse(
                new { Status = "Error", StatusCode = (int)response.StatusCode, Message = body },
                "Key không hoạt động."));
        }
        catch (Exception ex)
        {
            return Ok(ApiResponse<object>.SuccessResponse(
                new { Status = "Error", Message = ex.Message },
                "Lỗi khi test key."));
        }
    }

    [HttpDelete("keys/{id}")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> DeleteKey(Guid id)
    {
        var key = await _context.GeminiKeys.FindAsync(id);
        if (key == null)
        {
            return NotFound(ApiResponse<object>.ErrorResponse("Không tìm thấy Gemini Key."));
        }

        _context.GeminiKeys.Remove(key);
        await _context.SaveChangesAsync();

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

        return Ok(ApiResponse<object>.SuccessResponse(null, $"Đã reset quota trong ngày cho {keys.Count} keys."));
    }
}
