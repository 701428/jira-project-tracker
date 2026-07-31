import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';

export const IssueListRowSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, idx) => (
        <Box
          key={idx}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1.5,
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 8 }} />
          <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 8 }} />
          <Skeleton variant="text" width={100} height={20} sx={{ ml: 'auto' }} />
        </Box>
      ))}
    </Box>
  );
};

export const IssueDetailSkeleton: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={36} />
          <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={100} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton variant="rounded" width={90} height={28} sx={{ borderRadius: 8 }} />
        <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 8 }} />
        <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 8 }} />
      </Box>
      {[1, 2].map((i) => (
        <Card key={i} variant="outlined">
          <CardContent>
            <Skeleton variant="text" width="25%" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="75%" />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const LoadingSkeleton: React.FC<{ variant?: 'list' | 'detail'; rows?: number }> = ({
  variant = 'list',
  rows,
}) => {
  if (variant === 'detail') return <IssueDetailSkeleton />;
  return <IssueListRowSkeleton rows={rows} />;
};

export default LoadingSkeleton;
