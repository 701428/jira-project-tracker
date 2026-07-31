import React from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useDashboard } from '../hooks/useIssues';

const DashboardPage: React.FC = () => {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load dashboard</Alert>;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Total issues: {data?.totalIssues ?? 0} | Open: {data?.openIssues ?? 0}
      </Typography>
    </Box>
  );
};

export default DashboardPage;
