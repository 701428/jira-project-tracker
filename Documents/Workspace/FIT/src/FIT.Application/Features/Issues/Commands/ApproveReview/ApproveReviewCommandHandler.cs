using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.ApproveReview;

public class ApproveReviewCommandHandler : IRequestHandler<ApproveReviewCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IJiraService _jiraService;
    private readonly IEmailService _emailService;

    public ApproveReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IJiraService jiraService, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _jiraService = jiraService;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(ApproveReviewCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.Reviewer && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Reviewers can approve reviews.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        issue.StartValidation();

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (issue.JiraKey != null)
        {
            await _jiraService.UpdateStatusAsync(issue.JiraKey, "In Validation", cancellationToken);
        }

        // Notify validation engineers
        var validators = await _unitOfWork.Users.GetByRoleAsync(UserRole.ValidationEngineer, cancellationToken);
        var emails = validators.Select(u => u.Email).ToList();
        if (emails.Any())
        {
            var subject = $"[FIT] Issue Ready for Validation: {issue.IssueNumber}";
            var body = $"<p>A field issue has passed review and is ready for validation.</p>" +
                       $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>";
            await _emailService.SendToMultipleAsync(emails, subject, body, true, cancellationToken);
        }

        return Unit.Value;
    }
}
