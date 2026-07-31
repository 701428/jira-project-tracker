using AutoMapper;
using FIT.Application.DTOs;
using FIT.Domain.Entities;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.CreateIssue;

public class CreateIssueCommandHandler : IRequestHandler<CreateIssueCommand, IssueDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IMapper _mapper;

    public CreateIssueCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _mapper = mapper;
    }

    public async Task<IssueDto> Handle(CreateIssueCommand request, CancellationToken cancellationToken)
    {
        var issue = new FieldIssue(
            issueNumber: "PENDING",
            summary: request.Summary,
            description: request.Description,
            priority: request.Priority,
            severity: request.Severity,
            category: request.Category,
            meterType: request.MeterType,
            meterSerial: request.MeterSerial,
            commType: request.CommType,
            reporterId: _currentUser.UserId,
            customerId: request.CustomerId,
            customerSiteAddress: request.CustomerSiteAddress,
            meterFirmwareVersion: request.MeterFirmwareVersion,
            fieldObservations: request.FieldObservations,
            stepsToReproduce: request.StepsToReproduce,
            expectedBehavior: request.ExpectedBehavior,
            actualBehavior: request.ActualBehavior
        );
        // Move directly to Submitted — issues are created in Jira immediately, no local draft
        issue.Submit();
        issue.SetJiraIssueType(request.WorkType);
        issue.ConnectedDcuId = request.ConnectedDcuId;
        issue.NearbyDcuId = request.NearbyDcuId;
        issue.ExtraJiraFields = request.ExtraFields;
        issue.ReporterName = _currentUser.UserName;

        await _unitOfWork.FieldIssues.CreateAsync(issue, cancellationToken);
        // issue.Id and issue.IssueNumber are set to the Jira key by CreateAsync

        var created = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(issue.Id, cancellationToken);
        return _mapper.Map<IssueDto>(created ?? issue);
    }
}
