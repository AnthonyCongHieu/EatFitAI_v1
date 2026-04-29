using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.DTOs.AI
{
    public class DetectVisionRequest
    {
        public string? ImageUrl { get; set; }
        public string? ImageHash { get; set; }
    }
}

