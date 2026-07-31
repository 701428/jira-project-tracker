import React, { useState } from 'react';
import {
  Box, AppBar, Toolbar, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, IconButton, Avatar,
  Menu, MenuItem, Breadcrumbs, Link, Divider, useTheme,
  useMediaQuery, Tooltip, Stack, alpha, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BugReportIcon from '@mui/icons-material/BugReport';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useColorMode, PG } from '../../contexts/ColorModeContext';

const DRAWER_WIDTH = 252;

const PolarisLogo: React.FC<{ width?: number }> = ({ width = 120 }) => (
  <img src="/polaris-logo.svg" alt="Polaris Grids" width={width} style={{ display: 'block' }} />
);

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/dashboard' },
  { label: 'All Issues', icon: <BugReportIcon fontSize="small" />, path: '/issues' },
  { label: 'New Issue', icon: <AddCircleOutlineIcon fontSize="small" />, path: '/issues/new' },
  { label: 'Users', icon: <PeopleIcon fontSize="small" />, path: '/admin/users', adminOnly: true },
];

// Backend returns Role as integer — map to display name
const ROLE_LABELS: Record<string | number, string> = {
  0: 'Field Engineer', FieldEngineer: 'Field Engineer',
  1: 'Team Lead',      TeamLead: 'Team Lead',
  2: 'Developer',      Developer: 'Developer',
  3: 'Reviewer',       Reviewer: 'Reviewer',
  4: 'Validator',      ValidationEngineer: 'Validator',
  5: 'Admin',          Admin: 'Admin',
};

const ROLE_COLORS: Record<string | number, string> = {
  0: PG.teal,    FieldEngineer: PG.teal,
  1: '#ff9800',  TeamLead: '#ff9800',
  2: '#9c27b0',  Developer: '#9c27b0',
  3: '#2196f3',  Reviewer: '#2196f3',
  4: '#00bcd4',  ValidationEngineer: '#00bcd4', Validator: '#00bcd4',
  5: '#ef5350',  Admin: '#ef5350',
};

