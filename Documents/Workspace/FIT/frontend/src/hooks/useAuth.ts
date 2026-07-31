import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '../store/authStore';
import type { IUser } from '../types';

export const useAuth = () => {
  return useAuthStore();
};

export const useLoginMutation = (): UseMutationResult<
  void,
  Error,
  { email: string; password: string }
> => {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: () => {
      navigate('/dashboard', { replace: true });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};

export const useCurrentUser = (): IUser | null => {
  return useAuthStore((s) => s.user);
};

export const useLogout = () => {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  return () => {
    logout();
    navigate('/login', { replace: true });
  };
};
