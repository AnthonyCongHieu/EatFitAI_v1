namespace EatFitAI.API.DTOs.AI
{
    public class DetectVisionRequest
    {
        public string? ObjectKey { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageHash { get; set; }
    }
}

