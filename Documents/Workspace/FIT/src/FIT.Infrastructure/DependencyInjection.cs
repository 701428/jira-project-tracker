using FIT.Domain.Interfaces;
using FIT.Infrastructure.Jira;
using FIT.Infrastructure.Security;
using FIT.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FIT.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // JiraService — typed HttpClient (must be registered before repositories)
        services.AddHttpClient<IJiraService, JiraService>(client =>
        {
            var baseUrl = config["Jira:BaseUrl"] ?? "https://grampower.atlassian.net";
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromSeconds(30);
        });

        // Jira-backed repositories (Jira is the single source of truth — no PostgreSQL)
        services.AddScoped<IFieldIssueRepository, JiraFieldIssueRepository>();
        services.AddSingleton<IUserRepository,     JiraUserRepository>();
        services.AddScoped<IUnitOfWork,           JiraUnitOfWork>();

        // Services
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IStorageService,     StorageService>();
        services.AddScoped<IEmailService,       EmailService>();
        services.AddScoped<IJwtService,         JwtService>();

        return services;
    }
}
