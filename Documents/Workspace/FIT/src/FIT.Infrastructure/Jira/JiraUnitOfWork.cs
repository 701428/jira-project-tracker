using FIT.Domain.Interfaces;

namespace FIT.Infrastructure.Jira;

/// <summary>
/// Unit of work backed entirely by Jira. SaveChanges and transactions are no-ops
/// because Jira writes happen immediately in repository methods.
/// </summary>
public class JiraUnitOfWork : IUnitOfWork
{
    public IFieldIssueRepository FieldIssues { get; }
    public IUserRepository Users { get; }

    public JiraUnitOfWork(IFieldIssueRepository fieldIssues, IUserRepository users)
    {
        FieldIssues = fieldIssues;
        Users       = users;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(0);

    public Task BeginTransactionAsync(CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task CommitTransactionAsync(CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public void Dispose() { }
}
