using System;

namespace EatFitAI.API.Models
{
    /// <summary>
    /// Lưu trữ dietary preferences và restrictions của user
    /// </summary>
    public class UserPreference
    {
        public int UserPreferenceId { get; set; }
        
        public Guid UserId { get; set; }
        
        /// <summary>
        /// JSON array: ["vegetarian", "halal", "no-pork"]
        /// </summary>
        public string? DietaryRestrictions { get; set; }
        
        /// <summary>
        /// JSON array: ["seafood", "peanut", "dairy"]
        /// </summary>
        public string? Allergies { get; set; }
        
        /// <summary>
        /// Số bữa ăn mong muốn mỗi ngày (mặc định 3)
        /// </summary>
        public int PreferredMealsPerDay { get; set; } = 3;
        
        /// <summary>
        /// Ẩm thực ưa thích: "vietnamese", "western", "asian"
        /// </summary>
        public string? PreferredCuisine { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual User User { get; set; } = null!;
    }
}
