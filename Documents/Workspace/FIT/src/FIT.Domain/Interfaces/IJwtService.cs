using System.Security.Claims;
using FIT.Domain.Entities;

namespace FIT.Domain.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
    ClaimsPrincipal? ValidateToken(string token);
}
