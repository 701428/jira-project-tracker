using System.Text.Json;
using FIT.Domain.Entities;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FIT.Infrastructure.Jira;

/// <summary>
/// Implements IFieldIssueRepository using Jira as the sole data store.
/// Every create/read/update goes directly to the FIT Jira project.
/// </summary>
public class JiraFieldIssueRepository : IFieldIssueRepository
{
    private readonly IJiraService _jira;
    private readonly ILogger<JiraFieldIssueRepository> _log;
    private readonly string _projectKey;
    private readonly string _baseUrl;

    // Label prefixes stored on each Jira issue to track FIT workflow state
    private const string StatusLabelPrefix = "FIT_STATUS_";
    private const string SeverityLabelPrefix = "FIT_SEV_";
    private const string GuidLabelPrefix    = "FIT_GUID_";
    private const string FitLabel           = "FIT";

    public JiraFieldIssueRepository(IJiraService jira, IConfiguration config, ILogger<JiraFieldIssueRepository> log)
    {
        _jira       = jira;
        _log        = log;
        _projectKey = config["Jira:ProjectKey"] ?? "FIT";
        _baseUrl    = config["Jira:BaseUrl"]    ?? "https://grampower.atlassian.net";
    }

    // ── ID helpers ──────────────────────────────────────────────────────────

    private static Guid KeyToGuid(string jiraKey)
    {
        // "FIT-9" → deterministic GUID with numeric id in last 4 bytes
        var parts = jiraKey.Split('-');
        if (parts.Length < 2 || !int.TryParse(parts[^1], out var num))
            return Guid.NewGuid();
        var bytes = new byte[16];
        var numBytes = BitConverter.GetBytes(num);
        bytes[12] = numBytes[0]; bytes[13] = numBytes[1];
        bytes[14] = numBytes[2]; bytes[15] = numBytes[3];
        return new Guid(bytes);
    }

    private string GuidToJiraKey(Guid id)
    {
        var bytes = id.ToByteArray();
        var num = BitConverter.ToInt32(bytes, 12);
        return $"{_projectKey}-{num}";
    }

    // ── Mapping ─────────────────────────────────────────────────────────────

    private static IssueStatus MapStatus(IEnumerable<string> labels, string jiraStatus)
    {
        // Live Jira workflow status is always the source of truth — labels are stale once a
        // transition happens in Jira, so only fall back to them when the native status is unknown.
        var nativeStatus = jiraStatus switch
        {
            "Done"          => IssueStatus.Closed,
            "Closed"        => IssueStatus.Closed,
            "In Progress"   => IssueStatus.Development,
            "Development"   => IssueStatus.Development,
            "Approved"      => IssueStatus.Approved,
            "Submitted"     => IssueStatus.Submitted,
            "Issue Created" => IssueStatus.Submitted,
            "In Review"     => IssueStatus.Review,
            "Review"        => IssueStatus.Review,
            "Validation"    => IssueStatus.Validation,
            "Rejected"      => IssueStatus.Rejected,
            _               => (IssueStatus?)null   // unknown — try labels
        };

        if (nativeStatus.HasValue) return nativeStatus.Value;

        // Fallback: label-based status for issues with no recognisable Jira status
        foreach (var label in labels)
        {
            if (!label.StartsWith(StatusLabelPrefix)) continue;
            var val = label[StatusLabelPrefix.Length..];
            if (Enum.TryParse<IssueStatus>(val, true, out var s)) return s;
        }

        return IssueStatus.Submitted;
    }

    private static IssueSeverity MapSeverity(IEnumerable<string> labels)
    {
        foreach (var label in labels)
        {
            if (label.StartsWith(SeverityLabelPrefix))
            {
                var val = label[SeverityLabelPrefix.Length..];
                if (Enum.TryParse<IssueSeverity>(val, true, out var s)) return s;
            }
            // Legacy labels (existing issues store severity directly as "Minor", "Moderate" etc.)
            if (Enum.TryParse<IssueSeverity>(label, true, out var ls)) return ls;
        }
        return IssueSeverity.Moderate;
    }

    private static IssuePriority MapPriority(string jiraPriority) => jiraPriority switch
    {
        "Highest" => IssuePriority.Critical,
        "High"    => IssuePriority.High,
        "Medium"  => IssuePriority.Medium,
        "Low"     => IssuePriority.Low,
        "Lowest"  => IssuePriority.Low,
        _         => IssuePriority.Medium
    };

