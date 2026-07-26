import { useQuery } from '@tanstack/react-query';
import { fetchEspacios } from '@/services/espacios.service';
import { useAuth } from '@/context/AuthContext';
import { Espacio } from '@/types';

export const ESPACIOS_QUERY_KEY = ['espacios'] as const;

export function useEspacios() {
  const { getAccessToken, isAuthenticated } = useAuth();

  return useQuery<Espacio[]>({
    queryKey: ESPACIOS_QUERY_KEY,
    queryFn: async () => fetchEspacios(await getAccessToken()),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
