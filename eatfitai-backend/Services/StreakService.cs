using EatFitAI.API.DbScaffold.Data;
using EatFitAI.API.DbScaffold.Models;
using Microsoft.EntityFrameworkCore;

namespace EatFitAI.API.Services
{
    /// <summary>
    /// StreakService - Quản lý streak (chuỗi ngày liên tiếp ghi nhật ký)
    /// Auto-update khi user log meal, reset khi bỏ ngày
    /// </summary>
    public interface IStreakService
    {
        /// <summary>
        /// Cập nhật streak cho user khi log meal
        /// </summary>
        Task UpdateStreakOnMealLogAsync(Guid userId);

        /// <summary>
        /// Lấy thông tin streak của user
        /// </summary>
        Task<(int CurrentStreak, int LongestStreak)> GetStreakAsync(Guid userId);
    }

    public class StreakService : IStreakService
    {
        private readonly EatFitAIDbContext _context;

        public StreakService(EatFitAIDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Cập nhật streak khi user log meal
        /// Logic:
        /// - Nếu LastLogDate = hôm nay: không làm gì (đã log hôm nay)
        /// - Nếu LastLogDate = hôm qua: tăng streak + 1
        /// - Nếu LastLogDate đã lâu hơn: reset streak về 1 (ngày đầu tiên streak mới)
        /// - Cập nhật LongestStreak nếu CurrentStreak lớn hơn
        /// </summary>
        public async Task UpdateStreakOnMealLogAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return;

            var today = DateTime.UtcNow.Date;
            var lastLog = user.LastLogDate?.Date;

            if (lastLog == today)
            {
                // Đã log hôm nay rồi, không cần update streak
                return;
            }

            if (lastLog == today.AddDays(-1))
            {
                // Log liên tiếp từ hôm qua -> tăng streak
                user.CurrentStreak += 1;
            }
            else
            {
                // Ngày đầu tiên hoặc đã bỏ ngày -> reset streak về 1
                user.CurrentStreak = 1;
            }

            // Cập nhật longest streak nếu cần
            if (user.CurrentStreak > user.LongestStreak)
            {
                user.LongestStreak = user.CurrentStreak;
            }

            // Cập nhật ngày log cuối cùng
            user.LastLogDate = today;

            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Lấy streak hiện tại của user
        /// Kiểm tra xem streak có còn valid không (nếu đã quá 1 ngày thì reset)
        /// </summary>
        public async Task<(int CurrentStreak, int LongestStreak)> GetStreakAsync(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return (0, 0);

            var today = DateTime.UtcNow.Date;
            var lastLog = user.LastLogDate?.Date;

            // Kiểm tra streak còn valid không
            // Streak valid nếu lastLog là hôm nay hoặc hôm qua
            int currentStreak = user.CurrentStreak;
            
            if (lastLog == null)
            {
                currentStreak = 0;
            }
            else if (lastLog < today.AddDays(-1))
            {
                // Đã bỏ quá 1 ngày, streak đã reset (nhưng không save vào DB cho đến khi log mới)
                currentStreak = 0;
            }

            return (currentStreak, user.LongestStreak);
        }
    }
}
