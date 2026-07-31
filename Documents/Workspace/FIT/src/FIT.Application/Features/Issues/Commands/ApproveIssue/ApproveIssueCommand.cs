using MediatR;

namespace FIT.Application.Features.Issues.Commands.ApproveIssue;

public class ApproveIssueCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public string? Comments { get; set; }

    public ApproveIssueCommand(Guid issueId, string? comments = null)
    {
        IssueId = issueId;
        Comments = comments;
    }
}
