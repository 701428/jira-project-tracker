using FIT.Domain.Enums;

namespace FIT.Application.DTOs;

public class ValidationDto
{
    public Guid Id { get; set; }
    public Guid FieldIssueId { get; set; }
    public Guid ValidatorId { get; set; }
    public string ValidatorName { get; set; } = string.Empty;
    public ValidationResult Result { get; set; }
    public string ResultDisplay => Result.ToString();
    public string? Notes { get; set; }
    public string? TestEnvironment { get; set; }
    public string? FirmwareVersionTested { get; set; }
    public DateTime ValidatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
