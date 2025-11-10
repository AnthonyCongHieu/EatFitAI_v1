using Microsoft.AspNetCore.Http;

namespace EatFitAI.API.DTOs.AI
{
    public class DetectVisionRequest
    {
        public IFormFile? File { get; set; }
    }
}

