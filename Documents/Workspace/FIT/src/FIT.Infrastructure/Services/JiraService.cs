using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FIT.Domain.Entities;
using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FIT.Infrastructure.Services;

public class JiraService : IJiraService
{
    private readonly HttpClient _http;
    private readonly ILogger<JiraService> _log;
    private readonly string _baseUrl;
    private readonly string _projectKey;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public JiraService(HttpClient http, IConfiguration config, ILogger<JiraService> log)
    {
        _http = http;
        _log = log;
        _baseUrl = config["Jira:BaseUrl"] ?? "https://grampower.atlassian.net";
        _projectKey = config["Jira:ProjectKey"] ?? "PTJGM";
        var email = config["Jira:Email"] ?? string.Empty;
        var token = config["Jira:ApiToken"] ?? string.Empty;
        if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(token))
        {
            var creds = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{email}:{token}"));
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", creds);
        }
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    private static readonly Dictionary<string, string> CheckboxLabels = new()
    {
        ["customfield_11665"] = "Photos Attached",
        ["customfield_11666"] = "Videos Attached",
        ["customfield_11667"] = "HES Screenshots Attached",
        ["customfield_11668"] = "Affected Meter — Block Load",
        ["customfield_11669"] = "Affected Meter — Daily Load",
        ["customfield_11670"] = "Affected Meter — Billing Information",
        ["customfield_11671"] = "Affected Meter — Event Logs",
        ["customfield_11672"] = "Affected Meter — Name Plate Details",
        ["customfield_11673"] = "Nearby Meter — Block Load",
        ["customfield_11674"] = "Nearby Meter — Daily Load",
        ["customfield_11675"] = "Nearby Meter — Billing Information",
        ["customfield_11676"] = "Nearby Meter — Event Logs",
        ["customfield_11677"] = "Nearby Meter — Name Plate Details",
    };

    private static object BuildDescription(FieldIssue issue)
    {
        static object Para(string text) => new { type = "paragraph", content = new[] { new { type = "text", text } } };
        static object Heading(string text, int level = 3) => new { type = "heading", attrs = new { level }, content = new[] { new { type = "text", text } } };
        static object BulletItem(string text) => new
        {
            type = "listItem",
            content = new[] { new { type = "paragraph", content = new[] { new { type = "text", text } } } }
        };
        static object BulletList(IEnumerable<object> items) => new { type = "bulletList", content = items };

        var rows = new List<object> { Heading("Field Issue Details") };

        void Add(string label, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
                rows.Add(Para($"{label}: {value}"));
        }

        Add("Category", issue.Category.ToString());
        Add("Priority", issue.Priority.ToString());
        Add("Severity", issue.Severity.ToString());
        Add("Meter Serial", issue.MeterSerial);
        Add("Meter Type", issue.MeterType.ToString());
        Add("Firmware Version", issue.MeterFirmwareVersion);
        Add("Comm Type", issue.CommType.ToString());
        Add("Customer Site", issue.CustomerSiteAddress);
        Add("Connected DCU ID", issue.ConnectedDcuId);
        Add("Nearby Meter - Connected DCU ID", issue.NearbyDcuId);

        if (!string.IsNullOrWhiteSpace(issue.Description))
        {
            rows.Add(Heading("Description"));
            rows.Add(Para(issue.Description));
        }
        if (!string.IsNullOrWhiteSpace(issue.FieldObservations))
        {
            rows.Add(Heading("Field Observations"));
            rows.Add(Para(issue.FieldObservations));
        }
        if (!string.IsNullOrWhiteSpace(issue.StepsToReproduce))
        {
            rows.Add(Heading("Steps to Reproduce"));
            rows.Add(Para(issue.StepsToReproduce));
        }
        if (!string.IsNullOrWhiteSpace(issue.ExpectedBehavior))
        {
            rows.Add(Heading("Expected Behavior"));
            rows.Add(Para(issue.ExpectedBehavior));
        }
        if (!string.IsNullOrWhiteSpace(issue.ActualBehavior))
        {
            rows.Add(Heading("Actual Behavior"));
            rows.Add(Para(issue.ActualBehavior));
        }

