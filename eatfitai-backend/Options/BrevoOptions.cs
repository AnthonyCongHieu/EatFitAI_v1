namespace EatFitAI.API.Options
{
    public class BrevoOptions
    {
        public string BaseUrl { get; set; } = "https://api.brevo.com";
        public string ApiKey { get; set; } = string.Empty;
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = "EatFitAI";
    }
}
