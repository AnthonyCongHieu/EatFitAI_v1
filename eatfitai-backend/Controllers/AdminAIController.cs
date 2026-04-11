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
[Authorize(Roles = "Admin")]
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
                CreatedAt = k.CreatedAt
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
            CreatedAt = DateTime.UtcNow
        };

        _context.GeminiKeys.Add(newKey);
        await _context.SaveChangesAsync();

        return Created("", ApiResponse<object>.SuccessResponse(new { Id = newKey.Id }, "Thêm Gemini Key mới thành công."));
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

        key.KeyName = request.KeyName.Trim();
        key.IsActive = request.IsActive;

        // Nếu admin nhập password API key mới thì mã hóa và lưu. Còn null/empty thì giữ cũ.
        if (!string.IsNullOrWhiteSpace(request.ApiKey))
        {
             key.EncryptedApiKey = _encryptionService.Encrypt(request.ApiKey.Trim());
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(new { Id = key.Id }, "Cập nhật Gemini Key thành công."));
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
