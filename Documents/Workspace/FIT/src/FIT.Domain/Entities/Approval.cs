using FIT.Domain.Common;
using FIT.Domain.Enums;

namespace FIT.Domain.Entities;

public class Approval : BaseEntity
{
    public Guid FieldIssueId { get; private set; }
    public Guid ReviewerId { get; private set; }
    public ApprovalDecision Decision { get; private set; }
    public string? Comments { get; private set; }
    public DateTime DecidedAt { get; private set; }

    // Navigation
    public FieldIssue FieldIssue { get; private set; } = null!;
    public User Reviewer { get; private set; } = null!;

    protected Approval() { }

    public Approval(Guid fieldIssueId, Guid reviewerId, ApprovalDecision decision, string? comments = null)
    {
        FieldIssueId = fieldIssueId;
        ReviewerId = reviewerId;
        Decision = decision;
        Comments = comments;
        DecidedAt = DateTime.UtcNow;
    }
}
