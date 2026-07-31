using FIT.Domain.Common;

namespace FIT.Domain.Entities;

public class Attachment : BaseEntity
{
    public Guid FieldIssueId { get; private set; }
    public Guid UploadedById { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string OriginalFileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long FileSizeBytes { get; private set; }
    public string StoragePath { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    // Navigation
    public FieldIssue FieldIssue { get; private set; } = null!;
    public User UploadedBy { get; private set; } = null!;

    protected Attachment() { }

    public Attachment(Guid fieldIssueId, Guid uploadedById, string fileName, string originalFileName, string contentType, long fileSizeBytes, string storagePath, string? description = null)
    {
        FieldIssueId = fieldIssueId;
        UploadedById = uploadedById;
        FileName = fileName;
        OriginalFileName = originalFileName;
        ContentType = contentType;
        FileSizeBytes = fileSizeBytes;
        StoragePath = storagePath;
        Description = description;
    }
}
