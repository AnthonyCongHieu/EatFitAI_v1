using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using EatFitAI.API.Options;

namespace EatFitAI.API.HealthChecks
{
    public class SupabaseHealthCheck : IHealthCheck
    {
        private readonly SupabaseOptions _options;

        public SupabaseHealthCheck(IOptions<SupabaseOptions> options)
        {
            _options = options.Value;
        }

        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            // Thay vì gọi HTTP, chúng ta chỉ kiểm tra xem cấu hình (Url và Key) đã được thiết lập chưa
            if (string.IsNullOrWhiteSpace(_options.Url) || string.IsNullOrWhiteSpace(_options.ServiceRoleKey))
            {
                return Task.FromResult(HealthCheckResult.Unhealthy("Supabase configuration is missing (Url or ServiceRoleKey)."));
            }

            return Task.FromResult(HealthCheckResult.Healthy("Supabase is configured correctly."));
        }
    }
}
