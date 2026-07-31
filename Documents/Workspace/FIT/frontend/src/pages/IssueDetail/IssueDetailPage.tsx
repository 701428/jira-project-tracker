import React, { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from '@mui/lab';
import {
  ArrowBack,
  AttachFile,
  CheckCircle,
  Cancel,
  Download,
  Edit,
  Link as LinkIcon,
  NavigateNext,
  Person,
  PlayArrow,
  Send,
  ThumbDown,
  ThumbUp,
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import StatusChip from '../../components/StatusChip';
import PriorityChip from '../../components/PriorityChip';
import { useAuth } from '../../hooks/useAuth';
import {
  useIssueDetail,
  useAddComment,
  useUploadAttachment,
  useJiraTransitions,
  useExecuteTransition,
} from '../../hooks/useIssues';
import { formatDate, formatDateTime } from '../../utils/formatters';

type UserRole = 'FieldEngineer' | 'TeamLead' | 'Developer' | 'Reviewer' | 'ValidationEngineer' | 'Admin';

interface TransitionAction {
  label: string;
  targetStatus: string;
  color: 'primary' | 'success' | 'error' | 'warning' | 'info';
  icon: React.ReactNode;
  requiresNote?: boolean;
  noteLabel?: string;
}

const getTransitions = (status: string, role: UserRole): TransitionAction[] => {
  const map: Record<string, Partial<Record<UserRole, TransitionAction[]>>> = {
    Draft: {
      FieldEngineer: [
        { label: 'Submit for Review', targetStatus: 'ReviewPending', color: 'primary', icon: <Send /> },
      ],
      Admin: [
        { label: 'Submit for Review', targetStatus: 'ReviewPending', color: 'primary', icon: <Send /> },
      ],
    },
    Submitted: {
      TeamLead: [
        { label: 'Approve', targetStatus: 'Approved', color: 'success', icon: <ThumbUp /> },
        { label: 'Reject', targetStatus: 'Rejected', color: 'error', icon: <ThumbDown />, requiresNote: true, noteLabel: 'Rejection reason' },
      ],
      Admin: [
        { label: 'Approve', targetStatus: 'Approved', color: 'success', icon: <ThumbUp /> },
        { label: 'Reject', targetStatus: 'Rejected', color: 'error', icon: <ThumbDown />, requiresNote: true, noteLabel: 'Rejection reason' },
      ],
    },
    ReviewPending: {
      TeamLead: [
        { label: 'Approve', targetStatus: 'Approved', color: 'success', icon: <ThumbUp /> },
        { label: 'Reject', targetStatus: 'Rejected', color: 'error', icon: <ThumbDown />, requiresNote: true, noteLabel: 'Rejection reason' },
      ],
      Admin: [
        { label: 'Approve', targetStatus: 'Approved', color: 'success', icon: <ThumbUp /> },
        { label: 'Reject', targetStatus: 'Rejected', color: 'error', icon: <ThumbDown />, requiresNote: true, noteLabel: 'Rejection reason' },
      ],
    },
    Approved: {
      TeamLead: [
        { label: 'Assign to Development', targetStatus: 'Development', color: 'info', icon: <PlayArrow /> },
      ],
      Admin: [
        { label: 'Assign to Development', targetStatus: 'Development', color: 'info', icon: <PlayArrow /> },
      ],
    },
    Development: {
      Developer: [
        { label: 'Move to Review', targetStatus: 'Review', color: 'primary', icon: <NavigateNext />, requiresNote: true, noteLabel: 'Developer note / fix description' },
      ],
      Admin: [
        { label: 'Move to Review', targetStatus: 'Review', color: 'primary', icon: <NavigateNext />, requiresNote: true, noteLabel: 'Developer note / fix description' },
      ],
    },
    Review: {
      Reviewer: [
        { label: 'Approve Fix', targetStatus: 'ValidationPending', color: 'success', icon: <CheckCircle /> },
        { label: 'Reject Fix', targetStatus: 'Development', color: 'error', icon: <Cancel />, requiresNote: true, noteLabel: 'Rejection reason' },
      ],
      Admin: [
        { label: 'Approve Fix', targetStatus: 'ValidationPending', color: 'success', icon: <CheckCircle /> },
        { label: 'Reject Fix', targetStatus: 'Development', color: 'error', icon: <Cancel />, requiresNote: true, noteLabel: 'Rejection reason' },
      ],
    },
    ValidationPending: {
      ValidationEngineer: [
        { label: 'Mark Pass', targetStatus: 'Closed', color: 'success', icon: <CheckCircle />, requiresNote: true, noteLabel: 'Validation remarks' },
        { label: 'Mark Fail', targetStatus: 'Development', color: 'error', icon: <Cancel />, requiresNote: true, noteLabel: 'Failure reason' },
      ],
      Admin: [
        { label: 'Mark Pass', targetStatus: 'Closed', color: 'success', icon: <CheckCircle />, requiresNote: true, noteLabel: 'Validation remarks' },
        { label: 'Mark Fail', targetStatus: 'Development', color: 'error', icon: <Cancel />, requiresNote: true, noteLabel: 'Failure reason' },
      ],
    },
  };
  return map[status]?.[role] ?? [];
};

const InfoGrid: React.FC<{ fields: [string, string | undefined | null][] }> = ({ fields }) => (
  <Grid container spacing={1.5}>
    {fields.map(([label, value]) => (
      <Grid item xs={12} sm={6} key={label}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value || '—'}
        </Typography>
      </Grid>
    ))}
  </Grid>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
    <CardContent>
      <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1.5}>
        {title.toUpperCase()}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

interface TransitionDialogProps {
  open: boolean;
  action: TransitionAction | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
  loading?: boolean;
}

const TransitionDialog: React.FC<TransitionDialogProps> = ({
  open, action, onClose, onConfirm, loading,
}) => {
  const [note, setNote] = useState('');

  React.useEffect(() => {
    if (open) setNote('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{action?.label}</DialogTitle>
      <DialogContent>
        {action?.requiresNote && (
          <TextField
            autoFocus
            label={action.noteLabel ?? 'Note'}
            multiline
            rows={3}
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 1 }}
            required
          />
        )}
        {!action?.requiresNote && (
          <Typography>
            Are you sure you want to transition to <strong>{action?.targetStatus}</strong>?
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          color={action?.color ?? 'primary'}
          disabled={loading || (action?.requiresNote && !note.trim())}
          onClick={() => onConfirm(note)}
          startIcon={loading ? <CircularProgress size={16} /> : action?.icon}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [commentTab, setCommentTab] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [pendingTransition, setPendingTransition] = useState<{ id: string; name: string } | null>(null);
  const [transitionComment, setTransitionComment] = useState('');

  const { data: issue, isLoading } = useIssueDetail(id ?? '');
  const { data: jiraTransitions = [] } = useJiraTransitions(id ?? '');
  const executeTransition = useExecuteTransition(id ?? '');
  const addComment = useAddComment(id ?? '');
  const uploadAttachment = useUploadAttachment(id ?? '');

  const handleTransitionClick = (t: { id: string; name: string }) => {
    setPendingTransition(t);
    setTransitionComment('');
  };

  const handleTransitionConfirm = async () => {
    if (!pendingTransition) return;
    await executeTransition.mutateAsync({ transitionId: pendingTransition.id, comment: transitionComment || undefined });
    setPendingTransition(null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync(newComment);
    setNewComment('');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!issue) {
    return <Alert severity="error">Issue not found.</Alert>;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <IconButton size="small" onClick={() => navigate('/issues')}>
          <ArrowBack />
        </IconButton>
        <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
          <Link component={RouterLink} to="/issues" underline="hover" color="inherit" variant="body2">
            Issues
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {issue.issueNumber}
          </Typography>
        </Breadcrumbs>
      </Stack>


      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={2} sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
                mb={1}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <StatusChip status={issue.statusDisplay ?? issue.status} />
                  <PriorityChip priority={issue.priority} />
                  <Chip label={issue.category} size="small" variant="outlined" />
                  {issue.severity && (
                    <Chip label={issue.severity} size="small" variant="outlined" color="warning" />
                  )}
                </Stack>
                <Stack direction="row" spacing={1}>
                  {issue.jiraUrl && (
                    <Tooltip title="Open in Jira">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LinkIcon />}
                        href={issue.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {issue.jiraKey ?? 'Jira'}
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip title="Edit Issue">
                    <IconButton size="small" onClick={() => navigate(`/issues/${id}/edit`)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Typography variant="h6" fontWeight={600} mb={0.5}>
                {issue.summary ?? issue.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {issue.issueNumber} · Created {formatDateTime(issue.createdAt)}
              </Typography>
            </CardContent>
          </Card>

          <SectionCard title="Description">
            <Typography variant="body2" whiteSpace="pre-wrap">
              {issue.fieldObservations ?? issue.description ?? '—'}
            </Typography>
          </SectionCard>

          {(issue.expectedBehavior || issue.actualBehavior) && (
            <SectionCard title="Expected vs Actual Behaviour">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="success.main" fontWeight={600} display="block" mb={0.5}>
                    EXPECTED
                  </Typography>
                  <Typography variant="body2" whiteSpace="pre-wrap">{issue.expectedBehavior ?? '—'}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="error.main" fontWeight={600} display="block" mb={0.5}>
                    ACTUAL
                  </Typography>
                  <Typography variant="body2" whiteSpace="pre-wrap">{issue.actualBehavior ?? '—'}</Typography>
                </Grid>
              </Grid>
            </SectionCard>
          )}

          {issue.stepsToReproduce && (
            <SectionCard title="Steps to Reproduce">
              <Typography variant="body2" whiteSpace="pre-wrap">{issue.stepsToReproduce}</Typography>
            </SectionCard>
          )}

          <SectionCard title="Meter Details">
            <InfoGrid
              fields={[
                ['Meter Type', issue.meterTypeDisplay],
                ['Serial Number', issue.meterSerial ?? issue.meterSerialNumber],
                ['Firmware Version', issue.meterFirmwareVersion ?? issue.firmwareVersion],
                ['Hardware Version', issue.hardwareRevision],
                ['Communication Type', issue.commTypeDisplay],
                ['Site / Location', issue.customerSiteAddress ?? issue.siteLocation],
              ]}
            />
          </SectionCard>

          <SectionCard title="Reporter Details">
            <InfoGrid
              fields={[
                ['Reporter Name', issue.reporterName ?? issue.reportedBy?.name],
                ['Email', issue.reporterEmail],
                ['Customer', issue.customerName],
                ['Site Name', issue.siteName],
              ]}
            />
          </SectionCard>

          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <Tabs
              value={commentTab}
              onChange={(_, v) => setCommentTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label={`Comments (${issue.comments?.length ?? 0})`} />
              <Tab label={`Evidence (${issue.attachments?.length ?? 0})`} />
              <Tab label="Activity" />
            </Tabs>

            <Box sx={{ p: 2 }}>
              {commentTab === 0 && (
                <Box>
                  <List disablePadding>
                    {(issue.comments ?? []).map((c: any) => (
                      <ListItem key={c.id} alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                            {c.authorName?.[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle2" fontSize={13}>
                                {c.authorName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(c.createdAt)}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Typography variant="body2" mt={0.5} whiteSpace="pre-wrap">
                              {c.content ?? c.body}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>

                  {(issue.comments ?? []).length > 0 && <Divider sx={{ my: 2 }} />}

                  <Stack spacing={1}>
                    <TextField
                      label="Add a comment"
                      multiline
                      rows={3}
                      fullWidth
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      size="small"
                    />
                    <Box textAlign="right">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Send />}
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addComment.isPending}
                      >
                        Post Comment
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              )}

              {commentTab === 1 && (
                <Box>
                  {/* Upload drop zone */}
                  <Box
                    component="label"
                    htmlFor="evidence-upload"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      mb: 2,
                      cursor: uploadAttachment.isPending ? 'wait' : 'pointer',
                      bgcolor: 'action.hover',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.selected' },
                      transition: 'all 0.2s',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) uploadAttachment.mutate(file);
                    }}
                  >
                    <input
                      id="evidence-upload"
                      type="file"
                      hidden
                      accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAttachment.mutate(file);
                        e.target.value = '';
                      }}
                    />
                    {uploadAttachment.isPending ? (
                      <CircularProgress size={28} />
                    ) : (
                      <AttachFile sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {uploadAttachment.isPending ? 'Uploading…' : 'Click or drag a file to attach evidence'}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Images, PDFs, Office files — uploaded directly to Jira
                    </Typography>
                  </Box>

                  {/* File grid */}
                  <Grid container spacing={2}>
                    {(issue.attachments ?? []).length === 0 && !uploadAttachment.isPending && (
                      <Grid item xs={12}>
                        <Typography color="text.secondary" variant="body2">
                          No attachments yet
                        </Typography>
                      </Grid>
                    )}
                    {(issue.attachments ?? []).map((att: any) => (
                      <Grid item xs={12} sm={6} md={4} key={att.id}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          {att.contentType?.startsWith('image/') ? (
                            <Box
                              component="img"
                              src={att.storagePath ?? att.url}
                              sx={{ width: '100%', height: 120, objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              sx={{
                                height: 80,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'action.hover',
                              }}
                            >
                              <AttachFile sx={{ fontSize: 36, color: 'text.secondary' }} />
                            </Box>
                          )}
                          <CardContent sx={{ p: 1.5 }}>
                            <Tooltip title={att.originalFileName ?? att.fileName}>
                              <Typography variant="caption" noWrap display="block" fontWeight={500}>
                                {att.originalFileName ?? att.fileName}
                              </Typography>
                            </Tooltip>
                            <Typography variant="caption" color="text.secondary">
                              {att.uploadedByName} · {formatDate(att.createdAt)}
                            </Typography>
                            <Box mt={0.5}>
                              <Button
                                size="small"
                                startIcon={<Download />}
                                href={att.storagePath ?? att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                fullWidth
                              >
                                Download
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {commentTab === 2 && (
                <Timeline position="right" sx={{ p: 0, m: 0 }}>
                  {(issue.activityLog ?? []).map((entry: any, i: number) => (
                    <TimelineItem key={i}>
                      <TimelineOppositeContent
                        sx={{ flex: 0.3, fontSize: 11, color: 'text.secondary', pt: 1.5 }}
                      >
                        {formatDateTime(entry.timestamp)}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot
                          color={
                            entry.action === 'created' ? 'primary' :
                            entry.action === 'status_changed' ? 'secondary' :
                            entry.action === 'comment_added' ? 'info' : 'grey'
                          }
                          variant="outlined"
                          sx={{ my: 1 }}
                        />
                        {i < (issue.activityLog?.length ?? 0) - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ pt: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {entry.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.actorName} ({entry.actorRole})
                        </Typography>
                        {entry.note && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{
                              mt: 0.5,
                              p: 1,
                              bgcolor: 'action.hover',
                              borderRadius: 1,
                              fontStyle: 'italic',
                            }}
                          >
                            "{entry.note}"
                          </Typography>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Status Workflow
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Typography variant="body2" color="text.secondary">Current:</Typography>
                <StatusChip status={issue.statusDisplay ?? issue.status} />
              </Stack>

              {jiraTransitions.length > 0 ? (
                <Stack spacing={1}>
                  {jiraTransitions.map((t: any) => (
                    <Button
                      key={t.id}
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => handleTransitionClick({ id: t.id, name: t.name })}
                    >
                      {t.name}
                    </Button>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No transitions available.
                </Typography>
              )}
            </CardContent>
          </Card>

          {issue.jiraKey && (
            <Card elevation={2} sx={{ borderRadius: 2, mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                  Jira Details
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Key</Typography>
                    <Typography variant="body2" fontWeight={500}>{issue.jiraKey}</Typography>
                  </Box>
                  {issue.jiraUrl && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">URL</Typography>
                      <br />
                      <Link href={issue.jiraUrl} target="_blank" rel="noopener noreferrer" variant="body2">
                        {issue.jiraUrl}
                      </Link>
                    </Box>
                  )}
                  {issue.jiraCreatedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Created in Jira</Typography>
                      <Typography variant="body2">{formatDate(issue.jiraCreatedAt)}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          {(issue.approvalHistory ?? []).length > 0 && (
            <Card elevation={2} sx={{ borderRadius: 2, mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={2}>
                  Approval History
                </Typography>
                <Stack spacing={2}>
                  {(issue.approvalHistory ?? []).map((a: any) => (
                    <Stack key={a.id} direction="row" spacing={1.5} alignItems="flex-start">
                      <Avatar sx={{ width: 30, height: 30, fontSize: 13 }}>
                        {a.actorName?.[0]}
                      </Avatar>
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                          <Typography variant="body2" fontWeight={600} fontSize={13}>
                            {a.actorName}
                          </Typography>
                          <Chip
                            label={a.decision}
                            size="small"
                            color={a.decision === 'Approved' ? 'success' : a.decision === 'Rejected' ? 'error' : 'default'}
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(a.decidedAt)}
                        </Typography>
                        {a.comment && (
                          <Typography variant="caption" display="block" mt={0.5} color="text.secondary" fontStyle="italic">
                            "{a.comment}"
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} mb={2}>
                Details
              </Typography>
              <Stack spacing={1.5}>
                {[
                  { label: 'Created', value: formatDateTime(issue.createdAt) },
                  { label: 'Updated', value: formatDateTime(issue.updatedAt) },
                  { label: 'Reporter', value: issue.reporterName },
                  {
                    label: 'Assignee',
                    value: issue.assignedDeveloperName ?? issue.assigneeName ?? 'Unassigned',
                    faded: !issue.assignedDeveloperName && !issue.assigneeName,
                  },
                ].map(({ label, value, faded }) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {label}
                    </Typography>
                    <Typography variant="body2" color={faded ? 'text.disabled' : 'text.primary'}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transition confirmation dialog */}
      <Dialog open={!!pendingTransition} onClose={() => setPendingTransition(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm: {pendingTransition?.name}</DialogTitle>
        <DialogContent>
          <TextField
            label="Comment (optional)"
            multiline
            rows={3}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            value={transitionComment}
            onChange={(e) => setTransitionComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingTransition(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleTransitionConfirm}
            disabled={executeTransition.isPending}
          >
            {executeTransition.isPending ? <CircularProgress size={18} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueDetailPage;
