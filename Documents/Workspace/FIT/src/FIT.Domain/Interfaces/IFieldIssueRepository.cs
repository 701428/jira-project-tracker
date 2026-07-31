using FIT.Domain.Entities;
using FIT.Domain.Enums;

namespace FIT.Domain.Interfaces;

public class FieldIssueFilter
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

public interface IFieldIssueRepository
{
    Task<FieldIssue?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<FieldIssue?> GetByIdWithDetailsAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(IEnumerable<FieldIssue> Items, int TotalCount)> GetAllAsync(FieldIssueFilter filter, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldIssue>> GetByReporterAsync(Guid reporterId, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldIssue>> GetPendingApprovalAsync(CancellationToken cancellationToken = default);
    Task<string> GenerateIssueNumberAsync(CancellationToken cancellationToken = default);
    Task<FieldIssue> CreateAsync(FieldIssue issue, CancellationToken cancellationToken = default);
    Task UpdateAsync(FieldIssue issue, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<int> CountByStatusAsync(IssueStatus status, CancellationToken cancellationToken = default);
    Task<IEnumerable<FieldIssue>> GetRecentAsync(int count, CancellationToken cancellationToken = default);
}
