using MediatR;

namespace FIT.Application.Features.Issues.Commands.UpdateDeveloperNote;

public class UpdateDeveloperNoteCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? RootCause { get; set; }
    public string? Fix { get; set; }
    public string? FirmwareVersion { get; set; }
    public bool IsResolutionNote { get; set; }
}
