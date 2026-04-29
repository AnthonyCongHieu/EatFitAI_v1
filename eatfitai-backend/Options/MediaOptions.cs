namespace EatFitAI.API.Options
{
    public class MediaOptions
    {
        public string Provider { get; set; } = "r2";
        public string PublicBaseUrl { get; set; } = string.Empty;
    }

    public class R2Options
    {
        public string AccountId { get; set; } = string.Empty;
        public string Bucket { get; set; } = "eatfitai-media";
        public string AccessKeyId { get; set; } = string.Empty;
        public string SecretAccessKey { get; set; } = string.Empty;
    }

    public class MediaImageOptions
    {
        public long MaxUploadBytes { get; set; } = 8 * 1024 * 1024;
        public int ThumbMaxWidth { get; set; } = 320;
        public int MediumMaxWidth { get; set; } = 1080;
        public int ThumbMaxBytes { get; set; } = 100 * 1024;
        public int MediumMaxBytes { get; set; } = 350 * 1024;
        public int WebpQuality { get; set; } = 75;
    }
}
