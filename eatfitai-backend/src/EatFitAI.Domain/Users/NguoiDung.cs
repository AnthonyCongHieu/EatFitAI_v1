using EatFitAI.Domain.Ai;
using EatFitAI.Domain.Auth;
using EatFitAI.Domain.Diary;
using EatFitAI.Domain.Foods;
using EatFitAI.Domain.Nutrition;
using Microsoft.AspNetCore.Identity;

namespace EatFitAI.Domain.Users;

public class NguoiDung : IdentityUser<Guid>
{
    public string? HoTen { get; set; }
    public string? GioiTinh { get; set; }
    public DateOnly? NgaySinh { get; set; }
    public DateTime NgayTao { get; set; }
    public DateTime NgayCapNhat { get; set; }

    public UserProfile? Profile { get; set; }
    public ICollection<BodyMetric> BodyMetrics { get; set; } = new List<BodyMetric>();
    public ICollection<NutritionTarget> NutritionTargets { get; set; } = new List<NutritionTarget>();
    public ICollection<CustomDish> CustomDishes { get; set; } = new List<CustomDish>();
    public ICollection<DiaryEntry> DiaryEntries { get; set; } = new List<DiaryEntry>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<AiRecipe> AiRecipes { get; set; } = new List<AiRecipe>();
}
