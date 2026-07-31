using FIT.Domain.Common;
using FIT.Domain.Enums;

namespace FIT.Domain.Entities;

public class User : BaseEntity
{
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string? PhoneNumber { get; private set; }
    public string? Department { get; private set; }
    public DateTime? LastLoginAt { get; private set; }

    public string FullName => $"{FirstName} {LastName}";

    // Navigation
    public ICollection<FieldIssue> ReportedIssues { get; private set; } = new List<FieldIssue>();
    public ICollection<FieldIssue> AssignedIssues { get; private set; } = new List<FieldIssue>();
    public ICollection<Approval> Approvals { get; private set; } = new List<Approval>();
    public ICollection<Comment> Comments { get; private set; } = new List<Comment>();

    protected User() { }

    public User(string firstName, string lastName, string email, string passwordHash, UserRole role)
    {
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        PasswordHash = passwordHash;
        Role = role;
    }

    public void UpdateProfile(string firstName, string lastName, string? phoneNumber, string? department)
    {
        FirstName = firstName;
        LastName = lastName;
        PhoneNumber = phoneNumber;
        Department = department;
        UpdatedAt = DateTime.UtcNow;
    }

    public void RecordLogin()
    {
        LastLoginAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetId(Guid id) => Id = id;
}
