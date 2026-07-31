using FIT.Domain.Common;

namespace FIT.Domain.Entities;

public class Customer : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? ContactPerson { get; private set; }
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? State { get; private set; }
    public string? Country { get; private set; }
    public bool IsActive { get; private set; } = true;

    // Navigation
    public ICollection<FieldIssue> Issues { get; private set; } = new List<FieldIssue>();

    protected Customer() { }

    public Customer(string name, string? contactPerson = null, string? email = null, string? phone = null, string? address = null)
    {
        Name = name;
        ContactPerson = contactPerson;
        Email = email;
        Phone = phone;
        Address = address;
    }

    public void Update(string name, string? contactPerson, string? email, string? phone, string? address, string? city, string? state, string? country)
    {
        Name = name;
        ContactPerson = contactPerson;
        Email = email;
        Phone = phone;
        Address = address;
        City = city;
        State = state;
        Country = country;
        UpdatedAt = DateTime.UtcNow;
    }
}
