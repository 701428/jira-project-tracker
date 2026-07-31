import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import { Typography, Box, Tooltip, Paper } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import SyncIcon from '@mui/icons-material/Sync';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FlagIcon from '@mui/icons-material/Flag';
import { formatDistanceToNow, parseISO } from 'date-fns';

export type ActivityAction = 'status_change' | 'comment' | 'attachment' | 'approval' | 'jira_sync' | 'edit' | 'assignment' | 'created' | string;

export interface ActivityLogEntry {
  id: string;
  actor_name: string;
  action: ActivityAction;
  description?: string;
  from_value?: string;
  to_value?: string;
  created_at: string;
}

interface ActionConfig {
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'grey' | 'inherit';
  label: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  status_change: { icon: <SwapHorizIcon sx={{ fontSize: 14 }} />, color: 'info', label: 'changed status' },
  comment: { icon: <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />, color: 'primary', label: 'commented' },
  attachment: { icon: <AttachFileIcon sx={{ fontSize: 14 }} />, color: 'secondary', label: 'added attachment' },
  approval: { icon: <HowToVoteIcon sx={{ fontSize: 14 }} />, color: 'success', label: 'took approval action' },
  jira_sync: { icon: <SyncIcon sx={{ fontSize: 14 }} />, color: 'warning', label: 'synced with Jira' },
  edit: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: 'grey', label: 'edited issue' },
  assignment: { icon: <PersonAddIcon sx={{ fontSize: 14 }} />, color: 'primary', label: 'assigned issue' },
  created: { icon: <FlagIcon sx={{ fontSize: 14 }} />, color: 'success', label: 'created issue' },
};

function getConfig(action: ActivityAction): ActionConfig {
  return ACTION_CONFIG[action] ?? { icon: <EditIcon sx={{ fontSize: 14 }} />, color: 'grey', label: action };
}

function buildDescription(entry: ActivityLogEntry): string {
  if (entry.description) return entry.description;
  const config = getConfig(entry.action);
  let text = config.label;
  if (entry.from_value && entry.to_value) text += `: "${entry.from_value}" → "${entry.to_value}"`;
  else if (entry.to_value) text += `: "${entry.to_value}"`;
  return text;
}

function formatDate(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
  catch { return iso; }
}

interface ActivityTimelineProps {
  entries: ActivityLogEntry[];
  maxItems?: number;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ entries, maxItems }) => {
  const visible = maxItems ? entries.slice(0, maxItems) : entries;

  if (!visible || visible.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No activity recorded yet.</Typography>;
  }

  return (
    <Timeline sx={{ p: 0, m: 0, '& .MuiTimelineItem-root': { minHeight: 'unset' }, '& .MuiTimelineItem-root:before': { display: 'none' } }}>
      {visible.map((entry, idx) => {
        const config = getConfig(entry.action);
        const isLast = idx === visible.length - 1;
        return (
          <TimelineItem key={entry.id}>
            <TimelineSeparator>
              <TimelineDot color={config.color} sx={{ m: 0.5, p: 0.5 }}>{config.icon}</TimelineDot>
              {!isLast && <TimelineConnector sx={{ minHeight: 20 }} />}
            </TimelineSeparator>
            <TimelineContent sx={{ py: 0.5, px: 1.5, pb: isLast ? 0 : 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1, bgcolor: 'background.default', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 0.5, mb: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.actor_name}</Typography>
                  <Typography variant="body2" color="text.secondary">{buildDescription(entry)}</Typography>
                  <Tooltip title={entry.created_at} placement="top">
                    <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(entry.created_at)}</Typography>
                  </Tooltip>
                </Box>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
};

export default ActivityTimeline;
