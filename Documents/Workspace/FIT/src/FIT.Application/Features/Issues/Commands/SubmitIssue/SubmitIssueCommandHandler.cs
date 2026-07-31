using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.SubmitIssue;

public class SubmitIssueCommandHandler : IRequestHandler<SubmitIssueCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;

    public SubmitIssueCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(SubmitIssueCommand request, CancellationToken cancellationToken)
    {
        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        if (issue.ReporterId != _currentUser.UserId && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("You can only submit your own issues.");

        issue.Submit();

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify team leads
        var teamLeads = await _unitOfWork.Users.GetByRoleAsync(UserRole.TeamLead, cancellationToken);
        var emails = teamLeads.Select(u => u.Email).ToList();
        if (emails.Any())
        {
            var subject = $"[FIT] New Issue Submitted: {issue.IssueNumber}";
            var body = $"<p>A new field issue has been submitted and requires your approval.</p>" +
                       $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                       $"<p><strong>Priority:</strong> {issue.Priority}</p>" +
                       $"<p><strong>Severity:</strong> {issue.Severity}</p>" +
                       $"<p><strong>Meter Serial:</strong> {issue.MeterSerial}</p>" +
                       $"<p>Please log in to the FIT portal to review and approve/reject this issue.</p>";

            await _emailService.SendToMultipleAsync(emails, subject, body, true, cancellationToken);
        }

        return Unit.Value;
    }
}
