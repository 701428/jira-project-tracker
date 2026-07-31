using FIT.Application.Features.Issues.Commands.AddComment;
using FIT.Application.Features.Issues.Commands.UpdateIssue;
using FIT.Application.Features.Issues.Commands.ApproveIssue;
using FIT.Application.Features.Issues.Commands.ApproveReview;
using FIT.Application.Features.Issues.Commands.AssignDeveloper;
using FIT.Application.Features.Issues.Commands.CreateIssue;
using FIT.Application.Features.Issues.Commands.MoveToReview;
using FIT.Application.Features.Issues.Commands.RejectIssue;
using FIT.Application.Features.Issues.Commands.RejectReview;
using FIT.Application.Features.Issues.Commands.SubmitIssue;
using FIT.Application.Features.Issues.Commands.SubmitValidation;
using FIT.Application.Features.Issues.Commands.UploadAttachment;
using FIT.Application.Features.Issues.Queries;
using FIT.Domain.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FIT.API.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly IMediator _mediator;
    public IssuesController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Accepts either a plain GUID or a Jira key like "FIT-18" and returns the
    /// deterministic GUID that JiraFieldIssueRepository uses internally.
    /// </summary>
    private static Guid ResolveId(string id)
    {
        if (Guid.TryParse(id, out var g)) return g;

        // Jira key format: PROJECT-NUMBER  e.g. "FIT-18"
        var dash = id.LastIndexOf('-');
        if (dash >= 0 && int.TryParse(id.AsSpan(dash + 1), out var num))
        {
            var bytes = new byte[16];
            BitConverter.GetBytes(num).CopyTo(bytes, 12);
            return new Guid(bytes);
        }
        return Guid.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] GetIssuesQuery query, CancellationToken ct = default)
        => Ok(await _mediator.Send(query, ct));

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CreateIssueCommand cmd, CancellationToken ct = default)
    {
        var result = await _mediator.Send(cmd, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetIssueQuery(ResolveId(id)), ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateIssueCommand cmd, CancellationToken ct = default)
    {
        cmd.IssueId = ResolveId(id);
        var result = await _mediator.Send(cmd, ct);
        return Ok(result);
    }

    [HttpPost("{id}/submit")]
    [Authorize(Roles = "FieldEngineer,Admin")]
    public async Task<IActionResult> Submit(string id, CancellationToken ct = default)
    {
        await _mediator.Send(new SubmitIssueCommand(ResolveId(id)), ct);
        return NoContent();
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "TeamLead,Admin")]
    public async Task<IActionResult> Approve(string id, [FromBody] ApproveRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new ApproveIssueCommand(ResolveId(id), req.Comments), ct);
        return NoContent();
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "TeamLead,Admin")]
    public async Task<IActionResult> Reject(string id, [FromBody] RejectRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new RejectIssueCommand(ResolveId(id), req.Comments ?? string.Empty), ct);
        return NoContent();
    }

    [HttpPost("{id}/assign")]
    [Authorize(Roles = "TeamLead,Admin")]
    public async Task<IActionResult> Assign(string id, [FromBody] AssignRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new AssignDeveloperCommand(ResolveId(id), req.DeveloperId), ct);
        return NoContent();
    }

    [HttpPost("{id}/move-to-review")]
    [Authorize(Roles = "Developer,Admin")]
    public async Task<IActionResult> MoveToReview(string id, CancellationToken ct = default)
    {
        await _mediator.Send(new MoveToReviewCommand(ResolveId(id)), ct);
        return NoContent();
    }

    [HttpPost("{id}/approve-review")]
    [Authorize(Roles = "Reviewer,Admin")]
    public async Task<IActionResult> ApproveReview(string id, [FromBody] ApproveRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new ApproveReviewCommand(ResolveId(id), req.Comments), ct);
        return NoContent();
    }

    [HttpPost("{id}/reject-review")]
    [Authorize(Roles = "Reviewer,Admin")]
    public async Task<IActionResult> RejectReview(string id, [FromBody] RejectRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new RejectReviewCommand(ResolveId(id), req.Comments ?? string.Empty), ct);
        return NoContent();
    }

    [HttpPost("{id}/validate")]
    [Authorize(Roles = "ValidationEngineer,Admin")]
    public async Task<IActionResult> Validate(string id, [FromBody] ValidateRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new SubmitValidationCommand { IssueId = ResolveId(id), Result = req.IsPassed ? Domain.Enums.ValidationResult.Pass : Domain.Enums.ValidationResult.Fail, Notes = req.Notes }, ct);
        return NoContent();
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(string id, [FromBody] AddCommentRequest req, CancellationToken ct = default)
    {
        await _mediator.Send(new AddCommentCommand { IssueId = ResolveId(id), Content = req.Content, IsInternal = req.IsInternal }, ct);
        return NoContent();
    }

    [HttpGet("{id}/transitions")]
    public async Task<IActionResult> GetTransitions(string id, CancellationToken ct = default)
    {
        var guid = ResolveId(id);
        var issue = await _mediator.Send(new GetIssueQuery(guid), ct);
        if (issue is null) return NotFound();
        var jira = HttpContext.RequestServices.GetRequiredService<FIT.Domain.Interfaces.IJiraService>();
        var jiraKey = issue.JiraKey ?? issue.IssueNumber;
        var resp = await jira.GetTransitionsForIssueAsync(jiraKey, ct);
        return Ok(resp);
    }

    [HttpPost("{id}/transition")]
    public async Task<IActionResult> Transition(string id, [FromBody] TransitionRequest req, CancellationToken ct = default)
    {
        var guid = ResolveId(id);
        var issue = await _mediator.Send(new GetIssueQuery(guid), ct);
        if (issue is null) return NotFound();
        var jira = HttpContext.RequestServices.GetRequiredService<FIT.Domain.Interfaces.IJiraService>();
        var jiraKey = issue.JiraKey ?? issue.IssueNumber;
        await jira.ExecuteTransitionAsync(jiraKey, req.TransitionId, ct);
        if (!string.IsNullOrWhiteSpace(req.Comment))
            await jira.AddCommentAsync(jiraKey, req.Comment, ct);
        return NoContent();
    }

    [HttpPost("{id}/attachments")]
    public async Task<IActionResult> UploadAttachment(string id, [FromForm] IFormFile file, [FromForm] string? description = null, CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");
        await _mediator.Send(new UploadAttachmentCommand { IssueId = ResolveId(id), File = file, Description = description }, ct);
        return NoContent();
    }
}

public record ApproveRequest(string? Comments);
public record RejectRequest(string? Comments);
public record AssignRequest(Guid DeveloperId);
public record ValidateRequest(bool IsPassed, string? Notes);
public record AddCommentRequest(string Content, bool IsInternal = false);
public record TransitionRequest(string TransitionId, string? Comment);
