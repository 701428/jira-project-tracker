import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useIssue } from '../hooks/useIssues';

interface IssueFormPageProps {
  editMode?: boolean;
}

const IssueFormPage: React.FC<IssueFormPageProps> = ({ editMode = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: issue, isLoading, error } = useIssue(id ?? '');

  if (editMode && isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (editMode && error) {
    return <Alert severity="error">Failed to load issue</Alert>;
  }

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        {editMode ? `Edit Issue ${issue?.issueNumber ?? ''}` : 'New Issue'}
      </Typography>
      {/* Form implementation goes here */}
      <Typography variant="body2" color="text.secondary">
        {editMode ? 'Edit mode' : 'Create mode'}
      </Typography>
    </Box>
  );
};

export default IssueFormPage;
