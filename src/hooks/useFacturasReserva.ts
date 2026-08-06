import { useQuery } from '@tanstack/react-query';
import { facturasReserva } from '@/services/reservas.service';
import { useAuth } from '@/context/AuthContext';
import { FacturaStatus } from '@/types';

export const facturasReservaQueryKey = (reservaId: number) => ['reservas', reservaId, 'facturas'] as const;

export function useFacturasReserva(reservaId: number) {
  const { fetchAuthorized, isAuthenticated } = useAuth();

  return useQuery<FacturaStatus[]>({
    queryKey: facturasReservaQueryKey(reservaId),
    queryFn: () => fetchAuthorized(accessToken => facturasReserva(reservaId, accessToken)),
    enabled: isAuthenticated && !!reservaId,
    staleTime: 30 * 1000,
  });
}
