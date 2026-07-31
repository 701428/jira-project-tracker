using FIT.Domain.Enums;

namespace FIT.Domain.Interfaces;

public interface ICurrentUserService
{
    Guid UserId { get; }
    string UserEmail { get; }
    string UserName { get; }
    UserRole Role { get; }
    bool IsAuthenticated { get; }
}
