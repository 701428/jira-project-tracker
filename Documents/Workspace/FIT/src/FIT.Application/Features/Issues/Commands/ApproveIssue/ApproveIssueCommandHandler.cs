using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.ApproveIssue;

public class ApproveIssueCommandHandler : IRequestHandler<ApproveIssueCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IJiraService _jiraService;
    private readonly IEmailService _emailService;

    public ApproveIssueCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IJiraService jiraService, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _jiraService = jiraService;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(ApproveIssueCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.TeamLead && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Team Leads can approve issues.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        var (approval, log) = issue.Approve(_currentUser.UserId, request.Comments);

        // Issue is already in Jira from creation — just update status label and add approval comment
        if (!string.IsNullOrEmpty(request.Comments) && !string.IsNullOrEmpty(issue.JiraKey))
            await _jiraService.AddCommentAsync(issue.JiraKey, $"[APPROVED] {request.Comments}", cancellationToken);

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify reporter
        var reporter = await _unitOfWork.Users.GetByIdAsync(issue.ReporterId, cancellationToken);
        if (reporter != null)
        {
            var jiraInfo = !string.IsNullOrEmpty(issue.JiraUrl)
                ? $"<p><strong>Jira Issue:</strong> <a href='{issue.JiraUrl}'>{issue.JiraKey}</a></p>"
                : string.Empty;
            var subject = $"[FIT] Issue Approved: {issue.IssueNumber}";
            var body = $"<p>Your field issue has been approved.</p>" +
                       $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                       jiraInfo +
                       (request.Comments != null ? $"<p><strong>Comments:</strong> {request.Comments}</p>" : string.Empty);

            await _emailService.SendAsync(reporter.Email, subject, body, true, cancellationToken);
        }

        return Unit.Value;
    }
}
