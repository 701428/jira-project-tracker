using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.MoveToReview;

public class MoveToReviewCommandHandler : IRequestHandler<MoveToReviewCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IJiraService _jiraService;
    private readonly IEmailService _emailService;

    public MoveToReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IJiraService jiraService, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _jiraService = jiraService;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(MoveToReviewCommand request, CancellationToken cancellationToken)
    {
        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        if (issue.AssignedDeveloperId != _currentUser.UserId && _currentUser.Role != UserRole.Admin && _currentUser.Role != UserRole.TeamLead)
            throw new ForbiddenException("Only the assigned developer can move the issue to review.");

        issue.MoveToReview();

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Update Jira status
        if (issue.JiraKey != null)
        {
            await _jiraService.UpdateStatusAsync(issue.JiraKey, "In Review", cancellationToken);
        }

        // Notify reviewers
        var reviewers = await _unitOfWork.Users.GetByRoleAsync(UserRole.Reviewer, cancellationToken);
        var emails = reviewers.Select(u => u.Email).ToList();
        if (emails.Any())
        {
            var subject = $"[FIT] Issue Ready for Review: {issue.IssueNumber}";
            var body = $"<p>A field issue is ready for your review.</p>" +
                       $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                       (issue.JiraKey != null ? $"<p><strong>Jira:</strong> <a href='{issue.JiraUrl}'>{issue.JiraKey}</a></p>" : string.Empty);
            await _emailService.SendToMultipleAsync(emails, subject, body, true, cancellationToken);
        }

        return Unit.Value;
    }
}
