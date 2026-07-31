import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export type IssueStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'AwaitingInfo'
  | 'AssignedToDev'
  | 'InProgress'
  | 'PendingValidation'
  | 'Resolved'
  | 'Closed'
  | 'Rejected';

interface StatusConfig {
  label: string;
  color: ChipProps['color'];
  variant?: ChipProps['variant'];
  sx?: ChipProps['sx'];
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  // Enum names from backend
  Draft: { label: 'Draft', color: 'default' },
  Submitted: { label: 'Submitted', color: 'info' },
  UnderReview: { label: 'Under Review', color: 'warning' },
  AwaitingInfo: { label: 'Awaiting Info', color: 'warning' },
  AssignedToDev: { label: 'Assigned to Dev', color: 'primary' },
  InProgress: { label: 'In Progress', color: 'primary' },
  PendingValidation: { label: 'Pending Validation', color: 'secondary' },
  Resolved: { label: 'Resolved', color: 'success' },
  Closed: { label: 'Closed', color: 'default' },
  Rejected: { label: 'Rejected', color: 'error' },
  // Live Jira status names
  'Issue Created': { label: 'Submitted', color: 'info' },
  'In Progress': { label: 'In Progress', color: 'primary' },
  Development: { label: 'Development', color: 'primary' },
  'In Review': { label: 'In Review', color: 'warning' },
  Review: { label: 'In Review', color: 'warning' },
  Approved: { label: 'Approved', color: 'success' },
  Validation: { label: 'Validation', color: 'secondary' },
  Done: { label: 'Done', color: 'success' },
  'To Do': { label: 'To Do', color: 'default' },
};

interface StatusChipProps {
  status: IssueStatus | string;
  size?: ChipProps['size'];
}

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const config = STATUS_CONFIG[status as IssueStatus] ?? { label: status, color: 'default' as const };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 600, ...config.sx }}
    />
  );
};

export default StatusChip;
