using System.Collections.Generic;

namespace EatFitAI.API.DTOs.User
{
    public class UserPreferenceDto
    {
        public List<string>? DietaryRestrictions { get; set; }
        public List<string>? Allergies { get; set; }
        public int PreferredMealsPerDay { get; set; }
        public string? PreferredCuisine { get; set; }
    }
}
