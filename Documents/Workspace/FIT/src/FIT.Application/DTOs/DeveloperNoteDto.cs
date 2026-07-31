namespace FIT.Application.DTOs;

public class DeveloperNoteDto
{
    public Guid Id { get; set; }
    public Guid FieldIssueId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? RootCause { get; set; }
    public string? Fix { get; set; }
    public string? FirmwareVersion { get; set; }
    public bool IsResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
