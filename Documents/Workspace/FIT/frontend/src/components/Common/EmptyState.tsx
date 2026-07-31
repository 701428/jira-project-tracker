import React from 'react';
import { Box, Typography, SvgIconProps } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactElement<SvgIconProps>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 10,
        px: 4,
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
        }}
      >
        {React.cloneElement(icon, {
          sx: { fontSize: 40, color: 'text.disabled', ...(icon.props.sx ?? {}) },
        })}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          {subtitle}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
};

export default EmptyState;
