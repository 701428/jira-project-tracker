using MediatR;

namespace FIT.Application.Features.Issues.Commands.RejectIssue;

public class RejectIssueCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public string Comments { get; set; } = string.Empty;

    public RejectIssueCommand(Guid issueId, string comments)
    {
        IssueId = issueId;
        Comments = comments;
    }
}
