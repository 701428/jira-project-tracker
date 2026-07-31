import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Skeleton,
  Stack,
  Tooltip,
  Fab,
  Chip,
  IconButton,
  alpha,
  useTheme,
  Divider,

} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  BugReport,
  HourglassEmpty,
  RateReview,
  FactCheck,
  CheckCircleOutline,
  Visibility,
  Add,
  Edit,
  ArrowForward,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import StatusChip from '../../components/StatusChip';
import PriorityChip from '../../components/PriorityChip';
import { useDashboard } from '../../hooks/useDashboard';
import { formatDate } from '../../utils/formatters';

const STATUS_COLORS: Record<string, string> = {
  Draft: '#9e9e9e',
  Submitted: '#2196f3',
  Approved: '#4caf50',
  Rejected: '#f44336',
  Development: '#9c27b0',
  Review: '#00bcd4',
  Validation: '#ff5722',
  Closed: '#607d8b',
};

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef5350',
  High: '#ff9800',
  Medium: '#42a5f5',
  Low: '#66bb6a',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  count: number;
  borderColor: string;
  bgColor: string;
  icon: React.ReactNode;
  trend?: number;
  loading?: boolean;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, count, borderColor, bgColor, icon, trend, loading, onClick }) => {
  const theme = useTheme();
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': onClick ? {
          transform: 'translateY(-3px)',
          boxShadow: `0 8px 24px ${alpha(borderColor, 0.2)}`,
          borderColor,
        } : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          bgcolor: borderColor,
        },
      }}
    >
      <CardContent sx={{ p: 2.5, pt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            {loading ? (
              <>
                <Skeleton width={56} height={44} sx={{ borderRadius: 1 }} />
                <Skeleton width={90} height={18} sx={{ mt: 0.5 }} />
              </>
            ) : (
              <>
                <Typography variant="h3" fontWeight={800} lineHeight={1} sx={{ color: borderColor }}>
                  {count}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.75} fontWeight={500}>
                  {label}
                </Typography>
                {trend !== undefined && (
                  <Stack direction="row" alignItems="center" spacing={0.5} mt={0.75}>
                    {trend > 0 ? (
                      <TrendingUp sx={{ fontSize: 14, color: 'error.main' }} />
                    ) : trend < 0 ? (
                      <TrendingDown sx={{ fontSize: 14, color: 'success.main' }} />
                    ) : (
                      <TrendingFlat sx={{ fontSize: 14, color: 'text.disabled' }} />
                    )}
                    <Typography variant="caption" color="text.disabled">
                      {trend === 0 ? '0%' : `${Math.abs(trend)}%`} vs last week
                    </Typography>
                  </Stack>
                )}
              </>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: borderColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ─── Issue Table ──────────────────────────────────────────────────────────────

interface IssueRow {
  id: string;
  issueNumber: string;
  summary: string;
  status: string;
  priority: string;
  meterSerial: string;
  reporterName: string;
  createdAt: string;
  jiraKey?: string;
}

const IssueTable: React.FC<{ rows: IssueRow[]; loading?: boolean }> = ({ rows, loading }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ px: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} sx={{ mb: 0.5, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <BugReport sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography color="text.secondary" variant="body2">No issues found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow sx={{
            '& th': {
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'text.secondary',
              py: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              borderBottom: `2px solid ${theme.palette.divider}`,
            },
          }}>
            <TableCell width={90}>Issue #</TableCell>
            <TableCell>Summary</TableCell>
            <TableCell width={110}>Status</TableCell>
            <TableCell width={90}>Priority</TableCell>
            <TableCell width={130}>Meter Serial</TableCell>
            <TableCell width={120}>Reporter</TableCell>
            <TableCell width={100}>Date</TableCell>
            <TableCell width={100} align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              hover
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                '& td': { borderBottom: `1px solid ${theme.palette.divider}`, py: 1.25 },
              }}
              onClick={() => navigate(`/issues/${row.id}`)}
            >
              <TableCell>
                <Typography variant="body2" color="primary.main" fontWeight={700} fontFamily="monospace" noWrap>
                  {row.issueNumber}
                </Typography>
              </TableCell>
              <TableCell sx={{ maxWidth: 0 }}>
                <Tooltip title={row.summary} placement="top-start">
                  <Typography variant="body2" noWrap fontWeight={500}>
                    {row.summary}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <StatusChip status={row.status} size="small" />
              </TableCell>
              <TableCell>
                <PriorityChip priority={row.priority} size="small" />
              </TableCell>
              <TableCell>
                <Typography variant="caption" fontFamily="monospace" sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  px: 0.75, py: 0.25, borderRadius: 1,
                  color: 'primary.main', fontWeight: 600,
                }}>
                  {row.meterSerial || '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" noWrap>{row.reporterName}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {formatDate(row.createdAt)}
                </Typography>
              </TableCell>
              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" justifyContent="center" spacing={0.5}>
                  <Tooltip title="View">
                    <IconButton size="small" onClick={() => navigate(`/issues/${row.id}`)}
                      sx={{ color: 'primary.main' }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => navigate(`/issues/${row.id}/edit`)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'warning.main' } }}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

