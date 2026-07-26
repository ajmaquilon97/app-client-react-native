import { useQuery } from '@tanstack/react-query';
import { misReservas } from '@/services/reservas.service';
import { useAuth } from '@/context/AuthContext';
import { Reserva } from '@/types';

export const MIS_RESERVAS_QUERY_KEY = ['reservas', 'mias'] as const;

export function useMisReservas() {
  const { getAccessToken, isAuthenticated } = useAuth();

  return useQuery<Reserva[]>({
    queryKey: MIS_RESERVAS_QUERY_KEY,
    queryFn: async () => misReservas(await getAccessToken()),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}
