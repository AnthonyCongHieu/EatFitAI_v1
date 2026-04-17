using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Controllers
{
    [ApiController]
    [Route("api/water-intake")]
    [Authorize]
    public class WaterIntakeController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public WaterIntakeController(ApplicationDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Lấy lượng nước uống theo ngày
        /// GET /api/water-intake?date=2026-04-16
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetWaterIntake([FromQuery] DateTime? date)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var targetDate = date.HasValue
                    ? DateOnly.FromDateTime(date.Value)
                    : DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7)); // UTC+7 Hanoi

                var record = await _db.WaterIntakes
                    .FirstOrDefaultAsync(w => w.UserId == userId && w.IntakeDate == targetDate);

                return Ok(new
                {
                    date = targetDate.ToString("yyyy-MM-dd"),
                    amountMl = record?.AmountMl ?? 0,
                    targetMl = record?.TargetMl ?? 2000,
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy lượng nước", error = ex.Message });
            }
        }

        /// <summary>
        /// Thêm 200ml nước (upsert)
        /// POST /api/water-intake/add
        /// Body: { "date": "2026-04-16" } (optional, default = today)
        /// </summary>
        [HttpPost("add")]
        public async Task<ActionResult> AddWater([FromBody] WaterIntakeRequest? request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var targetDate = request?.Date != null
                    ? DateOnly.Parse(request.Date)
                    : DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

                var record = await _db.WaterIntakes
                    .FirstOrDefaultAsync(w => w.UserId == userId && w.IntakeDate == targetDate);

                if (record == null)
                {
                    record = new WaterIntake
                    {
                        UserId = userId,
                        IntakeDate = targetDate,
                        AmountMl = 200,
                        TargetMl = 2000,
                        UpdatedAt = DateTime.UtcNow,
                    };
                    _db.WaterIntakes.Add(record);
                }
                else
                {
                    record.AmountMl += 200;
                    record.UpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    date = targetDate.ToString("yyyy-MM-dd"),
                    amountMl = record.AmountMl,
                    targetMl = record.TargetMl,
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi thêm nước", error = ex.Message });
            }
        }

        /// <summary>
        /// Bớt 200ml nước (min 0)
        /// POST /api/water-intake/subtract
        /// Body: { "date": "2026-04-16" } (optional, default = today)
        /// </summary>
        [HttpPost("subtract")]
        public async Task<ActionResult> SubtractWater([FromBody] WaterIntakeRequest? request)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var targetDate = request?.Date != null
                    ? DateOnly.Parse(request.Date)
                    : DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

                var record = await _db.WaterIntakes
                    .FirstOrDefaultAsync(w => w.UserId == userId && w.IntakeDate == targetDate);

                if (record == null)
                {
                    // Nothing to subtract
                    return Ok(new
                    {
                        date = targetDate.ToString("yyyy-MM-dd"),
                        amountMl = 0,
                        targetMl = 2000,
                    });
                }

                record.AmountMl = Math.Max(0, record.AmountMl - 200);
                record.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                return Ok(new
                {
                    date = targetDate.ToString("yyyy-MM-dd"),
                    amountMl = record.AmountMl,
                    targetMl = record.TargetMl,
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi bớt nước", error = ex.Message });
            }
        }

        /// <summary>
        /// Lấy tổng hợp lượng nước uống theo tháng
        /// GET /api/water-intake/monthly?year=2026&month=4
        /// </summary>
        [HttpGet("monthly")]
        public async Task<ActionResult> GetMonthlyWaterIntake([FromQuery] int year, [FromQuery] int month)
        {
            try
            {
                var userId = GetUserIdFromToken();
                var startDate = new DateOnly(year, month, 1);
                var endDate = startDate.AddMonths(1).AddDays(-1);

                var records = await _db.WaterIntakes
                    .Where(w => w.UserId == userId && w.IntakeDate >= startDate && w.IntakeDate <= endDate)
                    .OrderBy(w => w.IntakeDate)
                    .ToListAsync();

                var daysWithData = records.Count;
                var totalMl = records.Sum(r => r.AmountMl);
                var averageMl = daysWithData > 0 ? totalMl / daysWithData : 0;

                return Ok(new
                {
                    year,
                    month,
                    totalMl,
                    averageMl,
                    daysWithData,
                    daily = records.Select(r => new
                    {
                        date = r.IntakeDate.ToString("yyyy-MM-dd"),
                        amountMl = r.AmountMl,
                        targetMl = r.TargetMl,
                    })
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi khi lấy dữ liệu nước tháng", error = ex.Message });
            }
        }

        private Guid GetUserIdFromToken()
        {
            var userIdClaim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value
                            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Token người dùng không hợp lệ");
            }

            return userId;
        }
    }

    public class WaterIntakeRequest
    {
        public string? Date { get; set; }
    }
}
