using EatFitAI.API.Options;
using EatFitAI.API.Services.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Diagnostics;

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

            if (!EnsureSmtpConfigured("[EmailService] SMTP settings missing (Host, User, Password, or FromEmail is empty)."))
            {
                return;
            }

            using var timeoutCts = new CancellationTokenSource(SmtpOperationTimeout);

            try
            {
                var cleanPassword = _settings.Password.Replace(" ", "");
                Console.WriteLine($"[EmailService] Password length: {cleanPassword.Length} characters");

                var message = CreateMessage(
                    email,
                    "EatFitAI - Mã đặt lại mật khẩu",
                    BuildResetBody(code, expiresAt));

                await SendSmtpMessageAsync(
                    message,
                    cleanPassword,
                    timeoutCts.Token,
                    successMessage: $"[EmailService] Email sent successfully to {email}");
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

            if (!EnsureSmtpConfigured("[EmailService] SMTP settings missing."))
            {
                return;
            }

            using var timeoutCts = new CancellationTokenSource(SmtpOperationTimeout);

            try
            {
                var cleanPassword = _settings.Password.Replace(" ", "");
                var message = CreateMessage(
                    email,
                    "EatFitAI - Mã xác minh email",
                    BuildVerificationBody(code, expiresAt));

                await SendSmtpMessageAsync(
                    message,
                    cleanPassword,
                    timeoutCts.Token,
                    successMessage: $"[EmailService] Verification code sent to {email}");
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

        private bool EnsureSmtpConfigured(string missingConfigMessage)
        {
            if (!HasConfiguredSmtpValue(_settings.Host) ||
                !HasConfiguredSmtpValue(_settings.User) ||
                !HasConfiguredSmtpValue(_settings.Password) ||
                !HasConfiguredSmtpValue(_settings.FromEmail))
            {
                if (_environment.IsProduction())
                {
                    Console.WriteLine(missingConfigMessage + " Rejecting send in Production.");
                    throw new InvalidOperationException("SMTP is not configured.");
                }

                Console.WriteLine(missingConfigMessage + " Skipping real send in Development.");
                return false;
            }

            return true;
        }

        private static bool HasConfiguredSmtpValue(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return !string.Equals(value, "SET_IN_USER_SECRETS", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "SET_IN_ENV_OR_SECRET_STORE", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "REPLACE_WITH_USER_SECRET", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "your-email@gmail.com", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "your-email@example.com", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "your-app-password", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(value, "your-app-password-or-smtp-password", StringComparison.OrdinalIgnoreCase);
        }

        private SecureSocketOptions GetSecureSocketOptions()
        {
            if (!_settings.EnableSsl)
            {
                return SecureSocketOptions.None;
            }

            return _settings.Port == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;
        }

        private MimeMessage CreateMessage(string email, string subject, string body)
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromDisplayName, _settings.FromEmail));
            message.To.Add(new MailboxAddress("", email));
            message.Subject = subject;
            message.Body = new TextPart("plain")
            {
                Text = body,
            };

            return message;
        }

        private async Task SendSmtpMessageAsync(
            MimeMessage message,
            string cleanPassword,
            CancellationToken cancellationToken,
            string successMessage)
        {
            var stopwatch = Stopwatch.StartNew();
            using var client = new SmtpClient
            {
                Timeout = (int)SmtpOperationTimeout.TotalMilliseconds,
            };

            Console.WriteLine("[EmailService] Connecting to SMTP server...");
            await client.ConnectAsync(
                _settings.Host,
                _settings.Port,
                GetSecureSocketOptions(),
                cancellationToken);

            Console.WriteLine("[EmailService] Authenticating...");
            await client.AuthenticateAsync(_settings.User, cleanPassword, cancellationToken);

            Console.WriteLine("[EmailService] Sending email...");
            await client.SendAsync(message, cancellationToken);

            Console.WriteLine("[EmailService] Disconnecting...");
            await client.DisconnectAsync(true, cancellationToken);
            stopwatch.Stop();

            Console.WriteLine($"{successMessage} in {stopwatch.ElapsedMilliseconds} ms");
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
