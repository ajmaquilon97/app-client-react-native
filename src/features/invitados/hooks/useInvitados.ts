import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';

import { fetchInvitados } from '../services/invitados.service';
import { Invitado } from '../types';

export const invitadosQueryKey = (reservaId: number) =>
  ['reservas', reservaId, 'invitados'] as const;

export function useInvitados(reservaId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery<Invitado[]>({
    queryKey: invitadosQueryKey(reservaId),
    queryFn: () => fetchInvitados(reservaId),
    enabled: isAuthenticated && !!reservaId,
    staleTime: 30 * 1000,
  });
}
