import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export type IssuePriority = 'Critical' | 'High' | 'Medium' | 'Low';

const PRIORITY_CONFIG: Record<IssuePriority, { color: ChipProps['color']; label: string }> = {
  Critical: { color: 'error', label: 'Critical' },
  High: { color: 'warning', label: 'High' },
  Medium: { color: 'info', label: 'Medium' },
  Low: { color: 'default', label: 'Low' },
};

interface PriorityChipProps {
  priority: IssuePriority | string;
  size?: ChipProps['size'];
}

const PriorityChip: React.FC<PriorityChipProps> = ({ priority, size = 'small' }) => {
  const config = PRIORITY_CONFIG[priority as IssuePriority] ?? {
    color: 'default' as const,
    label: priority,
  };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{ fontWeight: 600 }}
    />
  );
};

export default PriorityChip;
