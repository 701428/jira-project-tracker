using FIT.Domain.Common;

namespace FIT.Domain.Entities;

public class DeveloperNote : BaseEntity
{
    public Guid FieldIssueId { get; private set; }
    public Guid AuthorId { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string? RootCause { get; private set; }
    public string? Fix { get; private set; }
    public string? FirmwareVersion { get; private set; }
    public bool IsResolutionNote { get; private set; }

    // Navigation
    public FieldIssue FieldIssue { get; private set; } = null!;
    public User Author { get; private set; } = null!;

    protected DeveloperNote() { }

    public DeveloperNote(Guid fieldIssueId, Guid authorId, string content, string? rootCause = null, string? fix = null, string? firmwareVersion = null, bool isResolutionNote = false)
    {
        FieldIssueId = fieldIssueId;
        AuthorId = authorId;
        Content = content;
        RootCause = rootCause;
        Fix = fix;
        FirmwareVersion = firmwareVersion;
        IsResolutionNote = isResolutionNote;
    }

    public void Update(string content, string? rootCause, string? fix, string? firmwareVersion, bool isResolutionNote)
    {
        Content = content;
        RootCause = rootCause;
        Fix = fix;
        FirmwareVersion = firmwareVersion;
        IsResolutionNote = isResolutionNote;
        UpdatedAt = DateTime.UtcNow;
    }
}
