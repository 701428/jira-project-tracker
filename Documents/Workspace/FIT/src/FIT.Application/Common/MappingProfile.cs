using AutoMapper;
using FIT.Application.DTOs;
using FIT.Domain.Entities;

namespace FIT.Application.Common;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<FieldIssue, IssueDto>()
            .ForMember(d => d.ReporterName, o => o.MapFrom(s => s.Reporter != null ? s.Reporter.FullName : string.Empty))
            .ForMember(d => d.ReporterEmail, o => o.MapFrom(s => s.Reporter != null ? s.Reporter.Email : string.Empty))
            .ForMember(d => d.AssignedDeveloperName, o => o.MapFrom(s => s.AssignedDeveloper != null ? s.AssignedDeveloper.FullName : null))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer != null ? s.Customer.Name : null))
            .ForMember(d => d.Approvals, o => o.MapFrom(s => s.Approvals))
            .ForMember(d => d.Attachments, o => o.MapFrom(s => s.Attachments))
            .ForMember(d => d.Comments, o => o.MapFrom(s => s.Comments))
            .ForMember(d => d.DeveloperNotes, o => o.MapFrom(s => s.DeveloperNotes))
            .ForMember(d => d.Validations, o => o.MapFrom(s => s.Validations));

        CreateMap<FieldIssue, IssueListDto>()
            .ForMember(d => d.ReporterName, o => o.MapFrom(s => s.Reporter != null ? s.Reporter.FullName : string.Empty))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer != null ? s.Customer.Name : null))
            .ForMember(d => d.AssignedDeveloperName, o => o.MapFrom(s => s.AssignedDeveloper != null ? s.AssignedDeveloper.FullName : null));

        CreateMap<Approval, ApprovalDto>()
            .ForMember(d => d.ReviewerName, o => o.MapFrom(s => s.Reviewer != null ? s.Reviewer.FullName : string.Empty));

        CreateMap<Comment, CommentDto>()
            .ForMember(d => d.AuthorName, o => o.MapFrom(s => s.Author != null ? s.Author.FullName : string.Empty));

        CreateMap<Attachment, AttachmentDto>()
            .ForMember(d => d.UploadedByName, o => o.MapFrom(s => s.UploadedBy != null ? s.UploadedBy.FullName : string.Empty));

        CreateMap<DeveloperNote, DeveloperNoteDto>()
            .ForMember(d => d.AuthorName, o => o.MapFrom(s => s.Author != null ? s.Author.FullName : string.Empty));

        CreateMap<Validation, ValidationDto>()
            .ForMember(d => d.ValidatorName, o => o.MapFrom(s => s.Validator != null ? s.Validator.FullName : string.Empty));

        CreateMap<ActivityLog, ActivityLogDto>()
            .ForMember(d => d.PerformedByName, o => o.MapFrom(s => s.PerformedBy != null ? s.PerformedBy.FullName : string.Empty));

        CreateMap<User, UserDto>();
    }
}
