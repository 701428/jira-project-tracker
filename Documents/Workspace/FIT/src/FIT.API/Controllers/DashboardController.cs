using FIT.Domain.Enums;
using FIT.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FIT.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IFieldIssueRepository _issues;
    private readonly ICurrentUserService _currentUser;

    public DashboardController(IFieldIssueRepository issues, ICurrentUserService currentUser)
    {
        _issues = issues;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct = default)
    {
        var allIssues = await _issues.GetAllAsync(new FIT.Domain.Interfaces.FieldIssueFilter
        {
            Page = 1,
            PageSize = int.MaxValue
        }, ct);

        var items = allIssues.Items.ToList();
        var now = DateTime.UtcNow;

        var draft      = items.Count(x => x.Status == IssueStatus.Draft);
        var submitted  = items.Count(x => x.Status == IssueStatus.Submitted);
        var approved   = items.Count(x => x.Status == IssueStatus.Approved);
        var dev        = items.Count(x => x.Status == IssueStatus.Development);
        var review     = items.Count(x => x.Status == IssueStatus.Review);
        var validation = items.Count(x => x.Status == IssueStatus.Validation);
        var closed     = items.Count(x => x.Status == IssueStatus.Closed);

        static object IssueRow(FIT.Domain.Entities.FieldIssue x) => new
        {
            x.Id, x.IssueNumber, x.Summary, x.JiraKey,
            Status     = x.Status.ToString(),
            Priority   = x.Priority.ToString(),
            x.MeterSerial, x.CreatedAt,
            ReporterName = x.Reporter?.FullName ?? string.Empty
        };

        var recentIssues = items
            .OrderByDescending(x => x.CreatedAt).Take(10)
            .Select(IssueRow);

        var pendingApproval = items
            .Where(x => x.Status == IssueStatus.Submitted)
            .OrderBy(x => x.CreatedAt)
            .Select(IssueRow);

        var validationPendingList = items
            .Where(x => x.Status == IssueStatus.Validation)
            .OrderBy(x => x.CreatedAt)
            .Select(IssueRow);

        var currentUserId = _currentUser.UserId;
        var myIssues = currentUserId != Guid.Empty
            ? items.Where(x => x.ReporterId == currentUserId)
                   .OrderByDescending(x => x.CreatedAt).Take(10)
                   .Select(IssueRow)
            : Enumerable.Empty<object>();

        var statusBreakdown = new[]
        {
            new { status = "Draft",       count = draft },
            new { status = "Submitted",   count = submitted },
            new { status = "Approved",    count = approved },
            new { status = "Development", count = dev },
            new { status = "Review",      count = review },
            new { status = "Validation",  count = validation },
            new { status = "Closed",      count = closed },
        }.Where(x => x.count > 0);

        var priorityBreakdown = Enum.GetValues<IssuePriority>()
            .Select(p => new { priority = p.ToString(), count = items.Count(x => x.Priority == p) })
            .Where(x => x.count > 0);

        return Ok(new
        {
            kpis = new
            {
                total            = items.Count,
                open             = submitted + approved + dev,
                underReview      = review,
                validationPending = validation,
                closed,
                openThisWeek     = items.Count(x => x.CreatedAt >= now.AddDays(-7)),
                trends           = new { total = 0, open = 0, underReview = 0, validationPending = 0, closed = 0 }
            },
            statusBreakdown,
            priorityBreakdown,
            recentIssues,
            myIssues,
            pendingApproval,
            validationPending = validationPendingList
        });
    }
}
