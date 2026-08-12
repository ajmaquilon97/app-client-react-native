import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';

import { fetchEspacios } from '../services/espacios.service';
import { Espacio } from '../types';

export const ESPACIOS_QUERY_KEY = ['espacios'] as const;

export function useEspacios() {
  const { isAuthenticated } = useAuth();

  return useQuery<Espacio[]>({
    queryKey: ESPACIOS_QUERY_KEY,
    queryFn: fetchEspacios,
    enabled: isAuthenticated,
    // El catálogo cambia poco: se aparta del default de 1 min.
    staleTime: 5 * 60 * 1000,
  });
}
