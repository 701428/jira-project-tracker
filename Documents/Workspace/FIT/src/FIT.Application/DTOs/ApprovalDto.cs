using FIT.Domain.Enums;

namespace FIT.Application.DTOs;

public class ApprovalDto
{
    public Guid Id { get; set; }
    public Guid FieldIssueId { get; set; }
    public Guid ReviewerId { get; set; }
    public string ReviewerName { get; set; } = string.Empty;
    public ApprovalDecision Decision { get; set; }
    public string DecisionDisplay => Decision.ToString();
    public string? Comments { get; set; }
    public DateTime DecidedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
