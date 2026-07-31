using MediatR;

namespace FIT.Application.Features.Issues.Commands.MoveToReview;

public class MoveToReviewCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }

    public MoveToReviewCommand(Guid issueId)
    {
        IssueId = issueId;
    }
}
