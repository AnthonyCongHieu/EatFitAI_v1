using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using EatFitAI.API.Options;
using System.Net.Http.Headers;

namespace EatFitAI.API.HealthChecks
{
    public class SupabaseHealthCheck : IHealthCheck
    {
        private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(5);
        private readonly SupabaseOptions _options;
        private readonly IHttpClientFactory _httpClientFactory;

        public SupabaseHealthCheck(
            IOptions<SupabaseOptions> options,
            IHttpClientFactory httpClientFactory)
        {
            _options = options.Value;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            if (!TryGetSupabaseBaseUri(out var baseUri))
            {
                return HealthCheckResult.Unhealthy("Supabase configuration is missing or Url is not HTTPS.");
            }

            if (IsPlaceholderSecret(_options.ServiceRoleKey))
            {
                return HealthCheckResult.Unhealthy("Supabase service role key is missing or uses a placeholder value.");
            }

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(DefaultTimeout);

            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    new Uri(baseUri, "auth/v1/health"));
                request.Headers.TryAddWithoutValidation("apikey", _options.ServiceRoleKey.Trim());
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey.Trim());

                using var client = _httpClientFactory.CreateClient("supabase-health");
                using var response = await client.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    timeoutCts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    return HealthCheckResult.Unhealthy(
                        $"Supabase dependency health endpoint returned HTTP {(int)response.StatusCode}.");
                }

                return HealthCheckResult.Healthy("Supabase dependency health endpoint responded successfully.");
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                return HealthCheckResult.Unhealthy("Supabase dependency health check timed out.", ex);
            }
            catch (HttpRequestException ex)
            {
                return HealthCheckResult.Unhealthy("Supabase dependency health endpoint is unreachable.", ex);
            }
        }

        private bool TryGetSupabaseBaseUri(out Uri baseUri)
        {
            baseUri = null!;
            if (IsPlaceholderSecret(_options.Url)
                || !Uri.TryCreate(_options.Url.Trim().TrimEnd('/') + "/", UriKind.Absolute, out var parsedUri)
                || !string.Equals(parsedUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            baseUri = parsedUri;
            return true;
        }

        private static bool IsPlaceholderSecret(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return true;
            }

            return string.Equals(value, "default-secret-key", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "SET_IN_USER_SECRETS", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "SET_IN_ENV_OR_SECRET_STORE", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForProductionUse", StringComparison.OrdinalIgnoreCase)
                || string.Equals(value, "YourSuperSecretKeyHereThatIsAtLeast32CharactersLongForDevelopmentUse", StringComparison.OrdinalIgnoreCase);
        }
    }
}
