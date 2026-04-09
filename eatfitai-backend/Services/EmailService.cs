using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace EatFitAI.API.Services
{
    public class EmailService : IEmailService
    {
        private const string SendTransactionalEmailPath = "v3/smtp/email";
        private static readonly TimeSpan EmailRequestTimeout = TimeSpan.FromSeconds(15);
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        private readonly HttpClient _httpClient;
        private readonly BrevoOptions _options;
        private readonly IHostEnvironment _environment;

        public EmailService(
            HttpClient httpClient,
            IOptions<BrevoOptions> options,
            IHostEnvironment environment)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _environment = environment;

            if (Uri.TryCreate(_options.BaseUrl, UriKind.Absolute, out var baseUri))
            {
                _httpClient.BaseAddress = baseUri;
            }
        }

        public Task SendResetCodeAsync(string email, string code, DateTime expiresAt)
        {
            return SendTransactionalEmailAsync(
                recipientEmail: email,
                subject: "EatFitAI - Mã đặt lại mật khẩu",
                textContent: BuildResetBody(code, expiresAt),
                operationName: "reset code");
        }

        public Task SendVerificationCodeAsync(string email, string code, DateTime expiresAt)
        {
            return SendTransactionalEmailAsync(
                recipientEmail: email,
                subject: "EatFitAI - Mã xác minh email",
                textContent: BuildVerificationBody(code, expiresAt),
                operationName: "verification code");
        }

        private async Task SendTransactionalEmailAsync(
            string recipientEmail,
            string subject,
            string textContent,
            string operationName)
        {
            Console.WriteLine($"[EmailService] Sending {operationName} email to {recipientEmail} via Brevo.");

            if (!EnsureBrevoConfigured())
            {
                return;
            }

            using var timeoutCts = new CancellationTokenSource(EmailRequestTimeout);
            var payload = new BrevoSendEmailRequest
            {
                Sender = new BrevoAddress
                {
                    Email = _options.SenderEmail.Trim(),
                    Name = string.IsNullOrWhiteSpace(_options.SenderName) ? "EatFitAI" : _options.SenderName.Trim(),
                },
                To =
                [
                    new BrevoAddress
                    {
                        Email = recipientEmail,
                    }
                ],
                Subject = subject,
                TextContent = textContent,
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, SendTransactionalEmailPath);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.Add("api-key", _options.ApiKey.Trim());
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload, JsonOptions),
                Encoding.UTF8,
                "application/json");

            try
            {
                var stopwatch = Stopwatch.StartNew();
                using var response = await _httpClient.SendAsync(request, timeoutCts.Token);
                var responseBody = await response.Content.ReadAsStringAsync(timeoutCts.Token);
                stopwatch.Stop();

                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine(
                        $"[EmailService] Brevo send failed with status {(int)response.StatusCode}: {responseBody}");
                    throw new InvalidOperationException(
                        $"Brevo send failed with status {(int)response.StatusCode}.");
                }

                Console.WriteLine(
                    $"[EmailService] {operationName} email sent successfully to {recipientEmail} in {stopwatch.ElapsedMilliseconds} ms.");
            }
            catch (OperationCanceledException ex) when (timeoutCts.IsCancellationRequested)
            {
                Console.WriteLine(
                    $"[EmailService] Brevo {operationName} request timed out after {EmailRequestTimeout.TotalSeconds:0} seconds.");
                throw new TimeoutException(
                    $"Brevo {operationName} request timed out after {EmailRequestTimeout.TotalSeconds:0} seconds.",
                    ex);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] FAILED to send {operationName} email: {ex.Message}");
                throw;
            }
        }

        private bool EnsureBrevoConfigured()
        {
            if (!HasConfiguredValue(_options.ApiKey) || !HasConfiguredValue(_options.SenderEmail))
            {
                const string message = "[EmailService] Brevo settings missing (ApiKey or SenderEmail).";
                if (_environment.IsProduction())
                {
                    Console.WriteLine(message + " Rejecting send in Production.");
                    throw new InvalidOperationException("Brevo email is not configured.");
                }

                Console.WriteLine(message + " Skipping real send in Development.");
                return false;
            }

            return true;
        }

        private static bool HasConfiguredValue(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return !string.Equals(value, "SET_IN_USER_SECRETS", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "SET_IN_ENV_OR_SECRET_STORE", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "your-brevo-api-key", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "sender@example.com", StringComparison.OrdinalIgnoreCase);
        }

        private static string BuildResetBody(string code, DateTime expiresAt)
        {
            return string.Join(
                Environment.NewLine,
                new[]
                {
                    "Bạn vừa yêu cầu đặt lại mật khẩu EatFitAI.",
                    string.Empty,
                    $"Mã đặt lại của bạn: {code}",
                    $"Thời hạn: {expiresAt:yyyy-MM-dd HH:mm:ss} (UTC)",
                    string.Empty,
                    "Nếu bạn không yêu cầu, hãy bỏ qua email này.",
                });
        }

        private static string BuildVerificationBody(string code, DateTime expiresAt)
        {
            return string.Join(
                Environment.NewLine,
                new[]
                {
                    "Chào mừng bạn đến với EatFitAI!",
                    string.Empty,
                    $"Mã xác minh email của bạn: {code}",
                    $"Thời hạn: {expiresAt:yyyy-MM-dd HH:mm:ss} (UTC)",
                    string.Empty,
                    "Nhập mã này vào ứng dụng để hoàn tất đăng ký.",
                    string.Empty,
                    "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.",
                });
        }

        private sealed class BrevoSendEmailRequest
        {
            [JsonPropertyName("sender")]
            public BrevoAddress Sender { get; set; } = new();

            [JsonPropertyName("to")]
            public List<BrevoAddress> To { get; set; } = [];

            [JsonPropertyName("subject")]
            public string Subject { get; set; } = string.Empty;

            [JsonPropertyName("textContent")]
            public string TextContent { get; set; } = string.Empty;
        }

        private sealed class BrevoAddress
        {
            [JsonPropertyName("email")]
            public string Email { get; set; } = string.Empty;

            [JsonPropertyName("name")]
            public string? Name { get; set; }
        }
    }
}
