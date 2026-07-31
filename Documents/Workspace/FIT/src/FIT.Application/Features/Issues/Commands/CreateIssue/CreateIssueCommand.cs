using FIT.Application.DTOs;
using FIT.Domain.Enums;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.CreateIssue;

public class CreateIssueCommand : IRequest<IssueDto>
{
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IssuePriority Priority { get; set; } = IssuePriority.Medium;
    public IssueSeverity Severity { get; set; } = IssueSeverity.Moderate;
    public IssueCategory Category { get; set; }
    public MeterType MeterType { get; set; }
    public string MeterSerial { get; set; } = string.Empty;
    public string? MeterFirmwareVersion { get; set; }
    public CommType CommType { get; set; } = CommType.None;
    public Guid? CustomerId { get; set; }
    public string? CustomerSiteAddress { get; set; }
    public string? FieldObservations { get; set; }
    public string? StepsToReproduce { get; set; }
    public string? ExpectedBehavior { get; set; }
    public string? ActualBehavior { get; set; }
    public string WorkType { get; set; } = "Field Issue";
    public string? ConnectedDcuId { get; set; }
    public string? NearbyDcuId { get; set; }
    public Dictionary<string, object>? ExtraFields { get; set; }
}
