using FIT.Domain.Enums;

namespace FIT.Application.DTOs;

public class IssueListDto
{
    public Guid Id { get; set; }
    public string IssueNumber { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public IssueStatus Status { get; set; }
    public string StatusDisplay => Status.ToString();
    public IssuePriority Priority { get; set; }
    public string PriorityDisplay => Priority.ToString();
    public IssueSeverity Severity { get; set; }
    public string SeverityDisplay => Severity.ToString();
    public IssueCategory Category { get; set; }
    public MeterType MeterType { get; set; }
    public string MeterSerial { get; set; } = string.Empty;
    public string ReporterName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? AssignedDeveloperName { get; set; }
    public string? JiraKey { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
}
