using System;
using System.Threading.Tasks;
using EatFitAI.API.DTOs.User;
using EatFitAI.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EatFitAI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/user/preferences")]
    public class UserPreferenceController : ControllerBase
    {
        private readonly IUserPreferenceService _prefService;

        public UserPreferenceController(IUserPreferenceService prefService)
        {
            _prefService = prefService;
        }

        private Guid GetUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdStr)) return Guid.Empty;
            return Guid.Parse(userIdStr);
        }

        [HttpGet]
        public async Task<IActionResult> GetPreferences()
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();

            var prefs = await _prefService.GetUserPreferenceAsync(userId);
            return Ok(prefs);
        }

        [HttpPost]
        public async Task<IActionResult> UpdatePreferences([FromBody] UserPreferenceDto dto)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty) return Unauthorized();

            await _prefService.UpdateUserPreferenceAsync(userId, dto);
            return Ok(new { message = "Preferences updated successfully" });
        }
    }
}
