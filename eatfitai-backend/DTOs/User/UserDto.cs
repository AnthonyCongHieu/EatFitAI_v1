namespace EatFitAI.API.DTOs.User
{
    public class UserDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Profile fields for AI nutrition
        public string? Gender { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public int? Age => DateOfBirth.HasValue 
            ? (int)((DateTime.Today - DateOfBirth.Value.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25)
            : null;
        public int? ActivityLevelId { get; set; }
        public double? ActivityFactor { get; set; } // From ActivityLevel table
        public string? Goal { get; set; }
    }
}