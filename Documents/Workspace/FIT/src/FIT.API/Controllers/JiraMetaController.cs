using System.Text.Json;
using FIT.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace FIT.API.Controllers;

/// <summary>
/// Exposes Jira project metadata (field options, issue types, priorities) for form population.
/// </summary>
[ApiController]
[Route("api/jira")]
[Authorize]
public class JiraMetaController : ControllerBase
{
    private readonly IJiraService _jira;
    private readonly string _projectKey;

    public JiraMetaController(IJiraService jira, IConfiguration config)
    {
        _jira = jira;
        _projectKey = config["Jira:ProjectKey"] ?? "FIT";
    }

    /// <summary>
    /// Returns all non-subtask issue types for the FIT project.
    /// </summary>
    [HttpGet("issue-types")]
    public async Task<IActionResult> GetIssueTypes(CancellationToken ct = default)
    {
        var types = await _jira.GetIssueTypesAsync(_projectKey, ct);
        var result = types.Select(t => new
        {
            id   = GetStr(t, "id"),
            name = GetStr(t, "name"),
            iconUrl = GetStr(t, "iconUrl"),
        });
        return Ok(result);
    }

    /// <summary>
    /// Returns field options for a given issue type (defaults to Field Issue 11333).
    /// Response includes allowed values for each custom field.
    /// </summary>
    [HttpGet("field-options")]
    public async Task<IActionResult> GetFieldOptions([FromQuery] string issueTypeId = "11333", CancellationToken ct = default)
    {
        var meta = await _jira.GetCreateMetaFieldsAsync(_projectKey, issueTypeId, ct);
        if (meta == null) return NotFound("Could not fetch field metadata from Jira");

        var fields = new Dictionary<string, object>();

        if (meta.Value.TryGetProperty("fields", out var fieldsArr))
        {
            foreach (var field in fieldsArr.EnumerateArray())
            {
                var key = GetStr(field, "key");
                var name = GetStr(field, "name");
                var required = field.TryGetProperty("required", out var req) && req.GetBoolean();
                var allowed = new List<string>();

                if (field.TryGetProperty("allowedValues", out var av))
                    foreach (var v in av.EnumerateArray())
                    {
                        var val = v.TryGetProperty("value", out var vv) ? vv.GetString()
                                : v.TryGetProperty("name", out var vn) ? vn.GetString()
                                : null;
                        if (val != null) allowed.Add(val);
                    }

                if (!string.IsNullOrEmpty(key))
                    fields[key] = new { name, required, allowedValues = allowed };
            }
        }

        return Ok(fields);
    }

    /// <summary>
    /// Returns Jira priorities.
    /// </summary>
    [HttpGet("priorities")]
    public async Task<IActionResult> GetPriorities(CancellationToken ct = default)
    {
        var priorities = await _jira.GetPrioritiesAsync(ct);
        var result = priorities.Select(p => new
        {
            id      = GetStr(p, "id"),
            name    = GetStr(p, "name"),
            iconUrl = GetStr(p, "iconUrl"),
        });
        return Ok(result);
    }

    private static string GetStr(JsonElement el, string key)
        => el.TryGetProperty(key, out var v) ? v.GetString() ?? string.Empty : string.Empty;
}
