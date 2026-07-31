using System.Text.Json;
using System.Text.Json.Nodes;
using BCrypt.Net;
using FIT.Domain.Entities;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FIT.Infrastructure.Jira;

/// <summary>
/// User store backed by appsettings.json "Users" array.
/// Passwords are BCrypt hashes, or "PLAIN:{password}" for development convenience.
/// </summary>
public class JiraUserRepository : IUserRepository
{
    private readonly List<User> _users;
    private readonly ILogger<JiraUserRepository> _log;
    private readonly string _settingsPath;

    public JiraUserRepository(IConfiguration config, ILogger<JiraUserRepository> log)
    {
        _log   = log;
        _users = LoadUsers(config);
        // Locate appsettings.json relative to the content root
        var contentRoot = (config as IConfigurationRoot)?.Providers
            .OfType<Microsoft.Extensions.Configuration.Json.JsonConfigurationProvider>()
            .FirstOrDefault()?.Source.Path ?? "appsettings.json";
        _settingsPath = Path.IsPathRooted(contentRoot) ? contentRoot
            : Path.Combine(AppContext.BaseDirectory, "appsettings.json");
    }

    private static List<User> LoadUsers(IConfiguration config)
    {
        var result = new List<User>();
        var section = config.GetSection("Users");
        foreach (var item in section.GetChildren())
        {
            var id        = Guid.TryParse(item["Id"], out var g) ? g : Guid.NewGuid();
            var firstName = item["FirstName"] ?? string.Empty;
            var lastName  = item["LastName"]  ?? string.Empty;
            var email     = item["Email"]     ?? string.Empty;
            var hash      = item["PasswordHash"] ?? string.Empty;
            var roleStr   = item["Role"]      ?? "FieldEngineer";
            var dept      = item["Department"];
            var phone     = item["Phone"];
            var active    = bool.TryParse(item["IsActive"], out var a) ? a : true;

            if (!Enum.TryParse<UserRole>(roleStr, true, out var role))
                role = UserRole.FieldEngineer;

            var user = new User(firstName, lastName, email, hash, role);
            user.SetId(id);
            if (!active) user.Deactivate();
            if (dept != null || phone != null)
                user.UpdateProfile(firstName, lastName, phone, dept);
            result.Add(user);
        }
        return result;
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(_users.FirstOrDefault(u => u.Id == id));

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => Task.FromResult(_users.FirstOrDefault(u =>
            string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)));

    public Task<IEnumerable<User>> GetAllAsync(CancellationToken ct = default)
        => Task.FromResult<IEnumerable<User>>(_users.OrderBy(u => u.FirstName).ToList());

    public Task<IEnumerable<User>> GetByRoleAsync(UserRole role, CancellationToken ct = default)
        => Task.FromResult<IEnumerable<User>>(_users.Where(u => u.Role == role && u.IsActive).ToList());

    public Task<User> CreateAsync(User user, CancellationToken ct = default)
    {
        if (user.Id == Guid.Empty)
            user.SetId(Guid.NewGuid());

        _users.Add(user);
        PersistToSettings(user);
        return Task.FromResult(user);
    }

    public Task UpdateAsync(User user, CancellationToken ct = default)
    {
        var idx = _users.FindIndex(u => u.Id == user.Id);
        if (idx >= 0) _users[idx] = user;
        PersistAllToSettings();
        return Task.CompletedTask;
    }

    private void PersistToSettings(User user)
    {
        try
        {
            var json = File.ReadAllText(_settingsPath);
            var root = JsonNode.Parse(json)!.AsObject();
            var arr  = root["Users"]?.AsArray() ?? new JsonArray();

            var entry = new JsonObject
            {
                ["Id"]           = user.Id.ToString(),
                ["FirstName"]    = user.FirstName,
                ["LastName"]     = user.LastName,
                ["Email"]        = user.Email,
                ["PasswordHash"] = user.PasswordHash,
                ["Role"]         = user.Role.ToString(),
                ["IsActive"]     = user.IsActive.ToString().ToLower(),
            };
            arr.Add(entry);
            root["Users"] = arr;
            File.WriteAllText(_settingsPath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Could not persist new user to appsettings.json");
        }
    }

    private void PersistAllToSettings()
    {
        try
        {
            var json = File.ReadAllText(_settingsPath);
            var root = JsonNode.Parse(json)!.AsObject();
            var arr  = new JsonArray();
            foreach (var u in _users)
            {
                arr.Add(new JsonObject
                {
                    ["Id"]           = u.Id.ToString(),
                    ["FirstName"]    = u.FirstName,
                    ["LastName"]     = u.LastName,
                    ["Email"]        = u.Email,
                    ["PasswordHash"] = u.PasswordHash,
                    ["Role"]         = u.Role.ToString(),
                    ["IsActive"]     = u.IsActive.ToString().ToLower(),
                });
            }
            root["Users"] = arr;
            File.WriteAllText(_settingsPath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Could not persist users to appsettings.json");
        }
    }

    public Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(_users.Any(u => u.Id == id));
}
