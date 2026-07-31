import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: async () => { const r = await apiClient.get('/dashboard'); return r.data; } });
