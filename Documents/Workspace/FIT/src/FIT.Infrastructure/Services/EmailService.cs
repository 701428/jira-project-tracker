using FIT.Domain.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace FIT.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _log;

    public EmailService(IConfiguration config, ILogger<EmailService> log)
    {
        _config = config;
        _log = log;
    }

    public async Task SendAsync(string to, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(MailboxAddress.Parse(_config["Email:From"] ?? "noreply@fit.local"));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new TextPart(isHtml ? "html" : "plain") { Text = body };
            using var client = new SmtpClient();
            await client.ConnectAsync(_config["Email:SmtpHost"] ?? "localhost",
                int.TryParse(_config["Email:SmtpPort"], out var port) ? port : 587,
                SecureSocketOptions.StartTlsWhenAvailable, cancellationToken);
            var user = _config["Email:Username"];
            if (!string.IsNullOrEmpty(user))
                await client.AuthenticateAsync(user, _config["Email:Password"], cancellationToken);
            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(true, cancellationToken);
        }
        catch (Exception ex) { _log.LogWarning(ex, "Failed to send email to {To}", to); }
    }

    public async Task SendToMultipleAsync(IEnumerable<string> recipients, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default)
    {
        foreach (var r in recipients)
            await SendAsync(r, subject, body, isHtml, cancellationToken);
    }
}
