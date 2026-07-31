using MediatR;

namespace FIT.Application.Features.Issues.Commands.ApproveReview;

public class ApproveReviewCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public string? Comments { get; set; }

    public ApproveReviewCommand(Guid issueId, string? comments = null)
    {
        IssueId = issueId;
        Comments = comments;
    }
}
