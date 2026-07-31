using System.Text.Json;
using FIT.Domain.Entities;

namespace FIT.Domain.Interfaces;

public class JiraIssueResult
{
    public string Key { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

public interface IJiraService
{
    Task<JiraIssueResult> CreateIssueAsync(FieldIssue issue, CancellationToken cancellationToken = default);
    Task UpdateStatusAsync(string jiraKey, string status, CancellationToken cancellationToken = default);
    Task AddCommentAsync(string jiraKey, string comment, CancellationToken cancellationToken = default);
    Task<string> GetStatusAsync(string jiraKey, CancellationToken cancellationToken = default);

    // Extended methods for Jira-as-backend
    Task<JsonElement?> GetIssueAsync(string jiraKey, CancellationToken cancellationToken = default);
    Task<(List<JsonElement> Items, int Total)> SearchIssuesAsync(string jql, int startAt, int maxResults, CancellationToken cancellationToken = default);
    Task UpdateIssueFieldsAsync(string jiraKey, Dictionary<string, object> fields, CancellationToken cancellationToken = default);
    Task<List<JsonElement>> GetCommentsAsync(string jiraKey, CancellationToken cancellationToken = default);

    // Transitions
    Task<List<JsonElement>> GetTransitionsForIssueAsync(string jiraKey, CancellationToken cancellationToken = default);
    Task ExecuteTransitionAsync(string jiraKey, string transitionId, CancellationToken cancellationToken = default);

    // Attachments
    Task<JsonElement?> AddAttachmentAsync(string jiraKey, Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default);
    Task<List<JsonElement>> GetAttachmentsAsync(string jiraKey, CancellationToken cancellationToken = default);

    // Field metadata for form dropdowns
    Task<JsonElement?> GetCreateMetaFieldsAsync(string projectKey, string issueTypeId, CancellationToken cancellationToken = default);
    Task<List<JsonElement>> GetIssueTypesAsync(string projectKey, CancellationToken cancellationToken = default);
    Task<List<JsonElement>> GetPrioritiesAsync(CancellationToken cancellationToken = default);
}
