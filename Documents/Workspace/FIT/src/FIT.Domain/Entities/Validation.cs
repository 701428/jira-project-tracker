using FIT.Domain.Common;
using FIT.Domain.Enums;

namespace FIT.Domain.Entities;

public class Validation : BaseEntity
{
    public Guid FieldIssueId { get; private set; }
    public Guid ValidatorId { get; private set; }
    public ValidationResult Result { get; private set; }
    public string? Notes { get; private set; }
    public string? TestEnvironment { get; private set; }
    public string? FirmwareVersionTested { get; private set; }
    public DateTime ValidatedAt { get; private set; }

    // Navigation
    public FieldIssue FieldIssue { get; private set; } = null!;
    public User Validator { get; private set; } = null!;

    protected Validation() { }

    public Validation(Guid fieldIssueId, Guid validatorId, ValidationResult result, string? notes = null, string? testEnvironment = null, string? firmwareVersionTested = null)
    {
        FieldIssueId = fieldIssueId;
        ValidatorId = validatorId;
        Result = result;
        Notes = notes;
        TestEnvironment = testEnvironment;
        FirmwareVersionTested = firmwareVersionTested;
        ValidatedAt = DateTime.UtcNow;
    }
}
