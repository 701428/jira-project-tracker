import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import { Edit, ArrowBack } from '@mui/icons-material';
import { useIssue } from '../hooks/useIssues';
import { usePermissions } from '../hooks/usePermissions';
import { STATUS_CONFIG } from '../utils/statusConfig';
import { formatDate, formatRelative } from '../utils/formatters';

const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: issue, isLoading, error } = useIssue(id ?? '');
  const { canEdit } = usePermissions();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !issue) {
    return <Alert severity="error">Failed to load issue</Alert>;
  }

  const statusCfg = STATUS_CONFIG[issue.status];

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/issues')}
          size="small"
        >
          Back
        </Button>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            {issue.issueNumber}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {issue.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Reported {formatRelative(issue.reportedAt)} by {issue.reportedBy.name}
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Chip
            label={statusCfg.label}
            color={statusCfg.color}
            size="small"
          />
          {canEdit(issue) && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/issues/${id}/edit`)}
              size="small"
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>

      <Typography variant="body1">{issue.description}</Typography>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        Last updated: {formatDate(issue.updatedAt)}
      </Typography>
    </Box>
  );
};

export default IssueDetailPage;
