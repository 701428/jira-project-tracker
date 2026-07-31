import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Snackbar, Alert, CircularProgress, InputAdornment,
  IconButton, Stack, alpha,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PG } from '../../contexts/ColorModeContext';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginFormData = z.infer<typeof loginSchema>;

const PolarisLogo: React.FC<{ width?: number }> = ({ width = 140 }) => (
  <img src="/polaris-logo.svg" alt="Polaris Grids" width={width} style={{ display: 'block' }} />
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      background: `linear-gradient(135deg, ${PG.navyDark} 0%, ${PG.navy} 60%, #0f3070 100%)`,
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background decoration */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 80% 60% at 10% 50%, ${alpha(PG.teal, 0.08)} 0%, transparent 60%),
                     radial-gradient(ellipse 50% 60% at 90% 20%, ${alpha(PG.periwinkle, 0.06)} 0%, transparent 55%)`,
      }} />

      {/* Left branding panel — hidden on mobile */}
      <Box sx={{
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '50%',
        px: 8,
        py: 6,
      }}>
        <PolarisLogo width={160} />
        <Box mt={5}>
          <Typography variant="h3" fontWeight={900} sx={{ color: '#fff', lineHeight: 1.2, letterSpacing: '-0.5px', mb: 2 }}>
            Field Issue<br />
            <Box component="span" sx={{
              background: `linear-gradient(90deg, ${PG.teal}, ${PG.periwinkle})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Tracker
            </Box>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, maxWidth: 360, lineHeight: 1.7 }}>
            Track, manage and resolve field issues end-to-end — synced live with Jira.
          </Typography>
        </Box>

        {/* Teal accent line */}
        <Box sx={{ mt: 5, display: 'flex', gap: 1 }}>
          {[PG.teal, PG.periwinkle, PG.blueSky].map((c, i) => (
            <Box key={i} sx={{ height: 4, width: i === 0 ? 40 : 12, borderRadius: 2, bgcolor: c }} />
          ))}
        </Box>
      </Box>

      {/* Right login card panel */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: { xs: '100%', lg: '50%' },
        px: 2, py: 4,
      }}>
        <Card elevation={0} sx={{
          width: '100%', maxWidth: 420, borderRadius: 3,
          border: `1px solid ${alpha('#fff', 0.08)}`,
          bgcolor: alpha('#fff', 0.04),
          backdropFilter: 'blur(20px)',
        }}>
          <CardContent sx={{ p: 4 }}>

            {/* Mobile logo */}
            <Box sx={{ display: { xs: 'flex', lg: 'none' }, justifyContent: 'center', mb: 3 }}>
              <PolarisLogo width={130} />
            </Box>

            <Stack spacing={0.5} mb={3.5}>
              <Typography variant="h5" fontWeight={900} sx={{ color: '#fff' }}>
                Sign in
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
                Field Issue Tracker · Polaris Grids
              </Typography>
            </Stack>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2.5}>
                <Controller name="email" control={control} render={({ field }) => (
                  <TextField
                    {...field} label="Email Address" type="email" fullWidth autoComplete="email"
                    error={!!errors.email} helperText={errors.email?.message}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff', borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                        '&.Mui-focused fieldset': { borderColor: PG.teal },
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: PG.teal },
                    }}
                  />
                )} />

                <Controller name="password" control={control} render={({ field }) => (
                  <TextField
                    {...field} label="Password" type={showPassword ? 'text' : 'password'}
                    fullWidth autoComplete="current-password"
                    error={!!errors.password} helperText={errors.password?.message}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(p => !p)} edge="end" size="small"
                            sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff', borderRadius: 2,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                        '&.Mui-focused fieldset': { borderColor: PG.teal },
                      },
                      '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: PG.teal },
                    }}
                  />
                )} />

                <Button
                  type="submit" variant="contained" size="large" fullWidth
                  disabled={loading}
                  sx={{
                    mt: 0.5, py: 1.4, fontWeight: 700, fontSize: '0.95rem', borderRadius: 2,
                    background: `linear-gradient(135deg, ${PG.teal} 0%, ${PG.blueSky} 100%)`,
                    color: PG.navyDark,
                    boxShadow: `0 4px 20px ${alpha(PG.teal, 0.4)}`,
                    '&:hover': { boxShadow: `0 6px 28px ${alpha(PG.teal, 0.55)}` },
                    '&.Mui-disabled': { opacity: 0.6 },
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: PG.navyDark }} /> : 'Sign In'}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={!!errorMsg} autoHideDuration={5000} onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorMsg(null)} variant="filled">
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
