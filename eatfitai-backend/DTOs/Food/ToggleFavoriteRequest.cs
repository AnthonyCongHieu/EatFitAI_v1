using System.ComponentModel.DataAnnotations;

namespace EatFitAI.API.DTOs.Food
{
    public class ToggleFavoriteRequest
    {
        [Required]
        public int FoodItemId { get; set; }
    }
}
