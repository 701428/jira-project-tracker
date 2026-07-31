using FIT.Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace FIT.API.Filters;

/// <summary>
/// Shorthand attribute that accepts UserRole enum values instead of magic strings.
/// Usage: [AuthorizeRoles(UserRole.TeamLead, UserRole.Admin)]
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class AuthorizeRolesAttribute : AuthorizeAttribute
{
    public AuthorizeRolesAttribute(params UserRole[] roles)
        : base()
    {
        Roles = string.Join(",", roles.Select(r => r.ToString()));
    }
}
