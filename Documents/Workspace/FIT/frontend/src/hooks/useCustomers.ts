import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Customer { id: string; name: string; state: string; city: string; }

export const useCustomers = () =>
  useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => { const r = await apiClient.get('/customers'); return r.data; },
    staleTime: 5 * 60_000,
  });
