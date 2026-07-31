using FIT.Application.Common;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.AssignDeveloper;

public class AssignDeveloperCommandHandler : IRequestHandler<AssignDeveloperCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IEmailService _emailService;

    public AssignDeveloperCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(AssignDeveloperCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.TeamLead && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Team Leads can assign developers.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        var developer = await _unitOfWork.Users.GetByIdAsync(request.DeveloperId, cancellationToken)
            ?? throw new NotFoundException("User", request.DeveloperId);

        if (developer.Role != UserRole.Developer && developer.Role != UserRole.Admin)
            throw new AppException("The assigned user must have the Developer role.");

        issue.AssignDeveloper(request.DeveloperId);

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Notify developer
        var subject = $"[FIT] Issue Assigned to You: {issue.IssueNumber}";
        var body = $"<p>A field issue has been assigned to you for development.</p>" +
                   $"<p><strong>Issue:</strong> {issue.IssueNumber} - {issue.Summary}</p>" +
                   $"<p><strong>Priority:</strong> {issue.Priority}</p>" +
                   $"<p><strong>Severity:</strong> {issue.Severity}</p>" +
                   (issue.JiraKey != null ? $"<p><strong>Jira:</strong> <a href='{issue.JiraUrl}'>{issue.JiraKey}</a></p>" : string.Empty);

        await _emailService.SendAsync(developer.Email, subject, body, true, cancellationToken);

        return Unit.Value;
    }
}
