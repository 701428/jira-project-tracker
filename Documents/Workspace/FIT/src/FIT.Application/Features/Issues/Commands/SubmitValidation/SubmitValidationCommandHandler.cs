using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.SubmitValidation;

public class SubmitValidationCommandHandler : IRequestHandler<SubmitValidationCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IJiraService _jiraService;
    private readonly IEmailService _emailService;

    public SubmitValidationCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IJiraService jiraService, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _jiraService = jiraService;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(SubmitValidationCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.ValidationEngineer && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Validation Engineers can submit validation results.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        if (request.Result == ValidationResult.Pass)
        {
            var (validation, log) = issue.Pass(_currentUser.UserId, request.Notes);

            // Close Jira issue
            if (issue.JiraKey != null)
            {
                await _jiraService.UpdateStatusAsync(issue.JiraKey, "Done", cancellationToken);
                await _jiraService.AddCommentAsync(issue.JiraKey, $"Validation Passed. {request.Notes}", cancellationToken);
            }
        }
        else if (request.Result == ValidationResult.Fail)
        {
            if (string.IsNullOrWhiteSpace(request.Notes))
                throw new AppException("Notes are required when validation fails.");

            var (validation, log) = issue.Fail(_currentUser.UserId, request.Notes!);

            if (issue.JiraKey != null)
            {
                await _jiraService.UpdateStatusAsync(issue.JiraKey, "In Development", cancellationToken);
                await _jiraService.AddCommentAsync(issue.JiraKey, $"Validation Failed. Returned to Development. Notes: {request.Notes}", cancellationToken);
            }

            // Notify developer
            if (issue.AssignedDeveloperId.HasValue)
            {
                var developer = await _unitOfWork.Users.GetByIdAsync(issue.AssignedDeveloperId.Value, cancellationToken);
                if (developer != null)
                {
                    var subject = $"[FIT] Validation Failed - Action Required: {issue.IssueNumber}";
                    var body = $"<p>Validation has failed for your field issue. It has been returned to Development.</p>" +
                               $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                               $"<p><strong>Validation Notes:</strong> {request.Notes}</p>";
                    await _emailService.SendAsync(developer.Email, subject, body, true, cancellationToken);
                }
            }
        }
        else
        {
            throw new AppException("Invalid validation result. Must be Pass or Fail.");
        }

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
