import { useCurrentUser } from './useAuth';
import { IssueStatus, UserRole, type IFieldIssue } from '../types';

export const usePermissions = () => {
  const user = useCurrentUser();
  const role = user?.role;

  const canApprove = (): boolean =>
    role === UserRole.APPROVER || role === UserRole.ADMIN;

  const canAssign = (): boolean =>
    role === UserRole.APPROVER || role === UserRole.ADMIN;

  const canDevelop = (): boolean =>
    role === UserRole.DEVELOPER || role === UserRole.ADMIN;

  const canReview = (): boolean =>
    role === UserRole.REVIEWER || role === UserRole.ADMIN;

  const canValidate = (): boolean =>
    role === UserRole.VALIDATOR || role === UserRole.ADMIN;

  const canEdit = (issue: IFieldIssue): boolean => {
    if (!user) return false;
    if (role === UserRole.ADMIN) return true;
    const editableStatuses = [IssueStatus.DRAFT, IssueStatus.REJECTED];
    return (
      role === UserRole.FIELD_ENGINEER &&
      issue.reportedBy.id === user.id &&
      editableStatuses.includes(issue.status)
    );
  };

  const canSubmit = (issue: IFieldIssue): boolean => {
    if (!user) return false;
    if (role === UserRole.ADMIN) return true;
    return (
      role === UserRole.FIELD_ENGINEER &&
      issue.reportedBy.id === user.id &&
      issue.status === IssueStatus.DRAFT
    );
  };

  const canAddComment = (): boolean => !!user;

  const canUploadAttachment = (): boolean => !!user;

  return {
    canApprove,
    canAssign,
    canDevelop,
    canReview,
    canValidate,
    canEdit,
    canSubmit,
    canAddComment,
    canUploadAttachment,
    role,
    user,
  };
};
