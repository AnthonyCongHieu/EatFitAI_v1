using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace EatFitAI.API.Services
{
    public class EmailService : IEmailService
    {
        private static readonly TimeSpan SmtpOperationTimeout = TimeSpan.FromSeconds(15);
        private readonly MailSettings _settings;
        private readonly IHostEnvironment _environment;

        public EmailService(IOptions<MailSettings> options, IHostEnvironment environment)
        {
            _settings = options.Value;
            _environment = environment;
        }

        public async Task SendResetCodeAsync(string email, string code, DateTime expiresAt)
        {
            Console.WriteLine(
                $"[EmailService] Attempting to send email to {email}. Config: Host='{_settings.Host}', User='{_settings.User}', Port={_settings.Port}, SSL={_settings.EnableSsl}"
            );

            if (string.IsNullOrWhiteSpace(_settings.Host) ||
                string.IsNullOrWhiteSpace(_settings.User) ||
                string.IsNullOrWhiteSpace(_settings.Password) ||
                string.IsNullOrWhiteSpace(_settings.FromEmail))
            {
                const string message = "[EmailService] SMTP settings missing (Host, User, Password, or FromEmail is empty).";
                if (_environment.IsProduction())
                {
                    Console.WriteLine(message + " Rejecting send in Production.");
                    throw new InvalidOperationException("SMTP is not configured.");
                }

                Console.WriteLine(message + " Skipping real send in Development.");
                return;
            }

            using var timeoutCts = new CancellationTokenSource(SmtpOperationTimeout);

            try
            {
                var cleanPassword = _settings.Password.Replace(" ", "");
                Console.WriteLine($"[EmailService] Password length: {cleanPassword.Length} characters");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_settings.FromDisplayName, _settings.FromEmail));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "EatFitAI - Mã đặt lại mật khẩu";
                message.Body = new TextPart("plain")
                {
                    Text = BuildResetBody(code, expiresAt),
                };

                using var client = new SmtpClient();

                Console.WriteLine("[EmailService] Connecting to SMTP server...");
                await client.ConnectAsync(
                    _settings.Host,
                    _settings.Port,
                    SecureSocketOptions.StartTls,
                    timeoutCts.Token
                );

                Console.WriteLine("[EmailService] Authenticating...");
                await client.AuthenticateAsync(_settings.User, cleanPassword, timeoutCts.Token);

                Console.WriteLine("[EmailService] Sending email...");
                await client.SendAsync(message, timeoutCts.Token);

                Console.WriteLine("[EmailService] Disconnecting...");
                await client.DisconnectAsync(true, timeoutCts.Token);

                Console.WriteLine($"[EmailService] Email sent successfully to {email}");
            }
            catch (OperationCanceledException ex) when (timeoutCts.IsCancellationRequested)
            {
                Console.WriteLine($"[EmailService] SMTP operation timed out after {SmtpOperationTimeout.TotalSeconds:0} seconds.");
                throw new TimeoutException(
                    $"SMTP operation timed out after {SmtpOperationTimeout.TotalSeconds:0} seconds.",
                    ex
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] FAILED to send email: {ex.GetType().Name}");
                Console.WriteLine($"[EmailService] Error message: {ex.Message}");
                Console.WriteLine($"[EmailService] Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[EmailService] Inner exception: {ex.InnerException.Message}");
                }

                throw;
            }
        }

        public async Task SendVerificationCodeAsync(string email, string code, DateTime expiresAt)
        {
            Console.WriteLine($"[EmailService] Sending verification code to {email}");

            if (string.IsNullOrWhiteSpace(_settings.Host) ||
                string.IsNullOrWhiteSpace(_settings.User) ||
                string.IsNullOrWhiteSpace(_settings.Password) ||
                string.IsNullOrWhiteSpace(_settings.FromEmail))
            {
                const string message = "[EmailService] SMTP settings missing.";
                if (_environment.IsProduction())
                {
                    Console.WriteLine(message + " Rejecting send in Production.");
                    throw new InvalidOperationException("SMTP is not configured.");
                }

                Console.WriteLine(message + " Skipping real send in Development.");
                return;
            }

            using var timeoutCts = new CancellationTokenSource(SmtpOperationTimeout);

            try
            {
                var cleanPassword = _settings.Password.Replace(" ", "");

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_settings.FromDisplayName, _settings.FromEmail));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "EatFitAI - Mã xác minh email";
                message.Body = new TextPart("plain")
                {
                    Text = BuildVerificationBody(code, expiresAt),
                };

                using var client = new SmtpClient();

                await client.ConnectAsync(
                    _settings.Host,
                    _settings.Port,
                    SecureSocketOptions.StartTls,
                    timeoutCts.Token
                );
                await client.AuthenticateAsync(_settings.User, cleanPassword, timeoutCts.Token);
                await client.SendAsync(message, timeoutCts.Token);
                await client.DisconnectAsync(true, timeoutCts.Token);

                Console.WriteLine($"[EmailService] Verification code sent to {email}");
            }
            catch (OperationCanceledException ex) when (timeoutCts.IsCancellationRequested)
            {
                Console.WriteLine(
                    $"[EmailService] SMTP verification send timed out after {SmtpOperationTimeout.TotalSeconds:0} seconds."
                );
                throw new TimeoutException(
                    $"SMTP verification send timed out after {SmtpOperationTimeout.TotalSeconds:0} seconds.",
                    ex
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EmailService] FAILED to send verification email: {ex.Message}");
                throw;
            }
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
                }
            );
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
                }
            );
        }
    }
}
