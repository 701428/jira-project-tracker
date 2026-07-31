import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import * as issuesApi from '../api/issues';
import type {
  IFieldIssue,
  IIssueList,
  ICreateIssue,
  IComment,
  IAttachment,
  IDashboard,
  IUser,
  ValidationResult,
} from '../types';

export const ISSUES_KEY = 'issues';
export const ISSUE_KEY = 'issue';
export const DASHBOARD_KEY = 'dashboard';
export const USERS_KEY = 'users';

export const useIssues = (
  params?: issuesApi.IssueListParams
): UseQueryResult<{ issues: IIssueList[]; total: number }> => {
  return useQuery({
    queryKey: [ISSUES_KEY, params],
    queryFn: () => issuesApi.getIssues(params),
  });
};

export const useIssue = (id: string): UseQueryResult<IFieldIssue> => {
  return useQuery({
    queryKey: [ISSUE_KEY, id],
    queryFn: () => issuesApi.getIssue(id),
    enabled: !!id,
  });
};

export const useDashboard = (): UseQueryResult<IDashboard> => {
  return useQuery({
    queryKey: [DASHBOARD_KEY],
    queryFn: issuesApi.getDashboard,
    staleTime: 60_000,
  });
};

export const useUsers = (role?: import('../types').UserRole): UseQueryResult<IUser[]> => {
  return useQuery({
    queryKey: [USERS_KEY, role],
    queryFn: () => issuesApi.getUsers(role),
  });
};

const useInvalidateIssue = (id?: string) => {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [ISSUES_KEY] });
    qc.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
    if (id) qc.invalidateQueries({ queryKey: [ISSUE_KEY, id] });
  };
};

export const useCreateIssue = (): UseMutationResult<IFieldIssue, Error, ICreateIssue> => {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: issuesApi.createIssue,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ISSUES_KEY] });
      enqueueSnackbar('Issue created successfully', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to create issue', { variant: 'error' }),
  });
};

export const useUpdateIssue = (
  id: string
): UseMutationResult<IFieldIssue, Error, Partial<ICreateIssue>> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (data) => issuesApi.updateIssue(id, data),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Issue updated successfully', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to update issue', { variant: 'error' }),
  });
};

export const useSubmitIssue = (id: string): UseMutationResult<void, Error, void> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: () => issuesApi.submitIssue(id),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Issue submitted for approval', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to submit issue', { variant: 'error' }),
  });
};

export const useApproveIssue = (
  id: string
): UseMutationResult<void, Error, string> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (comments) => issuesApi.approveIssue(id, comments),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Issue approved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to approve issue', { variant: 'error' }),
  });
};

export const useRejectIssue = (
  id: string
): UseMutationResult<void, Error, string> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (comments) => issuesApi.rejectIssue(id, comments),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Issue rejected', { variant: 'warning' });
    },
    onError: () => enqueueSnackbar('Failed to reject issue', { variant: 'error' }),
  });
};

export const useAssignDeveloper = (
  id: string
): UseMutationResult<void, Error, string> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (developerId) => issuesApi.assignDeveloper(id, developerId),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Developer assigned', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to assign developer', { variant: 'error' }),
  });
};

export const useUpdateDeveloperNote = (
  id: string
): UseMutationResult<void, Error, issuesApi.DeveloperNoteData> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (data) => issuesApi.updateDeveloperNote(id, data),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Developer note saved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to save developer note', { variant: 'error' }),
  });
};

export const useMoveToReview = (id: string): UseMutationResult<void, Error, void> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: () => issuesApi.moveToReview(id),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Issue moved to review', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to move issue to review', { variant: 'error' }),
  });
};

export const useApproveReview = (
  id: string
): UseMutationResult<void, Error, string> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (comments) => issuesApi.approveReview(id, comments),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Review approved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to approve review', { variant: 'error' }),
  });
};

export const useRejectReview = (
  id: string
): UseMutationResult<void, Error, string> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: (comments) => issuesApi.rejectReview(id, comments),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Review rejected', { variant: 'warning' });
    },
    onError: () => enqueueSnackbar('Failed to reject review', { variant: 'error' }),
  });
};

export const useSubmitValidation = (
  id: string
): UseMutationResult<void, Error, { result: ValidationResult; remarks: string }> => {
  const { enqueueSnackbar } = useSnackbar();
  const invalidate = useInvalidateIssue(id);
  return useMutation({
    mutationFn: ({ result, remarks }) =>
      issuesApi.submitValidation(id, result, remarks),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar('Validation submitted', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to submit validation', { variant: 'error' }),
  });
};

export const useAddComment = (
  id: string
): UseMutationResult<IComment, Error, string> => {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => issuesApi.addComment(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ISSUE_KEY, id] });
    },
    onError: () => enqueueSnackbar('Failed to add comment', { variant: 'error' }),
  });
};

export const useUploadAttachment = (
  id: string
): UseMutationResult<IAttachment, Error, File> => {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => issuesApi.uploadAttachment(id, file),
    onSuccess: () => {
      // Give Jira ~1.5s to index the new attachment before refetching
      setTimeout(() => qc.invalidateQueries({ queryKey: [ISSUE_KEY, id] }), 1500);
      enqueueSnackbar('Attachment uploaded', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to upload attachment', { variant: 'error' }),
  });
};

export const useJiraTransitions = (id: string) => {
  return useQuery({
    queryKey: [ISSUE_KEY, id, 'transitions'],
    queryFn: async () => {
      const { data } = await issuesApi.apiClient.get<any[]>(`/issues/${id}/transitions`);
      return data ?? [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useExecuteTransition = (id: string) => {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transitionId, comment }: { transitionId: string; comment?: string }) =>
      issuesApi.apiClient.post(`/issues/${id}/transition`, { transitionId, comment }),
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: [ISSUE_KEY, id] });
        qc.invalidateQueries({ queryKey: [ISSUE_KEY, id, 'transitions'] });
      }, 1000);
      enqueueSnackbar('Status updated', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to update status', { variant: 'error' }),
  });
};

// Aliases for pages that import these names
export const useIssueDetail = useIssue;
export const useIssueTransition = useSubmitIssue;
