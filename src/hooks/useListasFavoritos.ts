import { useQuery } from '@tanstack/react-query';
import { fetchListasFavoritos, fetchListaFavoritosDetalle } from '@/services/favoritos.service';
import { useAuth } from '@/context/AuthContext';
import { ListaFavoritos, ListaFavoritosDetalle } from '@/types';

export const LISTAS_FAVORITOS_QUERY_KEY = ['listas-favoritos'] as const;
export const listaFavoritosDetalleQueryKey = (listaId: number) =>
  ['listas-favoritos', listaId] as const;

export function useListasFavoritos() {
  const { fetchAuthorized, isAuthenticated } = useAuth();

  return useQuery<ListaFavoritos[]>({
    queryKey: LISTAS_FAVORITOS_QUERY_KEY,
    queryFn: () => fetchAuthorized(fetchListasFavoritos),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useListaFavoritosDetalle(listaId: number | null) {
  const { fetchAuthorized, isAuthenticated } = useAuth();

  return useQuery<ListaFavoritosDetalle>({
    queryKey: listaFavoritosDetalleQueryKey(listaId ?? -1),
    queryFn: () =>
      fetchAuthorized(accessToken => fetchListaFavoritosDetalle(listaId as number, accessToken)),
    enabled: isAuthenticated && listaId != null,
    staleTime: 30 * 1000,
  });
}
