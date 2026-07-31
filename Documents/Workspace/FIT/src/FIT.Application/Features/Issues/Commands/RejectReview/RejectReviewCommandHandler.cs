using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.RejectReview;

public class RejectReviewCommandHandler : IRequestHandler<RejectReviewCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IJiraService _jiraService;
    private readonly IEmailService _emailService;

    public RejectReviewCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IJiraService jiraService, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _jiraService = jiraService;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(RejectReviewCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.Reviewer && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Reviewers can reject reviews.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        if (issue.Status != IssueStatus.Review)
            throw new AppException($"Cannot reject review for issue in status {issue.Status}.");

        issue.RejectReview(_currentUser.UserId, request.Comments);

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (issue.JiraKey != null)
        {
            await _jiraService.UpdateStatusAsync(issue.JiraKey, "In Development", cancellationToken);
            await _jiraService.AddCommentAsync(issue.JiraKey, $"Review rejected: {request.Comments}", cancellationToken);
        }

        // Notify assigned developer
        if (issue.AssignedDeveloperId.HasValue)
        {
            var developer = await _unitOfWork.Users.GetByIdAsync(issue.AssignedDeveloperId.Value, cancellationToken);
            if (developer != null)
            {
                var subject = $"[FIT] Review Rejected - Action Required: {issue.IssueNumber}";
                var body = $"<p>The review for your field issue has been rejected and returned to Development.</p>" +
                           $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                           $"<p><strong>Review Comments:</strong> {request.Comments}</p>";
                await _emailService.SendAsync(developer.Email, subject, body, true, cancellationToken);
            }
        }

        return Unit.Value;
    }
}