    private static IssueCategory MapCategory(string? classification) => classification switch
    {
        "Hardware (HW)"   => IssueCategory.Hardware,
        "Firmware (FW)"   => IssueCategory.Firmware,
        "Mechanical (Mech)" => IssueCategory.Hardware,
        _                 => IssueCategory.Other
    };

    private static MeterType MapMeterType(string? val) => val switch
    {
        "Single phase Garud" => MeterType.SinglePhase,
        "LTCT Meter"         => MeterType.LTCT,
        _                    => MeterType.ThreePhase
    };

    private static CommType MapCommType(string? val) => val switch
    {
        "4G"  => CommType.LTE,
        "IMG" => CommType.NB_IoT,
        _     => CommType.RF
    };

    private static string StatusToLabel(IssueStatus s) => StatusLabelPrefix + s.ToString();
    private static string SeverityToLabel(IssueSeverity s) => SeverityLabelPrefix + s.ToString();

    private static string? GetStr(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private static string? GetCustomStr(JsonElement fields, string customField)
    {
        if (!fields.TryGetProperty(customField, out var v)) return null;
        if (v.ValueKind == JsonValueKind.String) return v.GetString();
        if (v.ValueKind == JsonValueKind.Object && v.TryGetProperty("value", out var val)) return val.GetString();
        return null;
    }

    private static List<string> GetLabels(JsonElement fields)
    {
        var result = new List<string>();
        if (fields.TryGetProperty("labels", out var labels) && labels.ValueKind == JsonValueKind.Array)
            foreach (var l in labels.EnumerateArray())
                if (l.GetString() is { } s) result.Add(s);
        return result;
    }

    private FieldIssue MapJiraToFieldIssue(JsonElement issue)
    {
        var key    = GetStr(issue, "key") ?? string.Empty;
        var id     = KeyToGuid(key);
        var fields = issue.GetProperty("fields");
        var labels = GetLabels(fields);

        var jiraStatus = fields.TryGetProperty("status", out var st)
            ? (GetStr(st, "name") ?? string.Empty) : string.Empty;
        var priorityName = fields.TryGetProperty("priority", out var p)
            ? (GetStr(p, "name") ?? "Medium") : "Medium";

        var summary       = GetCustomStr(fields, "customfield_11655") ?? GetStr(fields, "summary") ?? string.Empty;
        // Strip legacy "[FIT-xxx]" prefix if present in summary
        if (summary.StartsWith("[FIT-") && summary.Contains("] "))
            summary = summary[(summary.IndexOf("] ") + 2)..];

        var description   = GetCustomStr(fields, "customfield_11655") is {} s2 ? GetStr(fields, "summary") : null;
        // Pull description from ADF customfield_11657 or text description
        string? descriptionText = null;
        if (fields.TryGetProperty("customfield_11657", out var descEl))
        {
            if (descEl.ValueKind == JsonValueKind.Object)
            {
                // ADF: extract plain text from paragraphs
                descriptionText = ExtractAdfText(descEl);
            }
            else if (descEl.ValueKind == JsonValueKind.String)
            {
                descriptionText = descEl.GetString();
            }
        }
        if (string.IsNullOrWhiteSpace(descriptionText) && fields.TryGetProperty("description", out var rawDesc))
        {
            if (rawDesc.ValueKind == JsonValueKind.String)
                descriptionText = rawDesc.GetString();
            else if (rawDesc.ValueKind == JsonValueKind.Object)
                descriptionText = ExtractAdfText(rawDesc);
        }

        DateTime? createdAt = null, updatedAt = null;
        if (fields.TryGetProperty("created", out var createdEl) && DateTimeOffset.TryParse(createdEl.GetString(), out var cr))
            createdAt = cr.UtcDateTime;
        if (fields.TryGetProperty("updated", out var updatedEl) && DateTimeOffset.TryParse(updatedEl.GetString(), out var upd))
            updatedAt = upd.UtcDateTime;

        // Reporter GUID: use reporter accountId as a deterministic GUID
        var reporterAccountId = string.Empty;
        var reporterName = string.Empty;
        if (fields.TryGetProperty("reporter", out var reporter) && reporter.ValueKind == JsonValueKind.Object)
        {
            reporterAccountId = GetStr(reporter, "accountId") ?? string.Empty;
            reporterName      = GetStr(reporter, "displayName") ?? string.Empty;
        }
        var reporterGuid = DeterministicGuid(reporterAccountId);

        // Assignee — read live from Jira
        var assigneeAccountId = string.Empty;
        var assigneeName = string.Empty;
        if (fields.TryGetProperty("assignee", out var assigneeEl) && assigneeEl.ValueKind == JsonValueKind.Object)
        {
            assigneeAccountId = GetStr(assigneeEl, "accountId") ?? string.Empty;
            assigneeName      = GetStr(assigneeEl, "displayName") ?? string.Empty;
        }

        var status   = MapStatus(labels, jiraStatus);
        var severity = MapSeverity(labels);
        var priority = MapPriority(priorityName);
        var meterType = MapMeterType(GetCustomStr(fields, "customfield_11661"));
        var commType  = MapCommType(GetCustomStr(fields, "customfield_11662"));
        var category  = MapCategory(GetCustomStr(fields, "customfield_11663"));

        var result = FieldIssue.Reconstitute(
            id:                    id,
            issueNumber:           key,
            summary:               summary,
            description:           descriptionText,
            status:                status,
            priority:              priority,
            severity:              severity,
            category:              category,
            meterType:             meterType,
            meterSerial:           GetCustomStr(fields, "customfield_11650") ?? string.Empty,
            commType:              commType,
            reporterId:            reporterGuid,
            customerSiteAddress:   GetCustomStr(fields, "customfield_11651"),
            meterFirmwareVersion:  GetCustomStr(fields, "customfield_11652"),
            fieldObservations:     descriptionText,
            jiraKey:               key,
            jiraUrl:               $"{_baseUrl}/browse/{key}",
            createdAt:             createdAt,
            updatedAt:             updatedAt
        );

        // Attach assignee if present
        if (!string.IsNullOrEmpty(assigneeName))
        {
            var assigneeGuid = DeterministicGuid(assigneeAccountId);
            var assigneeUser = new User(
                firstName: assigneeName.Split(' ').FirstOrDefault() ?? assigneeName,
                lastName:  assigneeName.Split(' ').Skip(1).FirstOrDefault() ?? string.Empty,
                email:     string.Empty,
                passwordHash: string.Empty,
                role: UserRole.Developer);
            assigneeUser.SetId(assigneeGuid);
            var flags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
            typeof(FieldIssue).GetProperty("AssignedDeveloper", flags)?.SetValue(result, assigneeUser);
            typeof(FieldIssue).GetProperty("AssignedDeveloperId", flags)?.SetValue(result, (Guid?)assigneeGuid);
        }

        // Attach reporter as a User navigation property via the Reporter field
        var reporter2 = new User(
            firstName: reporterName.Split(' ').FirstOrDefault() ?? reporterName,
            lastName:  reporterName.Split(' ').Skip(1).FirstOrDefault() ?? string.Empty,
            email:     GetStr(fields.TryGetProperty("reporter", out var rp) ? rp : default, "emailAddress") ?? string.Empty,
            passwordHash: string.Empty,
            role: UserRole.FieldEngineer);
        reporter2.SetId(reporterGuid);
        SetReporter(result, reporter2);

        return result;
    }

    private static void SetReporter(FieldIssue issue, User reporter)
    {
        var flags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        typeof(FieldIssue).GetProperty("Reporter", flags)?.SetValue(issue, reporter);
    }

    private static string ExtractAdfText(JsonElement adf)
    {
        var sb = new System.Text.StringBuilder();
        WalkAdf(adf, sb);
        return sb.ToString().Trim();
    }

    // Recursively walk ADF nodes: emit text leaf nodes, add newline after block nodes
    private static void WalkAdf(JsonElement node, System.Text.StringBuilder sb)
    {
        var type = node.TryGetProperty("type", out var t) ? t.GetString() : null;

        if (type == "text")
        {
            if (node.TryGetProperty("text", out var txt))
                sb.Append(txt.GetString());
            return;
        }

        if (node.TryGetProperty("content", out var children))
        {
            foreach (var child in children.EnumerateArray())
                WalkAdf(child, sb);

            // Add newline after block-level nodes
            if (type is "paragraph" or "heading" or "bulletList" or "orderedList" or "listItem" or "blockquote" or "codeBlock")
                sb.Append('\n');
        }
    }

    private static Guid DeterministicGuid(string value)
    {
        if (string.IsNullOrEmpty(value)) return Guid.Empty;
        var hash = System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(value));
        return new Guid(hash);
    }