        // Render checked checkbox fields grouped by section
        if (issue.ExtraJiraFields is { Count: > 0 })
        {
            var attachmentKeys = new[] { "customfield_11665", "customfield_11666", "customfield_11667" };
            var affectedKeys   = new[] { "customfield_11668", "customfield_11669", "customfield_11670", "customfield_11671", "customfield_11672" };
            var nearbyKeys     = new[] { "customfield_11673", "customfield_11674", "customfield_11675", "customfield_11676", "customfield_11677" };

            void AddCheckedSection(string title, string[] keys)
            {
                var checked_ = keys
                    .Where(k => issue.ExtraJiraFields.ContainsKey(k))
                    .Select(k => CheckboxLabels.TryGetValue(k, out var lbl) ? lbl : k)
                    .ToList();
                if (checked_.Count == 0) return;
                rows.Add(Heading(title));
                rows.Add(BulletList(checked_.Select(lbl => BulletItem($"✓ {lbl}"))));
            }

            AddCheckedSection("Attachments Available", attachmentKeys);
            AddCheckedSection("Affected Meter Data Collected", affectedKeys);
            AddCheckedSection("Nearby Meter Data Collected", nearbyKeys);
        }

        // Reporter footer
        rows.Add(new { type = "rule" });  // horizontal divider
        rows.Add(Para($"Reported by: {issue.ReporterName ?? "Unknown"}"));

        return new { type = "doc", version = 1, content = rows };
    }

    public async Task<JiraIssueResult> CreateIssueAsync(FieldIssue issue, CancellationToken cancellationToken = default)
    {
        var priority = issue.Priority switch
        {
            IssuePriority.Critical => "Highest",
            IssuePriority.High => "High",
            IssuePriority.Medium => "Medium",
            IssuePriority.Low => "Low",
            _ => "Medium"
        };

        var meterType = issue.MeterType switch
        {
            MeterType.SinglePhase => "Single phase Garud",
            MeterType.ThreePhase  => "Three phase",
            MeterType.LTCT        => "LTCT Meter",
            _                     => "Three phase"
        };

        var commType = issue.CommType switch
        {
            CommType.RF      => "RF",
            CommType.GPRS    => "4G",
            CommType.LTE     => "4G",
            CommType.NB_IoT  => "4G",
            _                => "RF"
        };

        var classification = issue.Category switch
        {
            IssueCategory.Firmware      => "Firmware (FW)",
            IssueCategory.Hardware      => "Hardware (HW)",
            IssueCategory.Communication => "Hardware (HW)",
            _                           => "Software (SW)"
        };

        var fields = new Dictionary<string, object>
        {
            ["project"]            = new { key = _projectKey },
            ["summary"]            = issue.Summary,
            ["description"]        = BuildDescription(issue),
            ["issuetype"]          = new { name = issue.JiraIssueType },
            ["priority"]           = new { name = priority },
            ["labels"]             = new[] { "FIT", issue.Severity.ToString() },
            ["customfield_11650"]  = issue.MeterSerial ?? "N/A",
            ["customfield_11651"]  = issue.CustomerSiteAddress ?? "N/A",
            ["customfield_11652"]  = issue.MeterFirmwareVersion ?? "N/A",
            ["customfield_11655"]  = issue.Summary,
            ["customfield_11657"]  = new { type = "doc", version = 1, content = new[] { new { type = "paragraph", content = new[] { new { type = "text", text = issue.Description ?? issue.FieldObservations ?? issue.Summary } } } } },
            ["customfield_11661"]  = new { value = meterType },
            ["customfield_11662"]  = new { value = commType },
            ["customfield_11663"]  = new { value = classification }
        };

        if (!string.IsNullOrWhiteSpace(issue.ConnectedDcuId))
            fields["customfield_11653"] = issue.ConnectedDcuId;
        if (!string.IsNullOrWhiteSpace(issue.NearbyDcuId))
            fields["customfield_11656"] = issue.NearbyDcuId;

        if (issue.ExtraJiraFields != null)
            foreach (var kv in issue.ExtraJiraFields)
                fields[kv.Key] = kv.Value;

        var body = new { fields };

        try
        {
            var json = JsonSerializer.Serialize(body, new JsonSerializerOptions { PropertyNamingPolicy = null });
            var resp = await _http.PostAsync($"{_baseUrl}/rest/api/3/issue",
                new StringContent(json, Encoding.UTF8, "application/json"), cancellationToken);

            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(cancellationToken);
                _log.LogWarning("Jira create failed: {Status} {Error}", resp.StatusCode, err);
                return new JiraIssueResult { Success = false, ErrorMessage = err };
            }

            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);

