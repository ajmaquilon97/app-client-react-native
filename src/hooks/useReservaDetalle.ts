import { useQuery } from '@tanstack/react-query';
import { reservaDetalle } from '@/services/reservas.service';
import { useAuth } from '@/context/AuthContext';
import { Reserva } from '@/types';

export const reservaDetalleQueryKey = (id: number) => ['reservas', id, 'detalle'] as const;

export function useReservaDetalle(id: number) {
  const { fetchAuthorized, isAuthenticated } = useAuth();

  return useQuery<Reserva>({
    queryKey: reservaDetalleQueryKey(id),
    queryFn: () => fetchAuthorized(accessToken => reservaDetalle(id, accessToken)),
    enabled: isAuthenticated && !!id,
    staleTime: 30 * 1000,
  });
}
