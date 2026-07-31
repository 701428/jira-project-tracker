import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Stack, Chip, alpha,
  useTheme, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, InputAdornment,
  Alert, CircularProgress,
} from '@mui/material';
import {
  PersonAdd, Search, Block, Visibility, VisibilityOff,
  AdminPanelSettings, CheckCircle, Cancel, CheckCircleOutline,
} from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as usersApi from '../../api/users';

const ROLES = ['FieldEngineer', 'TeamLead', 'Developer', 'Reviewer', 'ValidationEngineer', 'Admin'];

const ROLE_LABELS: Record<string, string> = {
  FieldEngineer: 'Field Engineer', TeamLead: 'Team Lead', Developer: 'Developer',
  Reviewer: 'Reviewer', ValidationEngineer: 'Validation Engineer', Admin: 'Admin',
};

const ROLE_COLORS: Record<string, string> = {
  FieldEngineer: '#02C9A8', TeamLead: '#ff9800', Developer: '#9c27b0',
  Reviewer: '#2196f3', ValidationEngineer: '#00bcd4', Admin: '#ef5350',
};

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().min(1, 'Required'),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(6, 'At least 6 characters'),
  role:      z.string().min(1, 'Select a role'),
});
type FormData = z.infer<typeof schema>;

const USERS_KEY = 'admin-users';

const UsersPage: React.FC = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: [USERS_KEY],
    queryFn: usersApi.getAllUsers,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      enqueueSnackbar(`User ${created.fullName} created`, { variant: 'success' });
      setOpen(false);
      reset();
    },
    onError: (err: any) => {
      enqueueSnackbar(err?.response?.data?.detail ?? err?.response?.data ?? 'Failed to create user', { variant: 'error' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      enqueueSnackbar('User deactivated', { variant: 'warning' });
    },
    onError: () => enqueueSnackbar('Failed to deactivate user', { variant: 'error' }),
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] });
      enqueueSnackbar('User activated', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to activate user', { variant: 'error' }),
  });

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'FieldEngineer' },
  });

  const filtered = users.filter((u) =>
    search === '' ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: FormData) => createMutation.mutate(data);

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <AdminPanelSettings sx={{ color: '#ef5350', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px">User Management</Typography>
            <Chip label="Admin Only" size="small" sx={{ bgcolor: alpha('#ef5350', 0.1), color: '#ef5350', fontWeight: 700, fontSize: 11 }} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Create and manage users who can access the FIT system
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpen(true)}
          sx={{
            borderRadius: 2.5, fontWeight: 700,
            background: 'linear-gradient(135deg, #0052CC, #0065FF)',
            boxShadow: '0 4px 14px rgba(0,82,204,0.35)',
          }}>
          Add User
        </Button>
      </Stack>

      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5, pb: '12px !important' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
            <TextField
              size="small" placeholder="Search by name, email or role…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
              sx={{ width: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Typography variant="caption" color="text.secondary" ml="auto">
              {filtered.length} user{filtered.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${theme.palette.divider}` } }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={28} />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No users found
                    </TableCell>
                  </TableRow>
                ) : filtered.map((u) => (
                  <TableRow key={u.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Box sx={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          bgcolor: alpha(ROLE_COLORS[u.role] ?? '#9e9e9e', 0.15),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: ROLE_COLORS[u.role] ?? '#9e9e9e', fontWeight: 700, fontSize: 13,
                        }}>
                          {u.firstName?.charAt(0).toUpperCase()}
                        </Box>
                        <Typography variant="body2" fontWeight={600}>{u.fullName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ROLE_LABELS[u.role] ?? u.role}
                        size="small"
                        sx={{
                          bgcolor: alpha(ROLE_COLORS[u.role] ?? '#9e9e9e', 0.12),
                          color: ROLE_COLORS[u.role] ?? 'text.primary',
                          fontWeight: 700, fontSize: 11, height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                          <Typography variant="caption" color="#4caf50" fontWeight={600}>Active</Typography>
                        </Stack>
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Cancel sx={{ fontSize: 14, color: '#f44336' }} />
                          <Typography variant="caption" color="#f44336" fontWeight={600}>Inactive</Typography>
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {u.isActive ? (
                        <Tooltip title="Deactivate user">
                          <IconButton size="small" color="error"
                            disabled={deactivateMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Deactivate ${u.fullName}?`))
                                deactivateMutation.mutate(u.id);
                            }}>
                            <Block fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Activate user">
                          <IconButton size="small" color="success"
                            disabled={activateMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Activate ${u.fullName}?`))
                                activateMutation.mutate(u.id);
                            }}>
                            <CheckCircleOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={open} onClose={() => { setOpen(false); reset(); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonAdd sx={{ color: '#0052CC' }} />
            <span>Create New User</span>
          </Stack>
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              The user will be able to log in immediately with the credentials you set.
            </Alert>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5}>
                <Controller name="firstName" control={control} render={({ field }) => (
                  <TextField {...field} fullWidth label="First Name *" error={!!errors.firstName}
                    helperText={errors.firstName?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )} />
                <Controller name="lastName" control={control} render={({ field }) => (
                  <TextField {...field} fullWidth label="Last Name *" error={!!errors.lastName}
                    helperText={errors.lastName?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )} />
              </Stack>
              <Controller name="email" control={control} render={({ field }) => (
                <TextField {...field} fullWidth label="Email Address *" type="email" error={!!errors.email}
                  helperText={errors.email?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />
              <Controller name="password" control={control} render={({ field }) => (
                <TextField {...field} fullWidth label="Password *" type={showPassword ? 'text' : 'password'}
                  error={!!errors.password} helperText={errors.password?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword((p) => !p)}>
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              )} />
              <Controller name="role" control={control} render={({ field }) => (
                <TextField {...field} fullWidth select label="Role *" error={!!errors.role}
                  helperText={errors.role?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      <Stack direction="row" alignItems="center" spacing={1.25}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ROLE_COLORS[r] ?? '#9e9e9e', flexShrink: 0 }} />
                        <span>{ROLE_LABELS[r]}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              )} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => { setOpen(false); reset(); }} sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}
              sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg, #0052CC, #0065FF)' }}>
              {createMutation.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
