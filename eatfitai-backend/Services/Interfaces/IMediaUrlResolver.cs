namespace EatFitAI.API.Services.Interfaces
{
    public interface IMediaUrlResolver
    {
        string? NormalizePublicUrl(string? url);
    }
}
