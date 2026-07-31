using AutoMapper;
using FIT.Application.Common;
using FIT.Application.DTOs;
using FIT.Domain.Interfaces;
using MediatR;

namespace FIT.Application.Features.Issues.Queries;

public class GetIssueQuery : IRequest<IssueDto>
{
    public Guid IssueId { get; set; }

    public GetIssueQuery(Guid issueId)
    {
        IssueId = issueId;
    }
}

public class GetIssueQueryHandler : IRequestHandler<GetIssueQuery, IssueDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public GetIssueQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<IssueDto> Handle(GetIssueQuery request, CancellationToken cancellationToken)
    {
        var issue = await _unitOfWork.FieldIssues.GetByIdWithDetailsAsync(request.IssueId, cancellationToken)
            ?? throw new NotFoundException("FieldIssue", request.IssueId);

        return _mapper.Map<IssueDto>(issue);
    }
}
