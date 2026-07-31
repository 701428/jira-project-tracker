using FIT.Domain.Enums;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.SubmitValidation;

public class SubmitValidationCommand : IRequest<Unit>
{
    public Guid IssueId { get; set; }
    public ValidationResult Result { get; set; }
    public string? Notes { get; set; }
    public string? TestEnvironment { get; set; }
    public string? FirmwareVersionTested { get; set; }
}
