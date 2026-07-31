namespace FIT.Application.DTOs;

public class AttachmentDto
{
    public Guid Id { get; set; }
    public Guid FieldIssueId { get; set; }
    public Guid UploadedById { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string Url => StoragePath;   // StoragePath holds the Jira content URL
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
