using System.Security.Claims;
using EatFitAI.API.Data;
using EatFitAI.API.Helpers;
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
                    ? DateTimeHelper.ToVietnamDateOnly(date.Value)
                    : DateTimeHelper.GetVietnamToday();
                var targetMl = await GetDailyTargetMlAsync(userId);

                var record = await _db.WaterIntakes
                    .FirstOrDefaultAsync(w => w.UserId == userId && w.IntakeDate == targetDate);

                return Ok(new
                {
                    date = targetDate.ToString("yyyy-MM-dd"),
                    amountMl = record?.AmountMl ?? 0,
                    targetMl = record?.TargetMl > 0 ? record.TargetMl : targetMl,
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Lỗi khi lấy lượng nước", HttpContext));
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
                    : DateTimeHelper.GetVietnamToday();
                var targetMl = await GetDailyTargetMlAsync(userId);

                await _db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""WaterIntake"" (""UserId"", ""IntakeDate"", ""AmountMl"", ""TargetMl"", ""UpdatedAt"")
                    VALUES ({userId}, {targetDate}, 200, {targetMl}, NOW() AT TIME ZONE 'UTC')
                    ON CONFLICT (""UserId"", ""IntakeDate"")
                    DO UPDATE SET
                        ""AmountMl"" = ""WaterIntake"".""AmountMl"" + EXCLUDED.""AmountMl"",
                        ""TargetMl"" = COALESCE(""WaterIntake"".""TargetMl"", EXCLUDED.""TargetMl""),
                        ""UpdatedAt"" = NOW() AT TIME ZONE 'UTC'");

                var record = await _db.WaterIntakes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(w => w.UserId == userId && w.IntakeDate == targetDate);

                return Ok(new
                {
                    date = targetDate.ToString("yyyy-MM-dd"),
                    amountMl = record?.AmountMl ?? 0,
                    targetMl = record?.TargetMl > 0 ? record.TargetMl : targetMl,
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Lỗi khi thêm nước", HttpContext));
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
                    : DateTimeHelper.GetVietnamToday();
                var targetMl = await GetDailyTargetMlAsync(userId);

                var affectedRows = await _db.Database.ExecuteSqlInterpolatedAsync($@"
                    UPDATE ""WaterIntake""
                    SET ""AmountMl"" = GREATEST(""AmountMl"" - 200, 0),
                        ""UpdatedAt"" = NOW() AT TIME ZONE 'UTC'
                    WHERE ""UserId"" = {userId}
                      AND ""IntakeDate"" = {targetDate}");

                if (affectedRows == 0)
                {
                    // Nothing to subtract
                    return Ok(new
                    {
                        date = targetDate.ToString("yyyy-MM-dd"),
                        amountMl = 0,
                        targetMl,
                    });
                }

                var record = await _db.WaterIntakes
                    .AsNoTracking()
                    .FirstOrDefaultAsync(w => w.UserId == userId && w.IntakeDate == targetDate);

                return Ok(new
                {
                    date = targetDate.ToString("yyyy-MM-dd"),
                    amountMl = record?.AmountMl ?? 0,
                    targetMl = record?.TargetMl > 0 ? record.TargetMl : targetMl,
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Token không hợp lệ" });
            }
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Lỗi khi bớt nước", HttpContext));
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
            catch (Exception)
            {
                return StatusCode(500, ErrorResponseHelper.SafeError("Lỗi khi lấy dữ liệu nước tháng", HttpContext));
            }
        }

        private async Task<int> GetDailyTargetMlAsync(Guid userId)
        {
            var weightKg = await _db.BodyMetrics
                .Where(metric => metric.UserId == userId && metric.WeightKg.HasValue && metric.WeightKg > 0)
                .OrderByDescending(metric => metric.MeasuredDate)
                .ThenByDescending(metric => metric.BodyMetricId)
                .Select(metric => metric.WeightKg)
                .FirstOrDefaultAsync();

            return weightKg.HasValue && weightKg.Value > 0
                ? (int)Math.Round(weightKg.Value * 30, MidpointRounding.AwayFromZero)
                : 2000;
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
