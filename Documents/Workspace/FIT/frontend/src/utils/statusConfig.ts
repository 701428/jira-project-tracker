import {
  HourglassEmpty,
  Send,
  CheckCircle,
  Cancel,
  PersonAdd,
  Build,
  RateReview,
  Verified,
  Replay,
  FactCheck,
  TaskAlt,
  DoDisturbOff,
} from '@mui/icons-material';
import type { SvgIconComponent } from '@mui/icons-material';
import { IssueStatus } from '../types';

interface StatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  muiColor: string;
  icon: SvgIconComponent;
  description: string;
}

export const STATUS_CONFIG: Record<IssueStatus, StatusConfig> = {
  [IssueStatus.DRAFT]: {
    label: 'Draft',
    color: 'default',
    muiColor: '#6B778C',
    icon: HourglassEmpty,
    description: 'Issue is being drafted',
  },
  [IssueStatus.SUBMITTED]: {
    label: 'Submitted',
    color: 'info',
    muiColor: '#0052CC',
    icon: Send,
    description: 'Awaiting approval',
  },
  [IssueStatus.APPROVED]: {
    label: 'Approved',
    color: 'primary',
    muiColor: '#0065FF',
    icon: CheckCircle,
    description: 'Approved, pending developer assignment',
  },
  [IssueStatus.REJECTED]: {
    label: 'Rejected',
    color: 'error',
    muiColor: '#DE350B',
    icon: Cancel,
    description: 'Issue rejected by approver',
  },
  [IssueStatus.ASSIGNED]: {
    label: 'Assigned',
    color: 'secondary',
    muiColor: '#6554C0',
    icon: PersonAdd,
    description: 'Developer assigned',
  },
  [IssueStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'warning',
    muiColor: '#FF8B00',
    icon: Build,
    description: 'Developer is working on the issue',
  },
  [IssueStatus.PENDING_REVIEW]: {
    label: 'Pending Review',
    color: 'info',
    muiColor: '#00B8D9',
    icon: RateReview,
    description: 'Awaiting technical review',
  },
  [IssueStatus.REVIEW_APPROVED]: {
    label: 'Review Approved',
    color: 'success',
    muiColor: '#00875A',
    icon: Verified,
    description: 'Review passed, pending field validation',
  },
  [IssueStatus.REVIEW_REJECTED]: {
    label: 'Review Rejected',
    color: 'error',
    muiColor: '#FF5630',
    icon: Replay,
    description: 'Review failed, needs rework',
  },
  [IssueStatus.PENDING_VALIDATION]: {
    label: 'Pending Validation',
    color: 'warning',
    muiColor: '#FF8B00',
    icon: FactCheck,
    description: 'Awaiting field validation',
  },
  [IssueStatus.VALIDATED]: {
    label: 'Validated',
    color: 'success',
    muiColor: '#00875A',
    icon: TaskAlt,
    description: 'Field validation completed',
  },
  [IssueStatus.CLOSED]: {
    label: 'Closed',
    color: 'success',
    muiColor: '#36B37E',
    icon: CheckCircle,
    description: 'Issue fully resolved and closed',
  },
  [IssueStatus.CANCELLED]: {
    label: 'Cancelled',
    color: 'default',
    muiColor: '#97A0AF',
    icon: DoDisturbOff,
    description: 'Issue cancelled',
  },
};

export const getStatusConfig = (status: IssueStatus): StatusConfig =>
  STATUS_CONFIG[status];
