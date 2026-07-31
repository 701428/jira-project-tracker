using FIT.Application.Common;
using FIT.Domain.Entities;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.UpdateDeveloperNote;

public class UpdateDeveloperNoteCommandHandler : IRequestHandler<UpdateDeveloperNoteCommand, Unit>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public UpdateDeveloperNoteCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(UpdateDeveloperNoteCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.Developer && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Developers can add developer notes.");

        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        if (issue.Status != IssueStatus.Development && issue.Status != IssueStatus.Review)
            throw new AppException("Developer notes can only be added when issue is in Development or Review status.");

        // Check if a note by this developer exists, update it; otherwise create new
        var existingNote = issue.DeveloperNotes.FirstOrDefault(n => n.AuthorId == _currentUser.UserId);
        if (existingNote != null)
        {
            existingNote.Update(request.Content, request.RootCause, request.Fix, request.FirmwareVersion, request.IsResolutionNote);
        }
        else
        {
            var note = new DeveloperNote(
                issue.Id,
                _currentUser.UserId,
                request.Content,
                request.RootCause,
                request.Fix,
                request.FirmwareVersion,
                request.IsResolutionNote);

            issue.DeveloperNotes.Add(note);
        }

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
