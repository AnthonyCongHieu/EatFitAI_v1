namespace EatFitAI.API.Options
{
    public class SupabaseOptions
    {
        public string Url { get; set; } = string.Empty;
        public string ServiceRoleKey { get; set; } = string.Empty;
        public string FoodImagesBucket { get; set; } = "food-images";
        public string UserFoodBucket { get; set; } = "user-food";
    }
}
