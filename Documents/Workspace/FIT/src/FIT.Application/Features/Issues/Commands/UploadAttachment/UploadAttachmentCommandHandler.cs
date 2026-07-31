using FIT.Application.Common;
using FIT.Domain.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace FIT.Application.Features.Issues.Commands.UploadAttachment;

public class UploadAttachmentCommandHandler : IRequestHandler<UploadAttachmentCommand, Unit>
{
    private readonly IFieldIssueRepository _issues;
    private readonly IJiraService _jira;
    private readonly ILogger<UploadAttachmentCommandHandler> _log;

    public UploadAttachmentCommandHandler(IFieldIssueRepository issues, IJiraService jira, ILogger<UploadAttachmentCommandHandler> log)
    {
        _issues = issues;
        _jira   = jira;
        _log    = log;
    }

    public async Task<Unit> Handle(UploadAttachmentCommand request, CancellationToken cancellationToken)
    {
        var issue = await _issues.GetByIdAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        var jiraKey = issue.JiraKey ?? issue.IssueNumber;
        _log.LogInformation("Uploading attachment {File} to Jira {Key}", request.File.FileName, jiraKey);

        await using var stream = request.File.OpenReadStream();
        var result = await _jira.AddAttachmentAsync(
            jiraKey,
            stream,
            request.File.FileName,
            request.File.ContentType ?? "application/octet-stream",
            cancellationToken);

        if (result == null)
        {
            _log.LogError("AddAttachmentAsync returned null for {Key}", jiraKey);
            throw new InvalidOperationException($"Failed to upload attachment to Jira issue {jiraKey}");
        }

        _log.LogInformation("Attachment uploaded to Jira {Key}: {AttId}", jiraKey, result.Value.TryGetProperty("id", out var id) ? id.GetString() : "?");
        return Unit.Value;
    }
}
