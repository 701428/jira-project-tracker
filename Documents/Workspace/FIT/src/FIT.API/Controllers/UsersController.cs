using FIT.Domain.Entities;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FIT.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    public UsersController(IUserRepository users) => _users = users;

    [HttpGet]
    [Authorize(Roles = "Admin,TeamLead")]
    public async Task<IActionResult> GetAll(CancellationToken ct = default)
    {
        var result = await _users.GetAllAsync(ct);
        return Ok(result.Select(MapUser));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        return Ok(MapUser(user));
    }

    [HttpGet("by-role/{role}")]
    public async Task<IActionResult> GetByRole(string role, CancellationToken ct = default)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var userRole))
            return BadRequest($"Invalid role: {role}");

        var result = await _users.GetByRoleAsync(userRole, ct);
        return Ok(result.Select(u => new { u.Id, u.Email, FullName = u.FullName, u.Role }));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and password are required.");

        var existing = await _users.GetByEmailAsync(req.Email, ct);
        if (existing is not null)
            return Conflict("A user with this email already exists.");

        if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
            return BadRequest($"Invalid role: {req.Role}");

        var hash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        var user = new User(req.FirstName.Trim(), req.LastName.Trim(), req.Email.Trim().ToLower(), hash, role);
        var created = await _users.CreateAsync(user, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapUser(created));
    }

    [HttpPut("{id:guid}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        user.Deactivate();
        await _users.UpdateAsync(user, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/activate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        user.Activate();
        await _users.UpdateAsync(user, ct);
        return NoContent();
    }

    private static object MapUser(User u) => new
    {
        u.Id, u.Email, u.FirstName, u.LastName, FullName = u.FullName,
        Role = u.Role.ToString(), RoleValue = (int)u.Role,
        u.IsActive, u.PhoneNumber, u.Department, u.CreatedAt, u.LastLoginAt,
    };
}

public record CreateUserRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string Role
);
