using FIT.Domain.Enums;

namespace FIT.Application.DTOs;

public class ActivityLogDto
{
    public Guid Id { get; set; }
    public Guid FieldIssueId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid PerformedById { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public IssueStatus StatusAtTime { get; set; }
    public string StatusDisplay => StatusAtTime.ToString();
    public DateTime CreatedAt { get; set; }
}
