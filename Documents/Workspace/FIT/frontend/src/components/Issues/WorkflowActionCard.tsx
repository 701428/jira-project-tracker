import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Button,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SendIcon from '@mui/icons-material/Send';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import ConfirmDialog from './ConfirmDialog';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { issueApi } from '../../api/issueApi';

export type IssueStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'AwaitingInfo' | 'AssignedToDev' | 'InProgress' | 'PendingValidation' | 'Resolved' | 'Closed' | 'Rejected';

export interface Issue {
  id: string;
  status: IssueStatus;
  title: string;
}

interface WorkflowAction {
  label: string;
  description: string;
  icon: React.ReactNode;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'secondary';
  requiresNote?: boolean;
  notePlaceholder?: string;
  noteLabel?: string;
  variant?: 'contained' | 'outlined';
  color?: 'primary' | 'error' | 'warning' | 'success' | 'secondary' | 'inherit';
  handler: (note?: string) => void;
}

interface InlineFormState {
  actionKey: string;
  note: string;
}

interface WorkflowActionCardProps {
  issue: Issue;
  onSuccess?: () => void;
}

const WorkflowActionCard: React.FC<WorkflowActionCardProps> = ({ issue, onSuccess }) => {
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  const [confirmState, setConfirmState] = useState<{ open: boolean; action: WorkflowAction | null; note: string }>({ open: false, action: null, note: '' });
  const [inlineForm, setInlineForm] = useState<InlineFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ action, note }: { action: string; note?: string }) =>
      issueApi.performWorkflowAction(issue.id, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issue.id] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setConfirmState({ open: false, action: null, note: '' });
      setInlineForm(null);
      setError(null);
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message ?? 'Action failed. Please try again.');
      setConfirmState((prev) => ({ ...prev, open: false }));
    },
  });

  const getActions = (): WorkflowAction[] => {
    const { status } = issue;
    const role = user?.role ?? '';
    const actions: WorkflowAction[] = [];

    if (status === 'Draft' && permissions.canSubmit) {
      actions.push({ label: 'Submit for Review', description: 'Submit this issue to the team lead for review.', icon: <SendIcon />, color: 'primary', variant: 'contained', confirmColor: 'primary', handler: () => mutation.mutate({ action: 'submit' }) });
    }
    if (status === 'AwaitingInfo' && permissions.canProvideInfo) {
      actions.push({ label: 'Provide Additional Info', description: 'Add comments or attachments requested by the reviewer.', icon: <InfoIcon />, color: 'primary', variant: 'contained', requiresNote: true, notePlaceholder: 'Enter additional information...', noteLabel: 'Additional Information', handler: (note) => mutation.mutate({ action: 'provide_info', note }) });
    }
    if (status === 'Submitted' && permissions.canReview) {
      actions.push(
        { label: 'Start Review', description: 'Begin reviewing this issue.', icon: <PlayArrowIcon />, color: 'primary', variant: 'contained', handler: () => mutation.mutate({ action: 'start_review' }) },
        { label: 'Reject', description: 'Reject this issue as invalid or duplicate.', icon: <CancelIcon />, color: 'error', variant: 'outlined', confirmColor: 'error', requiresNote: true, notePlaceholder: 'Reason for rejection...', noteLabel: 'Rejection Reason', handler: (note) => mutation.mutate({ action: 'reject', note }) }
      );
    }
    if (status === 'UnderReview' && permissions.canReview) {
      actions.push(
        { label: 'Request More Info', description: 'Ask the reporter for additional information.', icon: <InfoIcon />, color: 'warning', variant: 'outlined', requiresNote: true, notePlaceholder: 'What information is needed?', noteLabel: 'Information Request', handler: (note) => mutation.mutate({ action: 'request_info', note }) },
        { label: 'Approve & Assign to Dev', description: 'Approve and assign to a developer for fixing.', icon: <CheckCircleIcon />, color: 'success', variant: 'contained', confirmColor: 'success', handler: () => mutation.mutate({ action: 'approve_assign' }) },
        { label: 'Reject', description: 'Reject this issue.', icon: <CancelIcon />, color: 'error', variant: 'outlined', confirmColor: 'error', requiresNote: true, notePlaceholder: 'Reason for rejection...', noteLabel: 'Rejection Reason', handler: (note) => mutation.mutate({ action: 'reject', note }) }
      );
    }
    if (status === 'AssignedToDev' && permissions.canDevelop) {
      actions.push({ label: 'Start Working', description: 'Mark this issue as in progress.', icon: <BuildIcon />, color: 'primary', variant: 'contained', handler: () => mutation.mutate({ action: 'start_dev' }) });
    }
    if (status === 'InProgress' && permissions.canDevelop) {
      actions.push({ label: 'Submit for Validation', description: 'Mark fix as complete and submit for field validation.', icon: <AssignmentTurnedInIcon />, color: 'success', variant: 'contained', confirmColor: 'success', requiresNote: true, notePlaceholder: 'Describe the fix applied...', noteLabel: 'Developer Fix Notes', handler: (note) => mutation.mutate({ action: 'submit_validation', note }) });
    }
    if (status === 'PendingValidation' && permissions.canValidate) {
      actions.push(
        { label: 'Mark as Resolved', description: 'Confirm the fix works in the field.', icon: <CheckCircleIcon />, color: 'success', variant: 'contained', confirmColor: 'success', requiresNote: true, notePlaceholder: 'Validation remarks...', noteLabel: 'Validation Remarks', handler: (note) => mutation.mutate({ action: 'resolve', note }) },
        { label: 'Fail Validation', description: 'The fix did not work — send back for rework.', icon: <CancelIcon />, color: 'error', variant: 'outlined', confirmColor: 'error', requiresNote: true, notePlaceholder: 'Describe what failed...', noteLabel: 'Failure Description', handler: (note) => mutation.mutate({ action: 'fail_validation', note }) }
      );
    }
    if (status === 'Resolved' && (role === 'Admin' || role === 'TeamLead')) {
      actions.push({ label: 'Close Issue', description: 'Mark this issue as closed.', icon: <SettingsIcon />, color: 'inherit', variant: 'outlined', handler: () => mutation.mutate({ action: 'close' }) });
    }
    return actions;
  };

  const actions = getActions();

  const handleActionClick = (action: WorkflowAction) => {
    if (action.requiresNote) setInlineForm({ actionKey: action.label, note: '' });
    else setConfirmState({ open: true, action, note: '' });
  };

  const handleInlineSubmit = (action: WorkflowAction) => {
    if (action.requiresNote && !inlineForm?.note.trim()) return;
    action.handler(inlineForm?.note ?? undefined);
  };

  if (actions.length === 0) return null;

  return (
    <Card variant="outlined">
      <CardHeader title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Actions</Typography>} sx={{ pb: 0 }} />
      <CardContent>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {actions.map((action, idx) => {
            const isInlineActive = inlineForm?.actionKey === action.label;
            return (
              <Box key={idx}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, borderRadius: 1, border: '1px solid', borderColor: isInlineActive ? 'primary.main' : 'divider', bgcolor: isInlineActive ? 'action.selected' : 'background.paper', transition: 'border-color 0.15s, background-color 0.15s' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{action.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{action.description}</Typography>
                    {isInlineActive && (
                      <Box sx={{ mt: 1.5 }}>
                        <TextField label={action.noteLabel ?? 'Note'} placeholder={action.notePlaceholder} multiline minRows={2} fullWidth size="small" value={inlineForm?.note ?? ''} onChange={(e) => setInlineForm((prev) => prev ? { ...prev, note: e.target.value } : null)} disabled={mutation.isPending} />
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Button size="small" variant="contained" color={action.confirmColor ?? 'primary'} disabled={mutation.isPending || (action.requiresNote && !inlineForm?.note.trim())} startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : action.icon} onClick={() => handleInlineSubmit(action)}>{action.label}</Button>
                          <Button size="small" variant="text" color="inherit" disabled={mutation.isPending} onClick={() => setInlineForm(null)}>Cancel</Button>
                        </Box>
                      </Box>
                    )}
                  </Box>
                  {!isInlineActive && (
                    <Button size="small" variant={action.variant ?? 'outlined'} color={action.color ?? 'primary'} disabled={mutation.isPending} startIcon={action.icon} onClick={() => handleActionClick(action)} sx={{ flexShrink: 0 }}>{action.label}</Button>
                  )}
                </Box>
                {idx < actions.length - 1 && <Divider sx={{ mt: 1 }} />}
              </Box>
            );
          })}
        </Box>
      </CardContent>
      <ConfirmDialog open={confirmState.open} title={confirmState.action?.label ?? ''} message={confirmState.action?.description ?? ''} confirmText={confirmState.action?.label} confirmColor={confirmState.action?.confirmColor ?? 'primary'} loading={mutation.isPending} onConfirm={() => { confirmState.action?.handler(confirmState.note || undefined); }} onCancel={() => setConfirmState({ open: false, action: null, note: '' })} />
    </Card>
  );
};

export default WorkflowActionCard;
