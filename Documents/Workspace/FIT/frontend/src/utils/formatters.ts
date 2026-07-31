import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { IssuePriority, IssueSeverity } from '../types';

export const formatDate = (
  dateStr: string | undefined | null,
  pattern = 'dd MMM yyyy, HH:mm'
): string => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr;
  }
};

export const formatDateShort = (dateStr: string | undefined | null): string =>
  formatDate(dateStr, 'dd MMM yyyy');

export const formatRelative = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
};

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getPriorityColor = (
  priority: IssuePriority
): 'error' | 'warning' | 'info' | 'default' => {
  switch (priority) {
    case IssuePriority.CRITICAL:
      return 'error';
    case IssuePriority.HIGH:
      return 'warning';
    case IssuePriority.MEDIUM:
      return 'info';
    case IssuePriority.LOW:
    default:
      return 'default';
  }
};

export const getPriorityHex = (priority: IssuePriority): string => {
  switch (priority) {
    case IssuePriority.CRITICAL:
      return '#DE350B';
    case IssuePriority.HIGH:
      return '#FF8B00';
    case IssuePriority.MEDIUM:
      return '#0052CC';
    case IssuePriority.LOW:
    default:
      return '#6B778C';
  }
};

export const getSeverityColor = (
  severity: IssueSeverity
): 'error' | 'warning' | 'info' | 'default' => {
  switch (severity) {
    case IssueSeverity.CRITICAL:
      return 'error';
    case IssueSeverity.MAJOR:
      return 'warning';
    case IssueSeverity.MODERATE:
      return 'info';
    case IssueSeverity.MINOR:
    default:
      return 'default';
  }
};

export const getSeverityHex = (severity: IssueSeverity): string => {
  switch (severity) {
    case IssueSeverity.CRITICAL:
      return '#DE350B';
    case IssueSeverity.MAJOR:
      return '#FF5630';
    case IssueSeverity.MODERATE:
      return '#FF8B00';
    case IssueSeverity.MINOR:
    default:
      return '#36B37E';
  }
};

export const formatIssueNumber = (num: string): string =>
  num.startsWith('FIT-') ? num : `FIT-${num}`;

export const truncate = (str: string, maxLen = 100): string =>
  str.length <= maxLen ? str : `${str.slice(0, maxLen)}…`;

export const formatDateTime = formatDate;