interface MainLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  notificationCount?: number;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children, breadcrumbs = [], notificationCount = 0,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { toggleColorMode, mode } = useColorMode();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = () => { setAnchorEl(null); logout(); navigate('/login'); };
  const roleKey = user?.role ?? '';
  const roleColor = ROLE_COLORS[roleKey] ?? PG.teal;
  const roleLabel = ROLE_LABELS[roleKey] ?? String(roleKey);

  // Sidebar always dark navy (Polaris brand)
  const SIDEBAR_BG   = '#071f29';
  const SIDEBAR_ITEM = 'rgba(255,255,255,0.06)';
  const SIDEBAR_ACTIVE_BG = `linear-gradient(135deg, ${alpha(PG.teal, 0.18)}, ${alpha(PG.teal, 0.08)})`;

  const drawerContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      bgcolor: SIDEBAR_BG,
    }}>

      {/* ── Logo area ── */}
      <Box sx={{
        px: 2.5, py: 2.25, minHeight: 64, display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <PolarisLogo width={118} />
      </Box>

      {/* ── FIT badge ── */}
      <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75,
          px: 1.25, py: 0.4, borderRadius: 1.5,
          bgcolor: alpha(PG.teal, 0.12),
          border: `1px solid ${alpha(PG.teal, 0.25)}`,
        }}>
          <BugReportIcon sx={{ fontSize: 11, color: PG.teal }} />
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: PG.teal, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Field Issue Tracker
          </Typography>
        </Box>
      </Box>

      {/* ── Navigation ── */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1.5, px: 1.5 }}>
        <Typography sx={{
          px: 1, mb: 1, display: 'block', color: 'rgba(255,255,255,0.3)',
          fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 10,
        }}>
          Navigation
        </Typography>
        <List disablePadding>
          {NAV_ITEMS.filter((item) => !('adminOnly' in item) || String(user?.role) === '5' || String(user?.role) === 'Admin').map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/issues' && location.pathname.startsWith('/issues') && location.pathname !== '/issues/new');
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                  sx={{
                    borderRadius: 2, py: 1.1, position: 'relative',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                    transition: 'all 0.15s',
                    '&.Mui-selected': {
                      background: SIDEBAR_ACTIVE_BG,
                      color: '#fff',
                      '& .MuiListItemIcon-root': { color: PG.teal },
                      '&::before': {
                        content: '""', position: 'absolute', left: 0, top: '15%', bottom: '15%',
                        width: 3, borderRadius: '0 3px 3px 0', bgcolor: PG.teal,
                      },
                    },
                    '&:hover:not(.Mui-selected)': { bgcolor: SIDEBAR_ITEM, color: '#fff' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: isActive ? PG.teal : 'rgba(255,255,255,0.4)' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* ── User footer ── */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)', p: 1.5 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
        }}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Avatar sx={{
            width: 32, height: 32, fontSize: 13, fontWeight: 700,
            background: `linear-gradient(135deg, ${PG.teal}, ${PG.blueSky})`,
          }}>
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
            <Typography variant="body2" noWrap fontWeight={700} sx={{ color: '#fff', lineHeight: 1.3 }}>
              {user?.name ?? 'User'}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: PG.teal, fontWeight: 600, fontSize: 10 }}>
              {roleLabel}
            </Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── AppBar ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: '#071f29',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
          boxShadow: '0 2px 12px rgba(7,31,41,0.4)',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: '56px !important', px: { xs: 2, md: 3 } }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(p => !p)} size="small" sx={{ mr: 0.5 }}>
              <MenuIcon fontSize="small" />
            </IconButton>
          )}

          {/* Logo top-left — always visible, no background needed (AppBar is already contrasted) */}
          <Box sx={{
            width: { xs: 'auto', md: DRAWER_WIDTH - 24 },
            display: 'flex', alignItems: 'center',
          }}>
            <PolarisLogo width={isMobile ? 90 : 110} />
          </Box>

          {/* Breadcrumbs */}
          <Box sx={{ flexGrow: 1 }}>
            {breadcrumbs.length > 0 && (
              <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}>
                {breadcrumbs.map((crumb, idx) =>
                  crumb.href && idx < breadcrumbs.length - 1 ? (
                    <Link key={idx} component={RouterLink} to={crumb.href} underline="hover"
                      sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <Typography key={idx} sx={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {crumb.label}
                    </Typography>
                  )
                )}
              </Breadcrumbs>
            )}
          </Box>

          {/* Right actions */}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton size="small" onClick={toggleColorMode} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                <Box sx={{ position: 'relative' }}>
                  <NotificationsIcon fontSize="small" />
                  {notificationCount > 0 && (
                    <Box sx={{
                      position: 'absolute', top: -4, right: -4, width: 14, height: 14,
                      borderRadius: '50%', bgcolor: 'error.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontSize: 8, color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                        {notificationCount}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </IconButton>
            </Tooltip>

            {/* User chip */}
            <Box
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                px: 1.25, py: 0.5, borderRadius: 20, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.15)',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.3)' },
              }}
            >
              <Avatar sx={{
                width: 26, height: 26, fontSize: 11, fontWeight: 700,
                background: `linear-gradient(135deg, ${PG.teal}, ${PG.blueSky})`,
              }}>
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </Avatar>
              {!isMobile && (
                <Typography variant="body2" fontWeight={700} fontSize={13} sx={{ color: '#fff' }}>
                  {user?.name?.split(' ')[0] ?? 'User'}
                </Typography>
              )}
              <KeyboardArrowDownIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }} />
            </Box>
          </Stack>

          {/* User dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 0.75, minWidth: 220,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                boxShadow: '0 8px 32px rgba(10,54,144,0.14)',
                overflow: 'visible',
              },
            }}
          >
            {/* Header */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.25} mb={0.75}>
                <Avatar sx={{
                  width: 36, height: 36, fontWeight: 700, fontSize: 14,
                  background: `linear-gradient(135deg, ${PG.teal}, ${PG.blueSky})`,
                }}>
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{user?.name ?? 'User'}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{user?.email}</Typography>
                </Box>
              </Stack>
              <Chip
                label={roleLabel}
                size="small"
                sx={{
                  height: 20, fontSize: 10, fontWeight: 700,
                  bgcolor: alpha(roleColor, 0.1), color: roleColor,
                  border: `1px solid ${alpha(roleColor, 0.2)}`,
                }}
              />
            </Box>
            <Divider />
            <MenuItem onClick={() => setAnchorEl(null)} sx={{ gap: 1.5, py: 1.25, fontSize: 14 }}>
              <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              Profile
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                gap: 1.5, py: 1.25, fontSize: 14, fontWeight: 700,
                color: 'error.main',
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
              }}
            >
              <LogoutIcon fontSize="small" />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Drawer ── */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none', bgcolor: SIDEBAR_BG },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH, boxSizing: 'border-box',
              border: 'none',
              bgcolor: SIDEBAR_BG,
              boxShadow: '4px 0 24px rgba(7,31,41,0.25)',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '56px',
          minHeight: 'calc(100vh - 56px)',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
