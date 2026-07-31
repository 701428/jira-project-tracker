import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  Avatar,
  Typography,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { formatDistanceToNow, parseISO } from 'date-fns';

export type ApprovalDecision = 'Approved' | 'Rejected' | 'PendingInfo' | 'Pending';

export interface ApprovalRecord {
  id: string;
  approver_name: string;
  approver_role?: string;
  decision: ApprovalDecision;
  comments?: string;
  created_at: string;
  step?: string;
}

interface DecisionConfig {
  label: string;
  color: 'success' | 'error' | 'warning' | 'default';
  icon: React.ReactNode;
}

const DECISION_CONFIG: Record<ApprovalDecision, DecisionConfig> = {
  Approved: { label: 'Approved', color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  Rejected: { label: 'Rejected', color: 'error', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  PendingInfo: { label: 'Pending Info', color: 'warning', icon: <InfoIcon sx={{ fontSize: 14 }} /> },
  Pending: { label: 'Pending', color: 'default', icon: null },
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

interface ApprovalHistoryCardProps {
  records: ApprovalRecord[];
  title?: string;
}

const ApprovalHistoryCard: React.FC<ApprovalHistoryCardProps> = ({ records, title = 'Approval History' }) => {
  if (!records || records.length === 0) return null;

  return (
    <Card variant="outlined">
      <CardHeader
        avatar={<HowToVoteIcon color="action" />}
        title={<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>}
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1 }}>
        {records.map((record, idx) => {
          const config = DECISION_CONFIG[record.decision] ?? DECISION_CONFIG.Pending;
          return (
            <React.Fragment key={record.id}>
              {idx > 0 && <Divider sx={{ my: 1.5 }} />}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: 'primary.main', flexShrink: 0, mt: 0.25 }}>
                  {getInitials(record.approver_name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{record.approver_name}</Typography>
                    {record.approver_role && <Typography variant="caption" color="text.secondary">({record.approver_role})</Typography>}
                    {record.step && <Typography variant="caption" color="text.secondary">· {record.step}</Typography>}
                    <Chip label={config.label} color={config.color} size="small" icon={config.icon as React.ReactElement} sx={{ fontWeight: 700, height: 22, '& .MuiChip-label': { px: 0.75 } }} />
                    <Tooltip title={record.created_at}>
                      <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>{formatDate(record.created_at)}</Typography>
                    </Tooltip>
                  </Box>
                  {record.comments && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, pl: 0.5, borderLeft: '3px solid', borderColor: 'divider', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
                      {record.comments}
                    </Typography>
                  )}
                </Box>
              </Box>
            </React.Fragment>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ApprovalHistoryCard;
