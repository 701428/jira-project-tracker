using AutoMapper;
using FIT.Application.Common;
using FIT.Application.DTOs;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Queries;

public class GetMyIssuesQuery : IRequest<PagedResult<IssueListDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetMyIssuesQueryHandler : IRequestHandler<GetMyIssuesQuery, PagedResult<IssueListDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IMapper _mapper;

    public GetMyIssuesQueryHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUser, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _mapper = mapper;
    }

    public async Task<PagedResult<IssueListDto>> Handle(GetMyIssuesQuery request, CancellationToken cancellationToken)
    {
        var filter = new FieldIssueFilter
        {
            ReporterId = _currentUser.UserId,
            Page = request.Page,
            PageSize = request.PageSize
        };

        var (items, totalCount) = await _unitOfWork.FieldIssues.GetAllAsync(filter, cancellationToken);
        var dtos = _mapper.Map<IEnumerable<IssueListDto>>(items);

        return new PagedResult<IssueListDto>(dtos, totalCount, request.Page, request.PageSize);
    }
}
