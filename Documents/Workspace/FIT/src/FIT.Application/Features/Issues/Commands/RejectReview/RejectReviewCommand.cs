using MediatR;

namespace FIT.Application.Features.Issues.Commands.RejectReview;

public class RejectReviewCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public string Comments { get; set; } = string.Empty;

    public RejectReviewCommand(Guid issueId, string comments)
    {
        IssueId = issueId;
        Comments = comments;
    }
}
