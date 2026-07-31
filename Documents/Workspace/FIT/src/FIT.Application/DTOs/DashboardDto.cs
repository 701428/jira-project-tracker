namespace FIT.Application.DTOs;

public class DashboardDto
{
    public int Total { get; set; }
    public int Open { get; set; }
    public int Submitted { get; set; }
    public int Approved { get; set; }
    public int InDevelopment { get; set; }
    public int InReview { get; set; }
    public int InValidation { get; set; }
    public int Closed { get; set; }
    public int Rejected { get; set; }
    public List<IssueListDto> RecentIssues { get; set; } = new();
    public Dictionary<string, int> IssuesByCategory { get; set; } = new();
    public Dictionary<string, int> IssuesByPriority { get; set; } = new();
}
