using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace FIT.API.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly IConfiguration _config;

    public CustomersController(IConfiguration config) => _config = config;

    [HttpGet]
    public IActionResult GetAll()
    {
        // Customers are managed in Jira via the Site Location field.
        // Return a static list from configuration or a placeholder.
        var customers = _config.GetSection("Customers").GetChildren()
            .Select(c => new
            {
                Id   = Guid.TryParse(c["Id"], out var g) ? g : Guid.NewGuid(),
                Name = c["Name"] ?? string.Empty,
                State = c["State"] ?? string.Empty,
                City  = c["City"] ?? string.Empty
            })
            .ToList();

        return Ok(customers);
    }
}
