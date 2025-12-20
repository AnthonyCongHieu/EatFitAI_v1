using System;
using System.Collections.Generic;

namespace EatFitAI.API.Models;

public partial class User
{
    public Guid UserId { get; set; }

    public string Email { get; set; } = null!;

    public string? PasswordHash { get; set; }

    public string? DisplayName { get; set; }

    // Avatar URL - lưu ID của preset avatar hoặc URL từ storage
    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    // Email verification - MÃ XÁC MINH 6 SỐ
    public bool EmailVerified { get; set; } = false;
    public string? VerificationCode { get; set; }
    public DateTime? VerificationCodeExpiry { get; set; }
    
    // Onboarding status - đã hoàn thành setup profile chưa
    public bool OnboardingCompleted { get; set; } = false;

    // Profile 2026 - Gamification & Goal Tracking
    // Cân nặng mục tiêu (kg)
    public decimal? TargetWeightKg { get; set; }
    
    // Streak tracking - chuỗi ngày liên tiếp ghi nhật ký
    public int CurrentStreak { get; set; } = 0;
    public int LongestStreak { get; set; } = 0;
    public DateTime? LastLogDate { get; set; }  // Ngày cuối cùng ghi nhật ký

    public virtual ICollection<AILog> AILogs { get; set; } = new List<AILog>();

    public virtual ICollection<BodyMetric> BodyMetrics { get; set; } = new List<BodyMetric>();

    public virtual ICollection<MealDiary> MealDiaries { get; set; } = new List<MealDiary>();

    public virtual ICollection<NutritionTarget> NutritionTargets { get; set; } = new List<NutritionTarget>();

    public virtual ICollection<UserDish> UserDishes { get; set; } = new List<UserDish>();

    public virtual ICollection<UserFavoriteFood> UserFavoriteFoods { get; set; } = new List<UserFavoriteFood>();

    public virtual ICollection<UserFoodItem> UserFoodItems { get; set; } = new List<UserFoodItem>();

    public virtual ICollection<UserRecentFood> UserRecentFoods { get; set; } = new List<UserRecentFood>();
    public virtual UserPreference? UserPreference { get; set; }
}
