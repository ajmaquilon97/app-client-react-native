import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';

import { fetchResenasEspacio, fetchReservasResenables } from '../services/resenas.service';
import { Resena, ReservaResenable } from '../types';

export const resenasEspacioQueryKey = (espacioId: number) =>
  ['espacios', espacioId, 'resenas'] as const;

export const reservasResenablesQueryKey = (espacioId: number) =>
  ['espacios', espacioId, 'resenas', 'reservas-disponibles'] as const;

/** Público (§3.1 del spec de backend) — no depende de `isAuthenticated`. */
export function useResenasEspacio(espacioId: number) {
  return useQuery<Resena[]>({
    queryKey: resenasEspacioQueryKey(espacioId),
    queryFn: () => fetchResenasEspacio(espacioId),
    enabled: !!espacioId,
    staleTime: 30 * 1000,
  });
}

export function useReservasResenables(espacioId: number) {
  const { isAuthenticated } = useAuth();

  return useQuery<ReservaResenable[]>({
    queryKey: reservasResenablesQueryKey(espacioId),
    queryFn: () => fetchReservasResenables(espacioId),
    enabled: isAuthenticated && !!espacioId,
    staleTime: 30 * 1000,
  });
}
