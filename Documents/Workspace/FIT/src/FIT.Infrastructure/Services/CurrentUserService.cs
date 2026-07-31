using System.Security.Claims;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using Microsoft.AspNetCore.Http;

namespace FIT.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _http;
    public CurrentUserService(IHttpContextAccessor http) => _http = http;

    private ClaimsPrincipal? Principal => _http.HttpContext?.User;

    public Guid UserId
    {
        get
        {
            var raw = Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? Principal?.FindFirstValue("sub");
            return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
        }
    }

    public string UserEmail => Principal?.FindFirstValue(ClaimTypes.Email)
                            ?? Principal?.FindFirstValue("email") ?? string.Empty;

    public string UserName => Principal?.FindFirstValue(ClaimTypes.Name)
                           ?? Principal?.FindFirstValue("name") ?? string.Empty;

    public UserRole Role
    {
        get
        {
            var raw = Principal?.FindFirstValue(ClaimTypes.Role)
                   ?? Principal?.FindFirstValue("role");
            return Enum.TryParse<UserRole>(raw, out var r) ? r : UserRole.FieldEngineer;
        }
    }

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
}