// ─── Custom Tab Label ─────────────────────────────────────────────────────────

const TabLabel: React.FC<{ label: string; count: number; color?: string }> = ({ label, count, color }) => (
  <Stack direction="row" alignItems="center" spacing={0.75}>
    <span>{label}</span>
    {count > 0 && (
      <Chip
        label={count}
        size="small"
        sx={{
          height: 18,
          fontSize: 10,
          fontWeight: 700,
          bgcolor: color ?? 'primary.main',
          color: '#fff',
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    )}
  </Stack>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { data, isLoading } = useDashboard();
  const navigate = useNavigate();
  const theme = useTheme();

  const kpis = [
    {
      label: 'Total Issues',
      count: data?.kpis?.total ?? 0,
      borderColor: '#1976d2',
      bgColor: alpha('#1976d2', 0.1),
      icon: <BugReport />,
      trend: data?.kpis?.trends?.total ?? 0,
      onClick: () => navigate('/issues'),
    },
    {
      label: 'Open',
      count: data?.kpis?.open ?? 0,
      borderColor: '#ef5350',
      bgColor: alpha('#ef5350', 0.1),
      icon: <HourglassEmpty />,
      trend: data?.kpis?.trends?.open ?? 0,
      onClick: () => navigate('/issues?status=Submitted'),
    },
    {
      label: 'Under Review',
      count: data?.kpis?.underReview ?? 0,
      borderColor: '#ff9800',
      bgColor: alpha('#ff9800', 0.1),
      icon: <RateReview />,
      trend: data?.kpis?.trends?.underReview ?? 0,
      onClick: () => navigate('/issues?status=Review'),
    },
    {
      label: 'Validation Pending',
      count: data?.kpis?.validationPending ?? 0,
      borderColor: '#ff5722',
      bgColor: alpha('#ff5722', 0.1),
      icon: <FactCheck />,
      trend: data?.kpis?.trends?.validationPending ?? 0,
      onClick: () => navigate('/issues?status=Validation'),
    },
    {
      label: 'Closed',
      count: data?.kpis?.closed ?? 0,
      borderColor: '#43a047',
      bgColor: alpha('#43a047', 0.1),
      icon: <CheckCircleOutline />,
      trend: data?.kpis?.trends?.closed ?? 0,
      onClick: () => navigate('/issues?status=Closed'),
    },
  ];

  const statusChartData = (data?.statusBreakdown ?? []).map((item: any) => ({
    name: item.status,
    count: item.count,
    fill: STATUS_COLORS[item.status] ?? '#1976d2',
  }));

  const priorityChartData = (data?.priorityBreakdown ?? []).map((item: any) => ({
    name: item.priority,
    value: item.count,
  }));

  const recentIssues: IssueRow[] = (data?.recentIssues ?? []).map((i: any) => ({
    id: i.id,
    issueNumber: i.issueNumber,
    summary: i.summary,
    status: i.status,
    priority: i.priority,
    meterSerial: i.meterSerial,
    reporterName: i.reporterName,
    createdAt: i.createdAt,
    jiraKey: i.jiraKey,
  }));

  const myIssues: IssueRow[] = (data?.myIssues ?? []).map((i: any) => ({
    id: i.id, issueNumber: i.issueNumber, summary: i.summary,
    status: i.status, priority: i.priority, meterSerial: i.meterSerial,
    reporterName: i.reporterName, createdAt: i.createdAt, jiraKey: i.jiraKey,
  }));

  const pendingApproval: IssueRow[] = (data?.pendingApproval ?? []).map((i: any) => ({
    id: i.id, issueNumber: i.issueNumber, summary: i.summary,
    status: i.status, priority: i.priority, meterSerial: i.meterSerial,
    reporterName: i.reporterName, createdAt: i.createdAt, jiraKey: i.jiraKey,
  }));

  const validationPending: IssueRow[] = (data?.validationPending ?? []).map((i: any) => ({
    id: i.id, issueNumber: i.issueNumber, summary: i.summary,
    status: i.status, priority: i.priority, meterSerial: i.meterSerial,
    reporterName: i.reporterName, createdAt: i.createdAt, jiraKey: i.jiraKey,
  }));

  const tabData = [recentIssues, myIssues, pendingApproval, validationPending];

  return (
    <Box sx={{ position: 'relative', pb: 10 }}>

      {/* ── Header row ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Live data from Jira · Field Issue Tracker
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/issues/new')}
          sx={{
            borderRadius: 2.5,
            fontWeight: 700,
            px: 2.5,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': { boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}` },
          }}
        >
          New Issue
        </Button>
      </Stack>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} mb={3}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={2.4} key={kpi.label}>
            <KpiCard {...kpi} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* ── Charts ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, p: 2.5, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Issues by Status</Typography>
              <Button size="small" endIcon={<ArrowForward fontSize="small" />}
                onClick={() => navigate('/issues')} sx={{ fontSize: 12 }}>
                View all
              </Button>
            </Stack>
            {isLoading ? (
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
            ) : statusChartData.length === 0 ? (
              <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.disabled">No data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={statusChartData} margin={{ top: 4, right: 8, bottom: 40, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    angle={-30} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <ReTooltip
                    contentStyle={{
                      borderRadius: 8, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {statusChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, p: 2.5, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Issues by Priority</Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
            ) : priorityChartData.length === 0 ? (
              <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.disabled">No data</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={priorityChartData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}
                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {priorityChartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.name] ?? '#9e9e9e'} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <Typography component="span" variant="caption" fontWeight={500}>{value}</Typography>
                    )}
                  />
                  <ReTooltip
                    contentStyle={{
                      borderRadius: 8, border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* ── Issues Tabs ── */}
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 1, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { fontSize: 13, fontWeight: 600, minHeight: 48, textTransform: 'none', px: 2 },
              '& .Mui-selected': { color: 'primary.main' },
              '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            <Tab label={<TabLabel label="Recent Issues" count={recentIssues.length} color="#1976d2" />} />
            <Tab label={<TabLabel label="My Issues" count={myIssues.length} color="#9c27b0" />} />
            <Tab label={<TabLabel label="Pending Approval" count={pendingApproval.length} color="#ff9800" />} />
            <Tab label={<TabLabel label="Validation Pending" count={validationPending.length} color="#ff5722" />} />
          </Tabs>
        </Box>
        <Box sx={{ p: 0 }}>
          <IssueTable rows={tabData[activeTab]} loading={isLoading} />
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            endIcon={<ArrowForward fontSize="small" />}
            onClick={() => navigate('/issues')}
            sx={{ fontSize: 12, fontWeight: 600 }}
          >
            View all issues
          </Button>
        </Box>
      </Card>

      {/* ── Floating Action Button ── */}
      <Tooltip title="Raise New Issue" placement="left">
        <Fab
          color="primary"
          onClick={() => navigate('/issues/new')}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
            '&:hover': { boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.5)}` },
          }}
        >
          <Add />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default DashboardPage;
