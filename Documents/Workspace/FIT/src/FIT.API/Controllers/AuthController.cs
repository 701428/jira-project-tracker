using FIT.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FIT.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IJwtService _jwt;
    private readonly ICurrentUserService _currentUser;

    public AuthController(IUserRepository users, IJwtService jwt, ICurrentUserService currentUser)
    {
        _users = users;
        _jwt = jwt;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and password are required.");

        var user = await _users.GetByEmailAsync(req.Email, ct);
        if (user is null) return Unauthorized("Invalid credentials.");

        var passwordValid = user.PasswordHash.StartsWith("PLAIN:")
            ? req.Password == user.PasswordHash["PLAIN:".Length..]
            : BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash);
        if (!passwordValid)
            return Unauthorized("Invalid credentials.");

        if (!user.IsActive)
            return Unauthorized("Account is disabled.");

        var token = _jwt.GenerateToken(user);
        return Ok(new
        {
            token,
            expiresIn = 480 * 60,
            user = new { user.Id, user.Email, name = user.FullName, user.Role, user.IsActive, user.CreatedAt }
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct = default)
    {
        var userId = _currentUser.UserId;
        if (userId == Guid.Empty)
            return Unauthorized();

        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null) return NotFound();

        return Ok(new { user.Id, user.Email, FullName = user.FullName, user.Role, user.CreatedAt });
    }
}

public record LoginRequest(string Email, string Password);
