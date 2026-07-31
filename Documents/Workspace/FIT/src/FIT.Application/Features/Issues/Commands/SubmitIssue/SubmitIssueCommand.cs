using MediatR;

namespace FIT.Application.Features.Issues.Commands.SubmitIssue;

public class SubmitIssueCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }

    public SubmitIssueCommand(Guid issueId)
    {
        IssueId = issueId;
    }
}