            var key = result.GetProperty("key").GetString() ?? string.Empty;
            var id = result.GetProperty("id").GetString() ?? string.Empty;
            return new JiraIssueResult { Success = true, Key = key, Id = id, Url = $"{_baseUrl}/browse/{key}" };
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Jira CreateIssue failed");
            return new JiraIssueResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task UpdateStatusAsync(string jiraKey, string status, CancellationToken cancellationToken = default)
    {
        try
        {
            var transResp = await _http.GetAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}/transitions", cancellationToken);
            if (!transResp.IsSuccessStatusCode) return;
            var transitions = await JsonSerializer.DeserializeAsync<JsonElement>(
                await transResp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);

            string? transId = null;
            foreach (var t in transitions.GetProperty("transitions").EnumerateArray())
            {
                if (t.GetProperty("name").GetString()?.Contains(status, StringComparison.OrdinalIgnoreCase) == true)
                {
                    transId = t.GetProperty("id").GetString();
                    break;
                }
            }

            if (transId == null) return;
            var body = JsonSerializer.Serialize(new { transition = new { id = transId } }, JsonOpts);
            await _http.PostAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}/transitions",
                new StringContent(body, Encoding.UTF8, "application/json"), cancellationToken);
        }
        catch (Exception ex) { _log.LogWarning(ex, "Jira UpdateStatus failed for {Key}", jiraKey); }
    }

    public async Task AddCommentAsync(string jiraKey, string comment, CancellationToken cancellationToken = default)
    {
        try
        {
            var body = new
            {
                body = new { type = "doc", version = 1, content = new[] { new { type = "paragraph", content = new[] { new { type = "text", text = comment } } } } }
            };
            var json = JsonSerializer.Serialize(body, JsonOpts);
            var resp = await _http.PostAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}/comment",
                new StringContent(json, Encoding.UTF8, "application/json"), cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(cancellationToken);
                _log.LogWarning("Jira AddComment returned {Status} for {Key}: {Error}", resp.StatusCode, jiraKey, err);
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "Jira AddComment failed for {Key}", jiraKey); }
    }

    public async Task<string> GetStatusAsync(string jiraKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}?fields=status", cancellationToken);
            if (!resp.IsSuccessStatusCode) return string.Empty;
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            return result.GetProperty("fields").GetProperty("status").GetProperty("name").GetString() ?? string.Empty;
        }
        catch { return string.Empty; }
    }

    public async Task<JsonElement?> GetIssueAsync(string jiraKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}?expand=names,renderedFields", cancellationToken);
            if (!resp.IsSuccessStatusCode) return null;
            return await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetIssue failed for {Key}", jiraKey); return null; }
    }

    public async Task<(List<JsonElement> Items, int Total)> SearchIssuesAsync(string jql, int startAt, int maxResults, CancellationToken cancellationToken = default)
    {
        try
        {
            var encodedJql = Uri.EscapeDataString(jql);
            var clampedMax = Math.Min(maxResults, 200);
            var url = $"{_baseUrl}/rest/api/3/search/jql?jql={encodedJql}&maxResults={clampedMax}&fields=%2Aall";
            var resp = await _http.GetAsync(url, cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(cancellationToken);
                _log.LogWarning("SearchIssues failed {Status}: {Error}", resp.StatusCode, err);
                return (new(), 0);
            }
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var items = new List<JsonElement>();
            if (result.TryGetProperty("issues", out var issuesEl))
                foreach (var item in issuesEl.EnumerateArray())
                    items.Add(item.Clone());
            // New API uses cursor pagination — estimate total from items + isLast flag
            var isLast = result.TryGetProperty("isLast", out var il) && il.GetBoolean();
            var total = isLast ? items.Count : items.Count + maxResults; // approximate
            return (items, total);
        }
        catch (Exception ex) { _log.LogWarning(ex, "SearchIssues failed for JQL: {Jql}", jql); return (new(), 0); }
    }

    public async Task UpdateIssueFieldsAsync(string jiraKey, Dictionary<string, object> fields, CancellationToken cancellationToken = default)
    {
        try
        {
            var body = JsonSerializer.Serialize(new { fields }, new JsonSerializerOptions { PropertyNamingPolicy = null });
            var resp = await _http.SendAsync(new HttpRequestMessage(HttpMethod.Put, $"{_baseUrl}/rest/api/3/issue/{jiraKey}")
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            }, cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(cancellationToken);
                _log.LogWarning("UpdateIssueFields failed for {Key}: {Status} {Error}", jiraKey, resp.StatusCode, err);
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "UpdateIssueFields failed for {Key}", jiraKey); }
    }

    public async Task<List<JsonElement>> GetCommentsAsync(string jiraKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}/comment", cancellationToken);
            if (!resp.IsSuccessStatusCode) return new();
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var items = new List<JsonElement>();
            if (result.TryGetProperty("comments", out var commentsEl))
                foreach (var c in commentsEl.EnumerateArray())
                    items.Add(c.Clone());
            return items;
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetComments failed for {Key}", jiraKey); return new(); }
    }

    public async Task<List<JsonElement>> GetTransitionsForIssueAsync(string jiraKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}/transitions", cancellationToken);
            if (!resp.IsSuccessStatusCode) return new();
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var items = new List<JsonElement>();
            if (result.TryGetProperty("transitions", out var arr))
                foreach (var t in arr.EnumerateArray())
                    items.Add(t.Clone());
            return items;
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetTransitions failed for {Key}", jiraKey); return new(); }
    }

    public async Task ExecuteTransitionAsync(string jiraKey, string transitionId, CancellationToken cancellationToken = default)
    {
        try
        {
            var body = JsonSerializer.Serialize(new { transition = new { id = transitionId } }, JsonOpts);
            var resp = await _http.PostAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}/transitions",
                new StringContent(body, Encoding.UTF8, "application/json"), cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(cancellationToken);
                _log.LogWarning("ExecuteTransition failed for {Key} tid={TId}: {Err}", jiraKey, transitionId, err);
            }
        }
        catch (Exception ex) { _log.LogWarning(ex, "ExecuteTransition failed for {Key}", jiraKey); }
    }

    public async Task<JsonElement?> AddAttachmentAsync(string jiraKey, Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        try
        {
            using var form = new MultipartFormDataContent();
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            form.Add(fileContent, "file", fileName);

            // Jira requires this header to allow attachment uploads
            var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/rest/api/3/issue/{jiraKey}/attachments")
            {
                Content = form
            };
            req.Headers.Add("X-Atlassian-Token", "no-check");

            var resp = await _http.SendAsync(req, cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync(cancellationToken);
                _log.LogWarning("AddAttachment failed for {Key}: {Status} {Error}", jiraKey, resp.StatusCode, err);
                return null;
            }
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            // Jira returns an array; return first element
            if (result.ValueKind == JsonValueKind.Array && result.GetArrayLength() > 0)
                return result[0].Clone();
            return result.Clone();
        }
        catch (Exception ex) { _log.LogError(ex, "AddAttachment failed for {Key}", jiraKey); return null; }
    }

    public async Task<List<JsonElement>> GetAttachmentsAsync(string jiraKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync($"{_baseUrl}/rest/api/3/issue/{jiraKey}?fields=attachment", cancellationToken);
            if (!resp.IsSuccessStatusCode) return new();
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var items = new List<JsonElement>();
            if (result.TryGetProperty("fields", out var f) && f.TryGetProperty("attachment", out var arr))
                foreach (var a in arr.EnumerateArray())
                    items.Add(a.Clone());
            return items;
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetAttachments failed for {Key}", jiraKey); return new(); }
    }

    public async Task<JsonElement?> GetCreateMetaFieldsAsync(string projectKey, string issueTypeId, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync(
                $"{_baseUrl}/rest/api/3/issue/createmeta/{projectKey}/issuetypes/{issueTypeId}", cancellationToken);
            if (!resp.IsSuccessStatusCode) return null;
            return await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetCreateMetaFields failed"); return null; }
    }

    public async Task<List<JsonElement>> GetIssueTypesAsync(string projectKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync(
                $"{_baseUrl}/rest/api/3/issue/createmeta/{projectKey}/issuetypes", cancellationToken);
            if (!resp.IsSuccessStatusCode) return new();
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var items = new List<JsonElement>();
            if (result.TryGetProperty("issueTypes", out var arr))
                foreach (var t in arr.EnumerateArray())
                    if (!(t.TryGetProperty("subtask", out var st) && st.GetBoolean()))
                        items.Add(t.Clone());
            return items;
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetIssueTypes failed"); return new(); }
    }

    public async Task<List<JsonElement>> GetPrioritiesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var resp = await _http.GetAsync($"{_baseUrl}/rest/api/3/priority", cancellationToken);
            if (!resp.IsSuccessStatusCode) return new();
            var result = await JsonSerializer.DeserializeAsync<JsonElement>(
                await resp.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            var items = new List<JsonElement>();
            foreach (var p in result.EnumerateArray()) items.Add(p.Clone());
            return items;
        }
        catch (Exception ex) { _log.LogWarning(ex, "GetPriorities failed"); return new(); }
    }
}
