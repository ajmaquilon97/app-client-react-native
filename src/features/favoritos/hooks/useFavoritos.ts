import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth';

import { fetchFavoritos } from '../services/favoritos.service';

export const FAVORITOS_QUERY_KEY = ['favoritos'] as const;

export function useFavoritos() {
  const { isAuthenticated } = useAuth();

  return useQuery<number[]>({
    queryKey: FAVORITOS_QUERY_KEY,
    queryFn: fetchFavoritos,
    enabled: isAuthenticated,
  });
}

/**
 * Sustituye al `isFavorite` que exponía FavoritesContext. Se apoya en la misma
 * query, así que no hay una segunda fuente de verdad: React Query ya es global
 * y el provider solo añadía una capa de indirección.
 */
export function useEsFavorito(): (espacioId: number) => boolean {
  const { data: favoritos = [] } = useFavoritos();

  return useCallback((espacioId: number) => favoritos.includes(espacioId), [favoritos]);
}
