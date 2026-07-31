using FIT.Domain.Common;

namespace FIT.Domain.Entities;

public class Comment : BaseEntity
{
    public Guid FieldIssueId { get; private set; }
    public Guid AuthorId { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public bool IsInternal { get; private set; }
    public Guid? ParentCommentId { get; private set; }

    // Navigation
    public FieldIssue FieldIssue { get; private set; } = null!;
    public User Author { get; private set; } = null!;
    public Comment? ParentComment { get; private set; }
    public ICollection<Comment> Replies { get; private set; } = new List<Comment>();

    protected Comment() { }

    public Comment(Guid fieldIssueId, Guid authorId, string content, bool isInternal = false, Guid? parentCommentId = null)
    {
        FieldIssueId = fieldIssueId;
        AuthorId = authorId;
        Content = content;
        IsInternal = isInternal;
        ParentCommentId = parentCommentId;
    }

    public void Edit(string content)
    {
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetCreatedAt(DateTime createdAt) => CreatedAt = createdAt;
}
