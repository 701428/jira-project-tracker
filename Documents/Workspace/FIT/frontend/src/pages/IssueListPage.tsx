import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useIssues } from '../hooks/useIssues';
import type { IssueListParams } from '../api/issues';

const IssueListPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useState<IssueListParams>({ page: 1, pageSize: 25 });
  const { data, isLoading, error } = useIssues(params);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load issues</Alert>;
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Issues
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/issues/new')}
        >
          New Issue
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {data?.total ?? 0} issues found
      </Typography>
    </Box>
  );
};

export default IssueListPage;
