import { useQuery } from '@tanstack/react-query';
import { fetchEspacios } from '@/services/espacios.service';
import { Espacio } from '@/types';

export const ESPACIOS_QUERY_KEY = ['espacios'] as const;

export function useEspacios() {
  return useQuery<Espacio[]>({
    queryKey: ESPACIOS_QUERY_KEY,
    queryFn: fetchEspacios,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
