using AutoMapper;
using FIT.Application.Common;
using FIT.Application.DTOs;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Queries;

public class GetPendingApprovalQuery : IRequest<IEnumerable<IssueListDto>>
{
}

public class GetPendingApprovalQueryHandler : IRequestHandler<GetPendingApprovalQuery, IEnumerable<IssueListDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IMapper _mapper;

    public GetPendingApprovalQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _mapper = mapper;
    }

    public async Task<IEnumerable<IssueListDto>> Handle(GetPendingApprovalQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.Role != UserRole.TeamLead && _currentUser.Role != UserRole.Admin)
            throw new ForbiddenException("Only Team Leads can view pending approval queue.");

        var issues = await _unitOfWork.FieldIssues.GetPendingApprovalAsync(cancellationToken);
        return _mapper.Map<IEnumerable<IssueListDto>>(issues);
    }
}
