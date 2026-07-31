using MediatR;

namespace FIT.Application.Features.Issues.Commands.AssignDeveloper;

public class AssignDeveloperCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public Guid DeveloperId { get; set; }

    public AssignDeveloperCommand(Guid issueId, Guid developerId)
    {
        IssueId = issueId;
        DeveloperId = developerId;
    }
}
