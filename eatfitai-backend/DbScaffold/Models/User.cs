using System;
using System.Collections.Generic;

namespace EatFitAI.API.DbScaffold.Models;

public partial class User
{
    public Guid UserId { get; set; }

    public string Email { get; set; } = null!;

    public string? PasswordHash { get; set; }

    public string? DisplayName { get; set; }

    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; }

    // Email verification - Mã xác minh 6 số
    public bool EmailVerified { get; set; } = false;
    public string? VerificationCode { get; set; }
    public DateTime? VerificationCodeExpiry { get; set; }
    
    // Onboarding status - đã hoàn thành setup profile chưa
    public bool OnboardingCompleted { get; set; } = false;

    // Platform role source of truth for admin authority
    public string? Role { get; set; } = "user";

    // Refresh Token for Long-lived Sessions
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    // Profile fields for AI nutrition calculation
    public string? Gender { get; set; } // 'male' or 'female'
    public DateOnly? DateOfBirth { get; set; }
    public int? ActivityLevelId { get; set; }
    public string? Goal { get; set; } // 'lose', 'maintain', 'gain'

    // Navigation property for ActivityLevel
    public virtual ActivityLevel? ActivityLevel { get; set; }

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
}