    // ── IFieldIssueRepository implementation ────────────────────────────────

    public async Task<FieldIssue?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var key = GuidToJiraKey(id);
        var issue = await _jira.GetIssueAsync(key, ct);
        return issue.HasValue ? MapJiraToFieldIssue(issue.Value) : null;
    }

    public async Task<FieldIssue?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default)
    {
        var key = GuidToJiraKey(id);
        var issueEl = await _jira.GetIssueAsync(key, ct);
        if (!issueEl.HasValue) return null;

        var issue = MapJiraToFieldIssue(issueEl.Value);

        // Attach attachments from Jira
        var jiraAttachments = await _jira.GetAttachmentsAsync(key, ct);
        foreach (var att in jiraAttachments)
        {
            var attId   = DeterministicGuid(GetStr(att, "id") ?? Guid.NewGuid().ToString());
            var attName = GetStr(att, "filename") ?? "file";
            var attMime = GetStr(att, "mimeType") ?? "application/octet-stream";
            var attUrl  = GetStr(att, "content") ?? string.Empty;
            var attSize = att.TryGetProperty("size", out var sz) ? sz.GetInt64() : 0L;
            var attAuthorEl = att.TryGetProperty("author", out var au) ? au : default;
            var attAuthorName = GetStr(attAuthorEl, "displayName") ?? "Unknown";
            var attAuthorId = DeterministicGuid(GetStr(attAuthorEl, "accountId") ?? attAuthorName);
            DateTime? attCreated = null;
            if (att.TryGetProperty("created", out var acEl) && DateTimeOffset.TryParse(acEl.GetString(), out var acd))
                attCreated = acd.UtcDateTime;

            var attachment = new Attachment(issue.Id, attAuthorId, attName, attName, attMime, attSize, attUrl, null);
            var attFlags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
            typeof(Attachment).GetProperty("Id", attFlags)?.SetValue(attachment, attId);
            if (attCreated.HasValue)
                typeof(Attachment).GetProperty("CreatedAt", attFlags)?.SetValue(attachment, attCreated.Value);
            issue.Attachments.Add(attachment);
        }

        // Attach comments
        var comments = await _jira.GetCommentsAsync(key, ct);
        foreach (var c in comments)
        {
            var fields = issueEl.Value.TryGetProperty("fields", out var f) ? f : default;
            var body = ExtractCommentBody(c);
            var authorEl = c.TryGetProperty("author", out var a) ? a : default;
            var authorName = GetStr(authorEl, "displayName") ?? "Unknown";
            var authorId = DeterministicGuid(GetStr(authorEl, "accountId") ?? authorName);
            DateTime? createdAt = null;
            if (c.TryGetProperty("created", out var cEl) && DateTimeOffset.TryParse(cEl.GetString(), out var cd))
                createdAt = cd.UtcDateTime;

            var author = new User(
                firstName: authorName.Split(' ').FirstOrDefault() ?? authorName,
                lastName: authorName.Split(' ').Skip(1).FirstOrDefault() ?? string.Empty,
                email: GetStr(authorEl, "emailAddress") ?? string.Empty,
                passwordHash: string.Empty,
                role: UserRole.FieldEngineer);
            author.SetId(authorId);

            var comment = new Comment(issue.Id, authorId, body);
            if (createdAt.HasValue) comment.SetCreatedAt(createdAt.Value);
            SetCommentAuthor(comment, author);
            issue.Comments.Add(comment);
        }

        return issue;
    }

    private static string ExtractCommentBody(JsonElement comment)
    {
        if (comment.TryGetProperty("body", out var body))
        {
            if (body.ValueKind == JsonValueKind.String) return body.GetString() ?? string.Empty;
            if (body.ValueKind == JsonValueKind.Object) return ExtractAdfText(body);
        }
        return string.Empty;
    }

    private static void SetCommentAuthor(Comment comment, User author)
    {
        var flags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance;
        typeof(Comment).GetProperty("Author", flags)?.SetValue(comment, author);
    }

    public async Task<(IEnumerable<FieldIssue> Items, int TotalCount)> GetAllAsync(FieldIssueFilter filter, CancellationToken ct = default)
    {
        var jql = BuildJql(filter);
        var (items, _) = await _jira.SearchIssuesAsync(jql, 0, filter.PageSize, ct);
        var issues = items.Select(MapJiraToFieldIssue).ToList();
        return (issues, issues.Count);
    }

    private string BuildJql(FieldIssueFilter filter)
    {
        var clauses = new List<string> { $"project = {_projectKey}" };

        if (filter.Status.HasValue)
        {
            // Map enum → Jira native workflow status names (comma-separated for IN clause)
            var jiraStatuses = filter.Status.Value switch
            {
                IssueStatus.Submitted   => new[] { "Issue Created", "Submitted" },
                IssueStatus.Approved    => new[] { "Approved" },
                IssueStatus.Development => new[] { "In Progress", "Development" },
                IssueStatus.Review      => new[] { "In Review", "Review" },
                IssueStatus.Validation  => new[] { "Validation" },
                IssueStatus.Closed      => new[] { "Done", "Closed" },
                IssueStatus.Rejected    => new[] { "Rejected" },
                _                       => new[] { filter.Status.Value.ToString() }
            };
            var inList = string.Join(", ", jiraStatuses.Select(s => $"\"{s}\""));
            clauses.Add($"status IN ({inList})");
        }
        if (filter.Priority.HasValue)
        {
            var p = filter.Priority.Value switch
            {
                IssuePriority.Critical => "Highest",
                IssuePriority.High     => "High",
                IssuePriority.Medium   => "Medium",
                IssuePriority.Low      => "Low",
                _                      => "Medium"
            };
            clauses.Add($"priority = \"{p}\"");
        }
        if (!string.IsNullOrEmpty(filter.Search))
            clauses.Add($"summary ~ \"{filter.Search}\" OR text ~ \"{filter.Search}\"");
        if (!string.IsNullOrEmpty(filter.MeterSerial))
            clauses.Add($"cf[11650] ~ \"{filter.MeterSerial}\"");
        if (!string.IsNullOrEmpty(filter.JiraKey))
            clauses.Add($"key = \"{filter.JiraKey}\"");

        return string.Join(" AND ", clauses) + " ORDER BY created DESC";
    }

    public async Task<IEnumerable<FieldIssue>> GetByReporterAsync(Guid reporterId, CancellationToken ct = default)
    {
        var (items, _) = await _jira.SearchIssuesAsync(
            $"project = {_projectKey} AND reporter = currentUser() ORDER BY created DESC",
            0, 50, ct);
        return items.Select(MapJiraToFieldIssue);
    }

    public async Task<IEnumerable<FieldIssue>> GetPendingApprovalAsync(CancellationToken ct = default)
    {
        // Issues with FIT_STATUS_Submitted label OR Jira native "Issue Created" status
        var (labelItems, _) = await _jira.SearchIssuesAsync(
            $"project = {_projectKey} AND labels = \"{StatusToLabel(IssueStatus.Submitted)}\" ORDER BY created DESC",
            0, 50, ct);
        if (labelItems.Count > 0) return labelItems.Select(MapJiraToFieldIssue);

        var (items, _) = await _jira.SearchIssuesAsync(
            $"project = {_projectKey} AND status = \"Issue Created\" ORDER BY created DESC",
            0, 50, ct);
        return items.Select(MapJiraToFieldIssue);
    }

    public Task<string> GenerateIssueNumberAsync(CancellationToken ct = default)
        => Task.FromResult("PENDING");

    public async Task<FieldIssue> CreateAsync(FieldIssue issue, CancellationToken ct = default)
    {
        // Creates the issue directly in Jira (not waiting for approval)
        var result = await _jira.CreateIssueAsync(issue, ct);
        if (!result.Success)
        {
            _log.LogError("Failed to create Jira issue: {Error}", result.ErrorMessage);
            throw new InvalidOperationException($"Failed to create issue in Jira: {result.ErrorMessage}");
        }

        var deterministicId = KeyToGuid(result.Key);
        issue.SetId(deterministicId);
        issue.SetIssueNumber(result.Key);
        issue.SetJiraDetails(result.Key, result.Url);

        // Tag with FIT labels: status + severity + original FIT GUID for lookup
        var labels = new List<string>
        {
            FitLabel,
            StatusToLabel(issue.Status),
            SeverityToLabel(issue.Severity)
        };
        await _jira.UpdateIssueFieldsAsync(result.Key, new Dictionary<string, object> { ["labels"] = labels }, ct);

        return issue;
    }

    public async Task UpdateAsync(FieldIssue issue, CancellationToken ct = default)
    {
        var key = issue.JiraKey;
        if (string.IsNullOrEmpty(key)) key = GuidToJiraKey(issue.Id);

        // Patch core Jira fields (summary + all custom fields)
        var coreFields = new Dictionary<string, object>
        {
            ["summary"] = issue.Summary ?? string.Empty,
        };
        if (!string.IsNullOrEmpty(issue.MeterSerial))
            coreFields["customfield_11650"] = issue.MeterSerial;
        if (!string.IsNullOrEmpty(issue.CustomerSiteAddress))
            coreFields["customfield_11651"] = issue.CustomerSiteAddress;
        if (!string.IsNullOrEmpty(issue.MeterFirmwareVersion))
            coreFields["customfield_11652"] = issue.MeterFirmwareVersion;
        if (!string.IsNullOrEmpty(issue.FieldObservations))
            coreFields["customfield_11657"] = new { version = 1, type = "doc", content = new[] { new { type = "paragraph", content = new[] { new { type = "text", text = issue.FieldObservations } } } } };
        if (issue.MeterType != MeterType.SinglePhase || issue.MeterType == MeterType.SinglePhase)
            coreFields["customfield_11661"] = new { value = issue.MeterType.ToString() };
        if (issue.CommType != CommType.None || issue.CommType == CommType.None)
            coreFields["customfield_11662"] = new { value = issue.CommType.ToString() };
        if (issue.Category != IssueCategory.Other || issue.Category == IssueCategory.Other)
            coreFields["customfield_11663"] = new { value = issue.Category.ToString() };
        await _jira.UpdateIssueFieldsAsync(key, coreFields, ct);

        // Rebuild labels to reflect current status + severity
        var currentIssue = await _jira.GetIssueAsync(key, ct);
        var existingLabels = currentIssue.HasValue
            ? GetLabels(currentIssue.Value.GetProperty("fields"))
              .Where(l => !l.StartsWith(StatusLabelPrefix) && !l.StartsWith(SeverityLabelPrefix))
              .ToList()
            : new List<string> { FitLabel };

        existingLabels.Add(StatusToLabel(issue.Status));
        existingLabels.Add(SeverityToLabel(issue.Severity));

        await _jira.UpdateIssueFieldsAsync(key, new Dictionary<string, object> { ["labels"] = existingLabels }, ct);

        // Try native Jira transition (best-effort — won't fail if transition unavailable)
        var jiraStatusName = issue.Status switch
        {
            IssueStatus.Development => "In Progress",
            IssueStatus.Closed      => "Done",
            IssueStatus.Rejected    => "Rejected",
            _                       => string.Empty
        };
        if (!string.IsNullOrEmpty(jiraStatusName))
            await _jira.UpdateStatusAsync(key, jiraStatusName, ct);

        // Post any comments that were added in this request (CreatedAt within the last 60 seconds)
        var threshold = DateTime.UtcNow.AddSeconds(-60);
        foreach (var comment in issue.Comments.Where(c => c.CreatedAt >= threshold))
            await _jira.AddCommentAsync(key, comment.Content, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        // Mark as cancelled in Jira rather than deleting
        var key = GuidToJiraKey(id);
        var currentIssue = await _jira.GetIssueAsync(key, ct);
        if (!currentIssue.HasValue) return;
        var labels = GetLabels(currentIssue.Value.GetProperty("fields"))
            .Where(l => !l.StartsWith(StatusLabelPrefix))
            .Append(StatusToLabel(IssueStatus.Cancelled))
            .ToList();
        await _jira.UpdateIssueFieldsAsync(key, new Dictionary<string, object> { ["labels"] = labels }, ct);
    }

    public async Task<int> CountByStatusAsync(IssueStatus status, CancellationToken ct = default)
    {
        // Try label-based first (new issues)
        var labelJql = $"project = {_projectKey} AND labels = \"{StatusToLabel(status)}\" ORDER BY created DESC";
        var (labelItems, _) = await _jira.SearchIssuesAsync(labelJql, 0, 100, ct);
        if (labelItems.Count > 0) return labelItems.Count;

        // Map FIT status to Jira native status for legacy/unlabelled issues
        var jiraStatus = status switch
        {
            IssueStatus.Closed      => "Done",
            IssueStatus.Development => "In Progress",
            IssueStatus.Submitted   => "Issue Created",
            IssueStatus.Approved    => "Approved",
            _                       => null
        };
        if (jiraStatus == null) return 0;
        var (items, _) = await _jira.SearchIssuesAsync(
            $"project = {_projectKey} AND status = \"{jiraStatus}\" ORDER BY created DESC", 0, 100, ct);
        return items.Count;
    }

    public async Task<IEnumerable<FieldIssue>> GetRecentAsync(int count, CancellationToken ct = default)
    {
        var (items, _) = await _jira.SearchIssuesAsync(
            $"project = {_projectKey} ORDER BY created DESC",
            0, count, ct);
        return items.Select(MapJiraToFieldIssue);
    }
}
