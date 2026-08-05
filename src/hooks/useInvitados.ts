import { useQuery } from '@tanstack/react-query';
import { fetchInvitados } from '@/services/invitados.service';
import { useAuth } from '@/context/AuthContext';
import { Invitado } from '@/types';

export const invitadosQueryKey = (reservaId: number) => ['reservas', reservaId, 'invitados'] as const;

export function useInvitados(reservaId: number) {
  const { fetchAuthorized, isAuthenticated } = useAuth();

  return useQuery<Invitado[]>({
    queryKey: invitadosQueryKey(reservaId),
    queryFn: () => fetchAuthorized(accessToken => fetchInvitados(reservaId, accessToken)),
    enabled: isAuthenticated && !!reservaId,
    staleTime: 30 * 1000,
  });
}
