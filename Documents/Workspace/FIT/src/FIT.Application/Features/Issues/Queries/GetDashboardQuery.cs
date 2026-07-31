using AutoMapper;
using FIT.Application.DTOs;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Queries;

public class GetDashboardQuery : IRequest<DashboardDto>
{
}

public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public GetDashboardQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<DashboardDto> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
    {
        // Fetch all issues in one call and compute counts locally
        var (allIssues, _) = await _unitOfWork.FieldIssues.GetAllAsync(
            new FieldIssueFilter { Page = 1, PageSize = 200 }, cancellationToken);
        var issues = allIssues.ToList();

        int Count(IssueStatus s) => issues.Count(i => i.Status == s);

        var draft      = Count(IssueStatus.Draft);
        var submitted  = Count(IssueStatus.Submitted);
        var approved   = Count(IssueStatus.Approved);
        var rejected   = Count(IssueStatus.Rejected);
        var development = Count(IssueStatus.Development);
        var review     = Count(IssueStatus.Review);
        var validation = Count(IssueStatus.Validation);
        var closed     = Count(IssueStatus.Closed);

        var recentIssues = issues.Take(10).ToList();

        return new DashboardDto
        {
            Total = issues.Count,
            Open = draft + submitted + approved + development + review + validation,
            Submitted = submitted,
            Approved = approved,
            InDevelopment = development,
            InReview = review,
            InValidation = validation,
            Closed = closed,
            Rejected = rejected,
            RecentIssues = _mapper.Map<List<IssueListDto>>(recentIssues)
        };
    }
}
