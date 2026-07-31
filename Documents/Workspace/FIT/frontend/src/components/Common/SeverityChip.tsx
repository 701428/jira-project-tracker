import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export type IssueSeverity = 'Critical' | 'Major' | 'Minor' | 'Trivial';

const SEVERITY_CONFIG: Record<IssueSeverity, { color: ChipProps['color']; label: string }> = {
  Critical: { color: 'error', label: 'Critical' },
  Major: { color: 'warning', label: 'Major' },
  Minor: { color: 'info', label: 'Minor' },
  Trivial: { color: 'default', label: 'Trivial' },
};

interface SeverityChipProps {
  severity: IssueSeverity | string;
  size?: ChipProps['size'];
}

const SeverityChip: React.FC<SeverityChipProps> = ({ severity, size = 'small' }) => {
  const config = SEVERITY_CONFIG[severity as IssueSeverity] ?? {
    color: 'default' as const,
    label: severity,
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

export default SeverityChip;
