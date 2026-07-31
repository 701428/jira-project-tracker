using MediatR;

namespace FIT.Application.Features.Issues.Commands.AddComment;

public class AddCommentCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public Guid? ParentCommentId { get; set; }
}
