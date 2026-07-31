using FIT.Domain.Common;
using FIT.Domain.Enums;

namespace FIT.Domain.Entities;

public class FieldIssue : BaseEntity
{
    public string IssueNumber { get; private set; } = string.Empty;
    public string Summary { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public IssueStatus Status { get; private set; } = IssueStatus.Draft;
    public IssuePriority Priority { get; private set; } = IssuePriority.Medium;
    public IssueSeverity Severity { get; private set; } = IssueSeverity.Moderate;
    public IssueCategory Category { get; private set; }
    public MeterType MeterType { get; private set; }
    public string MeterSerial { get; private set; } = string.Empty;
    public string? MeterFirmwareVersion { get; private set; }
    public CommType CommType { get; private set; } = CommType.None;
    public string? CustomerSiteAddress { get; private set; }
    public string? FieldObservations { get; private set; }
    public string? StepsToReproduce { get; private set; }
    public string? ExpectedBehavior { get; private set; }
    public string? ActualBehavior { get; private set; }

    // FK fields
    public Guid ReporterId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public Guid? AssignedDeveloperId { get; private set; }

    // Jira integration
    public string? JiraKey { get; private set; }
    public string? JiraUrl { get; private set; }
    public string JiraIssueType { get; private set; } = "Field Issue";

    // Timestamps
    public DateTime? SubmittedAt { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? DevelopmentStartedAt { get; private set; }
    public DateTime? ReviewStartedAt { get; private set; }
    public DateTime? ValidationStartedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }

    // Navigation
    public User Reporter { get; private set; } = null!;
    public User? AssignedDeveloper { get; private set; }
    public Customer? Customer { get; private set; }
    public ICollection<Approval> Approvals { get; private set; } = new List<Approval>();
    public ICollection<Comment> Comments { get; private set; } = new List<Comment>();
    public ICollection<Attachment> Attachments { get; private set; } = new List<Attachment>();
    public ICollection<DeveloperNote> DeveloperNotes { get; private set; } = new List<DeveloperNote>();
    public ICollection<Validation> Validations { get; private set; } = new List<Validation>();
    public ICollection<ActivityLog> ActivityLogs { get; private set; } = new List<ActivityLog>();

    protected FieldIssue() { }

    public FieldIssue(
        string issueNumber,
        string summary,
        string? description,
        IssuePriority priority,
        IssueSeverity severity,
        IssueCategory category,
        MeterType meterType,
        string meterSerial,
        CommType commType,
        Guid reporterId,
        Guid? customerId = null,
        string? customerSiteAddress = null,
        string? meterFirmwareVersion = null,
        string? fieldObservations = null,
        string? stepsToReproduce = null,
        string? expectedBehavior = null,
        string? actualBehavior = null)
    {
        IssueNumber = issueNumber;
        Summary = summary;
        Description = description;
        Priority = priority;
        Severity = severity;
        Category = category;
        MeterType = meterType;
        MeterSerial = meterSerial;
        CommType = commType;
        ReporterId = reporterId;
        CustomerId = customerId;
        CustomerSiteAddress = customerSiteAddress;
        MeterFirmwareVersion = meterFirmwareVersion;
        FieldObservations = fieldObservations;
        StepsToReproduce = stepsToReproduce;
        ExpectedBehavior = expectedBehavior;
        ActualBehavior = actualBehavior;
        Status = IssueStatus.Draft;
    }

    public void Update(
        string summary,
        string? description,
        IssuePriority priority,
        IssueSeverity severity,
        IssueCategory category,
        MeterType meterType,
        string meterSerial,
        CommType commType,
        Guid? customerId,
        string? customerSiteAddress,
        string? meterFirmwareVersion,
        string? fieldObservations,
        string? stepsToReproduce,
        string? expectedBehavior,
        string? actualBehavior)
    {
        if (Status != IssueStatus.Draft)
            throw new InvalidOperationException("Only draft issues can be edited directly.");

        Summary = summary;
        Description = description;
        Priority = priority;
        Severity = severity;
        Category = category;
        MeterType = meterType;
        MeterSerial = meterSerial;
        CommType = commType;
        CustomerId = customerId;
        CustomerSiteAddress = customerSiteAddress;
        MeterFirmwareVersion = meterFirmwareVersion;
        FieldObservations = fieldObservations;
        StepsToReproduce = stepsToReproduce;
        ExpectedBehavior = expectedBehavior;
        ActualBehavior = actualBehavior;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateFields(
        string summary,
        string? description,
        IssuePriority priority,
        IssueSeverity severity,
        IssueCategory category,
        MeterType meterType,
        string meterSerial,
        CommType commType,
        string? customerSiteAddress,
        string? meterFirmwareVersion,
        string? fieldObservations)
    {
        Summary = summary;
        Description = description;
        Priority = priority;
        Severity = severity;
        Category = category;
        MeterType = meterType;
        MeterSerial = meterSerial;
        CommType = commType;
        CustomerSiteAddress = customerSiteAddress;
        MeterFirmwareVersion = meterFirmwareVersion;
        FieldObservations = fieldObservations;
        UpdatedAt = DateTime.UtcNow;
    }

    public ActivityLog Submit()
    {
        if (Status != IssueStatus.Draft)
            throw new InvalidOperationException($"Cannot submit issue in status {Status}.");

        Status = IssueStatus.Submitted;
        SubmittedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        return LogActivity("Submitted", $"Issue {IssueNumber} submitted for approval.", ReporterId);
    }

    public (Approval approval, ActivityLog log) Approve(Guid reviewerId, string? comments = null)
    {
        if (Status != IssueStatus.Submitted)
            throw new InvalidOperationException($"Cannot approve issue in status {Status}.");

        Status = IssueStatus.Approved;
        ApprovedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        var approval = new Approval(Id, reviewerId, ApprovalDecision.Approved, comments);
        Approvals.Add(approval);

        var log = LogActivity("Approved", $"Issue {IssueNumber} approved.", reviewerId);
        return (approval, log);
    }

    public (Approval approval, ActivityLog log) Reject(Guid reviewerId, string comments)
    {
        if (Status != IssueStatus.Submitted)
            throw new InvalidOperationException($"Cannot reject issue in status {Status}.");

        Status = IssueStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;

        var approval = new Approval(Id, reviewerId, ApprovalDecision.Rejected, comments);
        Approvals.Add(approval);

        var log = LogActivity("Rejected", $"Issue {IssueNumber} rejected. Reason: {comments}", reviewerId);
        return (approval, log);
    }

    public ActivityLog AssignDeveloper(Guid developerId)
    {
        if (Status != IssueStatus.Approved)
            throw new InvalidOperationException($"Cannot assign developer to issue in status {Status}.");

        AssignedDeveloperId = developerId;
        Status = IssueStatus.Development;
        DevelopmentStartedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        return LogActivity("AssignedDeveloper", $"Issue {IssueNumber} assigned to developer and moved to Development.", developerId);
    }

    public ActivityLog MoveToReview()
    {
        if (Status != IssueStatus.Development)
            throw new InvalidOperationException($"Cannot move to review from status {Status}.");

        Status = IssueStatus.Review;
        ReviewStartedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        return LogActivity("MovedToReview", $"Issue {IssueNumber} moved to Review.", AssignedDeveloperId ?? ReporterId);
    }

    public ActivityLog StartValidation()
    {
        if (Status != IssueStatus.Review)
            throw new InvalidOperationException($"Cannot start validation from status {Status}.");

        Status = IssueStatus.Validation;
        ValidationStartedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        return LogActivity("ValidationStarted", $"Issue {IssueNumber} moved to Validation.", AssignedDeveloperId ?? ReporterId);
    }

    public (Validation validation, ActivityLog log) Pass(Guid validatorId, string? notes = null)
    {
        if (Status != IssueStatus.Validation)
            throw new InvalidOperationException($"Cannot pass validation for issue in status {Status}.");

        Status = IssueStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        var validation = new Validation(Id, validatorId, Enums.ValidationResult.Pass, notes);
        Validations.Add(validation);

        var log = LogActivity("ValidationPassed", $"Issue {IssueNumber} passed validation and is now Closed.", validatorId);
        return (validation, log);
    }

    public (Validation validation, ActivityLog log) Fail(Guid validatorId, string notes)
    {
        if (Status != IssueStatus.Validation)
            throw new InvalidOperationException($"Cannot fail validation for issue in status {Status}.");

        Status = IssueStatus.Development;
        UpdatedAt = DateTime.UtcNow;

        var validation = new Validation(Id, validatorId, Enums.ValidationResult.Fail, notes);
        Validations.Add(validation);

        var log = LogActivity("ValidationFailed", $"Issue {IssueNumber} failed validation. Returned to Development. Notes: {notes}", validatorId);
        return (validation, log);
    }

    public ActivityLog RejectReview(Guid reviewerId, string comments)
    {
        if (Status != IssueStatus.Review)
            throw new InvalidOperationException($"Cannot reject review for issue in status {Status}.");

        Status = IssueStatus.Development;
        UpdatedAt = DateTime.UtcNow;

        return LogActivity("ReviewRejected", $"Issue {IssueNumber} review rejected. Returned to Development. Comments: {comments}", reviewerId);
    }

    public ActivityLog Close(Guid userId)
    {
        Status = IssueStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        return LogActivity("Closed", $"Issue {IssueNumber} closed.", userId);
    }

    public void SetJiraDetails(string jiraKey, string jiraUrl)
    {
        JiraKey = jiraKey;
        JiraUrl = jiraUrl;
        UpdatedAt = DateTime.UtcNow;
    }

    private ActivityLog LogActivity(string action, string description, Guid performedById)
    {
        var log = new ActivityLog(Id, action, description, performedById, Status);
        ActivityLogs.Add(log);
        return log;
    }

    // ── Persistence helpers (used by Jira repository only) ──────────────────

    public void SetId(Guid id) => Id = id;

    public void SetJiraIssueType(string issueType)
    {
        JiraIssueType = issueType;
        UpdatedAt = DateTime.UtcNow;
    }

    // Transient extra fields passed to Jira on create (not persisted to any DB)
    public string? ConnectedDcuId { get; set; }
    public string? NearbyDcuId { get; set; }
    public Dictionary<string, object>? ExtraJiraFields { get; set; }
    public string? ReporterName { get; set; }

    public void SetIssueNumber(string issueNumber)
    {
        IssueNumber = issueNumber;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Reconstitutes a FieldIssue from Jira data, bypassing domain validation.</summary>
    public static FieldIssue Reconstitute(
        Guid id,
        string issueNumber,
        string summary,
        string? description,
        IssueStatus status,
        IssuePriority priority,
        IssueSeverity severity,
        IssueCategory category,
        MeterType meterType,
        string meterSerial,
        CommType commType,
        Guid reporterId,
        Guid? customerId = null,
        string? customerSiteAddress = null,
        string? meterFirmwareVersion = null,
        string? fieldObservations = null,
        string? stepsToReproduce = null,
        string? expectedBehavior = null,
        string? actualBehavior = null,
        string? jiraKey = null,
        string? jiraUrl = null,
        DateTime? submittedAt = null,
        DateTime? approvedAt = null,
        DateTime? closedAt = null,
        DateTime? createdAt = null,
        DateTime? updatedAt = null)
    {
        var issue = new FieldIssue();
        issue.Id = id;
        issue.IssueNumber = issueNumber;
        issue.Summary = summary;
        issue.Description = description;
        issue.Status = status;
        issue.Priority = priority;
        issue.Severity = severity;
        issue.Category = category;
        issue.MeterType = meterType;
        issue.MeterSerial = meterSerial;
        issue.CommType = commType;
        issue.ReporterId = reporterId;
        issue.CustomerId = customerId;
        issue.CustomerSiteAddress = customerSiteAddress;
        issue.MeterFirmwareVersion = meterFirmwareVersion;
        issue.FieldObservations = fieldObservations;
        issue.StepsToReproduce = stepsToReproduce;
        issue.ExpectedBehavior = expectedBehavior;
        issue.ActualBehavior = actualBehavior;
        issue.JiraKey = jiraKey;
        issue.JiraUrl = jiraUrl;
        issue.SubmittedAt = submittedAt;
        issue.ApprovedAt = approvedAt;
        issue.ClosedAt = closedAt;
        if (createdAt.HasValue) issue.CreatedAt = createdAt.Value;
        if (updatedAt.HasValue) issue.UpdatedAt = updatedAt.Value;
        return issue;
    }
}
