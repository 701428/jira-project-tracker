using AutoMapper;
using FIT.Application.Common;
using FIT.Application.DTOs;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.UpdateIssue;

public class UpdateIssueCommandHandler : IRequestHandler<UpdateIssueCommand, IssueDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public UpdateIssueCommandHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<IssueDto> Handle(UpdateIssueCommand request, CancellationToken cancellationToken)
    {
        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        issue.UpdateFields(
            summary:              request.Summary,
            description:          request.Description,
            priority:             request.Priority,
            severity:             request.Severity,
            category:             request.Category,
            meterType:            request.MeterType,
            meterSerial:          request.MeterSerial,
            commType:             request.CommType,
            customerSiteAddress:  request.CustomerSiteAddress,
            meterFirmwareVersion: request.MeterFirmwareVersion,
            fieldObservations:    request.FieldObservations
        );

        issue.ConnectedDcuId    = request.ConnectedDcuId;
        issue.NearbyDcuId       = request.NearbyDcuId;
        issue.ExtraJiraFields   = request.ExtraFields;

        await _unitOfWork.FieldIssues.UpdateAsync(issue, cancellationToken);

        var updated = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(issue.Id, cancellationToken);
        return _mapper.Map<IssueDto>(updated ?? issue);
    }
}
