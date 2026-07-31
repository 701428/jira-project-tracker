using FIT.Domain.Common;
using FIT.Domain.Enums;

namespace FIT.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public Guid FieldIssueId { get; private set; }
    public string Action { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Guid PerformedById { get; private set; }
    public IssueStatus StatusAtTime { get; private set; }
    public string? Metadata { get; private set; }

    // Navigation
    public FieldIssue FieldIssue { get; private set; } = null!;
    public User PerformedBy { get; private set; } = null!;

    protected ActivityLog() { }

    public ActivityLog(Guid fieldIssueId, string action, string description, Guid performedById, IssueStatus statusAtTime, string? metadata = null)
    {
        FieldIssueId = fieldIssueId;
        Action = action;
        Description = description;
        PerformedById = performedById;
        StatusAtTime = statusAtTime;
        Metadata = metadata;
    }
}
