import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Add,
  FilterList,
  FilterListOff,
  Search,
  Clear,
  Visibility,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import PageHeader from '../../components/PageHeader';
import StatusChip from '../../components/StatusChip';
import PriorityChip from '../../components/PriorityChip';
import SeverityChip from '../../components/SeverityChip';
import { useIssueList } from '../../hooks/useIssueList';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  'Draft',
  'Submitted',
  'ReviewPending',
  'Approved',
  'Rejected',
  'Development',
  'Review',
  'ValidationPending',
  'Closed',
];

const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const SEVERITY_OPTIONS = ['S1', 'S2', 'S3', 'S4'];

interface Filters {
  statuses: string[];
  priority: string;
  severity: string;
  search: string;
  dateFrom: Dayjs | null;
  dateTo: Dayjs | null;
  customer: string;
  meterSerial: string;
}

const defaultFilters: Filters = {
  statuses: [],
  priority: '',
  severity: '',
  search: '',
  dateFrom: null,
  dateTo: null,
  customer: '',
  meterSerial: '',
};

const IssueListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);

  // Pre-apply status filter from URL query param (e.g. ?status=Closed from dashboard)
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const updated = { ...defaultFilters, statuses: [statusParam] };
      setFilters(updated);
      setAppliedFilters(updated);
    }
  }, [searchParams]);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  const { data, isLoading } = useIssueList({
    ...appliedFilters,
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
    sortField: sortModel[0]?.field,
    sortOrder: sortModel[0]?.sort ?? undefined,
  });

  const handleApply = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }, [filters]);

  const handleClear = useCallback(() => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }, []);

  const activeFilterCount = Object.entries(appliedFilters).filter(([, v]) =>
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== null
  ).length;

  const columns: GridColDef[] = [
    {
      field: 'issueNumber',
      headerName: 'Issue #',
      width: 160,
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          color="primary"
          fontWeight={600}
          sx={{ cursor: 'pointer', fontFamily: 'monospace' }}
          onClick={() => navigate(`/issues/${params.row.id}`)}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'summary',
      headerName: 'Summary',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title={params.value}>
          <Typography variant="body2" noWrap>
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip status={params.value} size="small" />
      ),
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <PriorityChip priority={params.value} size="small" />
      ),
    },
    {
      field: 'severity',
      headerName: 'Severity',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <SeverityChip severity={params.value} size="small" />
      ),
    },
    {
      field: 'meterSerial',
      headerName: 'Meter Serial',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'reporterName',
      headerName: 'Reporter',
      width: 130,
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const a = params.value;
        if (!a) return <Typography variant="body2" color="text.disabled">Unassigned</Typography>;
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
              {a.name?.[0] ?? '?'}
            </Avatar>
            <Typography variant="body2" noWrap>{a.name}</Typography>
          </Stack>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{formatDate(params.value)}</Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title="View Issue">
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/issues/${params.row.id}`);
            }}
          >
            <Visibility fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Field Issues"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/issues/new')}
          >
            New Issue
          </Button>
        }
      />

      <Card elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ pb: '12px !important' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2">Filters</Typography>
              {activeFilterCount > 0 && (
                <Chip label={activeFilterCount} size="small" color="primary" />
              )}
            </Stack>
            <Button
              size="small"
              startIcon={filtersOpen ? <FilterListOff /> : <FilterList />}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Stack>

          <Collapse in={filtersOpen}>
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Search"
                    size="small"
                    fullWidth
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    select
                    label="Status"
                    size="small"
                    fullWidth
                    SelectProps={{ multiple: true }}
                    value={filters.statuses}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        statuses: typeof e.target.value === 'string'
                          ? e.target.value.split(',')
                          : (e.target.value as string[]),
                      }))
                    }
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    select
                    label="Priority"
                    size="small"
                    fullWidth
                    value={filters.priority}
                    onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {PRIORITY_OPTIONS.map((p) => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    select
                    label="Severity"
                    size="small"
                    fullWidth
                    value={filters.severity}
                    onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {SEVERITY_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Meter Serial"
                    size="small"
                    fullWidth
                    value={filters.meterSerial}
                    onChange={(e) => setFilters((f) => ({ ...f, meterSerial: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Customer"
                    size="small"
                    fullWidth
                    value={filters.customer}
                    onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2.5}>
                  <DatePicker
                    label="From Date"
                    value={filters.dateFrom}
                    onChange={(v) => setFilters((f) => ({ ...f, dateFrom: v }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={2.5}>
                  <DatePicker
                    label="To Date"
                    value={filters.dateTo}
                    onChange={(v) => setFilters((f) => ({ ...f, dateTo: v }))}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>

                <Grid item xs={12} sm={12} md={4}>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Button variant="contained" onClick={handleApply} size="small">
                      Apply
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleClear}
                      size="small"
                      startIcon={<Clear />}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      <Card elevation={2} sx={{ borderRadius: 2 }}>
        <DataGrid
          rows={data?.issues ?? []}
          columns={columns}
          rowCount={data?.total ?? 0}
          loading={isLoading}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          disableRowSelectionOnClick
          onRowClick={(params) => navigate(`/issues/${params.id}`)}
          rowHeight={52}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-columnHeader': { fontWeight: 600 },
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          }}
          autoHeight
        />
      </Card>
    </Box>
  );
};

export default IssueListPage;
