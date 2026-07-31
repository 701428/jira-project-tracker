using MediatR;
using Microsoft.AspNetCore.Http;

namespace FIT.Application.Features.Issues.Commands.UploadAttachment;

public class UploadAttachmentCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public IFormFile File { get; set; } = null!;
    public string? Description { get; set; }
}
