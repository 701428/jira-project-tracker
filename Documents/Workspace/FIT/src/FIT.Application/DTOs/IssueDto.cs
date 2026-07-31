using FIT.Domain.Enums;

namespace FIT.Application.DTOs;

public class IssueDto
{
    public Guid Id { get; set; }
    public string IssueNumber { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IssueStatus Status { get; set; }
    public string StatusDisplay => Status.ToString();
    public IssuePriority Priority { get; set; }
    public string PriorityDisplay => Priority.ToString();
    public IssueSeverity Severity { get; set; }
    public string SeverityDisplay => Severity.ToString();
    public IssueCategory Category { get; set; }
    public string CategoryDisplay => Category.ToString();
    public MeterType MeterType { get; set; }
    public string MeterTypeDisplay => MeterType.ToString();
    public string MeterSerial { get; set; } = string.Empty;
    public string? MeterFirmwareVersion { get; set; }
    public CommType CommType { get; set; }
    public string CommTypeDisplay => CommType.ToString();
    public string? CustomerSiteAddress { get; set; }
    public string? FieldObservations { get; set; }
    public string? StepsToReproduce { get; set; }
    public string? ExpectedBehavior { get; set; }
    public string? ActualBehavior { get; set; }
    public Guid ReporterId { get; set; }
    public string ReporterName { get; set; } = string.Empty;
    public string ReporterEmail { get; set; } = string.Empty;
    public Guid? CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public Guid? AssignedDeveloperId { get; set; }
    public string? AssignedDeveloperName { get; set; }
    public string? JiraKey { get; set; }
    public string? JiraUrl { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? DevelopmentStartedAt { get; set; }
    public DateTime? ReviewStartedAt { get; set; }
    public DateTime? ValidationStartedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<ApprovalDto> Approvals { get; set; } = new();
    public List<AttachmentDto> Attachments { get; set; } = new();
    public List<CommentDto> Comments { get; set; } = new();
    public List<DeveloperNoteDto> DeveloperNotes { get; set; } = new();
    public List<ValidationDto> Validations { get; set; } = new();
    public List<ActivityLogDto> ActivityLogs { get; set; } = new();
}
