namespace FIT.Application.DTOs;

public class CommentDto
{
    public Guid Id { get; set; }
    public Guid FieldIssueId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public Guid? ParentCommentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<CommentDto> Replies { get; set; } = new();
}
