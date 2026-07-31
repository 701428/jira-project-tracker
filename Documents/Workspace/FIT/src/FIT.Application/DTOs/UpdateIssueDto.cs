using FIT.Domain.Enums;

namespace FIT.Application.DTOs;

public class UpdateIssueDto
{
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IssuePriority Priority { get; set; }
    public IssueSeverity Severity { get; set; }
    public IssueCategory Category { get; set; }
    public MeterType MeterType { get; set; }
    public string MeterSerial { get; set; } = string.Empty;
    public string? MeterFirmwareVersion { get; set; }
    public CommType CommType { get; set; }
    public Guid? CustomerId { get; set; }
    public string? CustomerSiteAddress { get; set; }
    public string? FieldObservations { get; set; }
    public string? StepsToReproduce { get; set; }
    public string? ExpectedBehavior { get; set; }
    public string? ActualBehavior { get; set; }
}
