using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.RejectIssue;

public class RejectIssueCommandHandler : IRequestHandler<RejectIssueCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;

    public RejectIssueCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(RejectIssueCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.TeamLead && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Team Leads can reject issues.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        issue.Reject(_currentUser.UserId, request.Comments);

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify reporter
        var reporter = await _unitOfWork.Users.GetByIdAsync(issue.ReporterId, cancellationToken);
        if (reporter != null)
        {
            var subject = $"[FIT] Issue Rejected: {issue.IssueNumber}";
            var body = $"<p>Your field issue has been rejected.</p>" +
                       $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                       $"<p><strong>Reason:</strong> {request.Comments}</p>" +
                       $"<p>Please update your issue and resubmit if necessary.</p>";

            await _emailService.SendAsync(reporter.Email, subject, body, true, cancellationToken);
        }

        return Unit.Value;
    }
}
