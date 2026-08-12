import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';

import {
  fetchListaFavoritosDetalle,
  fetchListasFavoritos,
} from '../services/favoritos.service';
import { ListaFavoritos, ListaFavoritosDetalle } from '../types';

export const LISTAS_FAVORITOS_QUERY_KEY = ['listas-favoritos'] as const;

export const listaFavoritosDetalleQueryKey = (listaId: number) =>
  ['listas-favoritos', listaId] as const;

export function useListasFavoritos() {
  const { isAuthenticated } = useAuth();

  return useQuery<ListaFavoritos[]>({
    queryKey: LISTAS_FAVORITOS_QUERY_KEY,
    queryFn: fetchListasFavoritos,
    enabled: isAuthenticated,
  });
}

export function useListaFavoritosDetalle(listaId: number | null) {
  const { isAuthenticated } = useAuth();

  return useQuery<ListaFavoritosDetalle>({
    queryKey: listaFavoritosDetalleQueryKey(listaId ?? -1),
    queryFn: () => fetchListaFavoritosDetalle(listaId as number),
    enabled: isAuthenticated && listaId != null,
    staleTime: 30 * 1000,
  });
}
