using AutoMapper;
using FIT.Application.Common;
using FIT.Application.DTOs;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Queries;

public class GetIssuesQuery : IRequest<PagedResult<IssueListDto>>
{
    public IssueStatus? Status { get; set; }
    public IssuePriority? Priority { get; set; }
    public Guid? ReporterId { get; set; }
    public Guid? CustomerId { get; set; }
    public string? MeterSerial { get; set; }
    public string? JiraKey { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetIssuesQueryHandler : IRequestHandler<GetIssuesQuery, PagedResult<IssueListDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public GetIssuesQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<PagedResult<IssueListDto>> Handle(GetIssuesQuery request, CancellationToken cancellationToken)
    {
        var filter = new FieldIssueFilter
        {
            Status = request.Status,
            Priority = request.Priority,
            ReporterId = request.ReporterId,
            CustomerId = request.CustomerId,
            MeterSerial = request.MeterSerial,
            JiraKey = request.JiraKey,
            DateFrom = request.DateFrom,
            DateTo = request.DateTo,
            Search = request.Search,
            Page = request.Page,
            PageSize = request.PageSize
        };

        var (items, totalCount) = await _unitOfWork.FieldIssues.GetAllAsync(filter, cancellationToken);
        var dtos = _mapper.Map<IEnumerable<IssueListDto>>(items);

        return new PagedResult<IssueListDto>(dtos, totalCount, request.Page, request.PageSize);
    }
}
