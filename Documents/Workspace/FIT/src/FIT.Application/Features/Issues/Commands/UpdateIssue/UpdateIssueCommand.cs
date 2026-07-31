using FIT.Application.DTOs;
using FIT.Domain.Enums;
using MediatR;

namespace FIT.Application.Features.Issues.Commands.UpdateIssue;

public class UpdateIssueCommand : IRequest<IssueDto>
{
    public Guid IssueId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Description { get; set; }
    public IssuePriority Priority { get; set; } = IssuePriority.Medium;
    public IssueSeverity Severity { get; set; } = IssueSeverity.Moderate;
    public IssueCategory Category { get; set; }
    public MeterType MeterType { get; set; }
    public string MeterSerial { get; set; } = string.Empty;
    public string? MeterFirmwareVersion { get; set; }
    public CommType CommType { get; set; } = CommType.None;
    public string? CustomerSiteAddress { get; set; }
    public string? FieldObservations { get; set; }
    public string? ConnectedDcuId { get; set; }
    public string? NearbyDcuId { get; set; }
    public Dictionary<string, object>? ExtraFields { get; set; }
}
