using FluentValidation;

namespace FIT.Application.Features.Issues.Commands.CreateIssue;

public class CreateIssueCommandValidator : AbstractValidator<CreateIssueCommand>
{
    public CreateIssueCommandValidator()
    {
        RuleFor(x => x.Summary)
            .NotEmpty().WithMessage("Summary is required.")
            .MaximumLength(500).WithMessage("Summary must not exceed 500 characters.");

        RuleFor(x => x.MeterSerial)
            .NotEmpty().WithMessage("Meter serial number is required.")
            .MaximumLength(100).WithMessage("Meter serial must not exceed 100 characters.");

        RuleFor(x => x.Category)
            .IsInEnum().WithMessage("A valid issue category is required.");

        RuleFor(x => x.MeterType)
            .IsInEnum().WithMessage("A valid meter type is required.");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("A valid priority is required.");

        RuleFor(x => x.Severity)
            .IsInEnum().WithMessage("A valid severity is required.");

        RuleFor(x => x.Description)
            .MaximumLength(5000).WithMessage("Description must not exceed 5000 characters.")
            .When(x => x.Description != null);
    }
}
