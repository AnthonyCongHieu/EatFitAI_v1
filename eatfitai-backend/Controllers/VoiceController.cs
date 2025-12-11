/**
 * Voice Controller
 * API endpoints for Voice AI feature
 * Simplified version - chỉ hỗ trợ voice parsing, không execute
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EatFitAI.DTOs;
using EatFitAI.Services;
using System.Security.Claims;

namespace EatFitAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class VoiceController : ControllerBase
    {
        private readonly IVoiceProcessingService _voiceService;
        private readonly ILogger<VoiceController> _logger;

        public VoiceController(
            IVoiceProcessingService voiceService,
            ILogger<VoiceController> logger)
        {
            _voiceService = voiceService;
            _logger = logger;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
        }

        /// <summary>
        /// Process voice text and parse intent
        /// Phân tích văn bản giọng nói và trích xuất intent
        /// </summary>
        /// <remarks>
        /// Ví dụ input:
        /// - "ghi 2 cơm vào bữa trưa" → ADD_FOOD
        /// - "cân nặng 65 kg" → LOG_WEIGHT  
        /// - "hôm nay bao nhiêu calo" → ASK_CALORIES
        /// </remarks>
        [HttpPost("process")]
        public async Task<ActionResult<VoiceProcessResponse>> ProcessVoiceText([FromBody] VoiceProcessRequest request)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Unauthorized"
                });
            }

            try
            {
                if (string.IsNullOrWhiteSpace(request.Text))
                {
                    return BadRequest(new VoiceProcessResponse
                    {
                        Success = false,
                        Error = "Văn bản không được để trống"
                    });
                }

                _logger.LogInformation("Processing voice text for user {UserId}: {Text}", userId, request.Text);

                var command = await _voiceService.ParseCommandAsync(request.Text, request.Language);

                return Ok(new VoiceProcessResponse
                {
                    Success = command.Intent != VoiceIntent.UNKNOWN,
                    Command = command,
                    Error = command.Intent == VoiceIntent.UNKNOWN 
                        ? "Không hiểu lệnh. Hãy thử lại với cách nói khác." 
                        : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing voice text");
                return StatusCode(500, new VoiceProcessResponse
                {
                    Success = false,
                    Error = "Lỗi xử lý lệnh giọng nói"
                });
            }
        }

        /// <summary>
        /// Get supported voice commands
        /// Lấy danh sách các lệnh giọng nói được hỗ trợ
        /// </summary>
        [HttpGet("commands")]
        [AllowAnonymous]
        public ActionResult<object> GetSupportedCommands()
        {
            return Ok(new
            {
                supportedIntents = new[]
                {
                    new { intent = "ADD_FOOD", description = "Thêm món ăn", examples = new[] { "ghi 2 cơm vào bữa trưa", "thêm 1 phở vào bữa sáng" } },
                    new { intent = "LOG_WEIGHT", description = "Ghi cân nặng", examples = new[] { "cân nặng 65 kg", "cân 70 ký" } },
                    new { intent = "ASK_CALORIES", description = "Hỏi calories", examples = new[] { "hôm nay bao nhiêu calo", "tổng calories" } }
                },
                supportedLanguages = new[] { "vi" }
            });
        }

        // NOTE: Execute endpoint đã được disable tạm thời
        // Sẽ implement sau khi có proper MealDiary integration
    }
}
