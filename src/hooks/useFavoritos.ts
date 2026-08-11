import { useQuery } from '@tanstack/react-query';
import { fetchFavoritos } from '@/services/favoritos.service';
import { useAuth } from '@/context/AuthContext';

export const FAVORITOS_QUERY_KEY = ['favoritos'] as const;

export function useFavoritos() {
  const { fetchAuthorized, isAuthenticated } = useAuth();

  return useQuery<number[]>({
    queryKey: FAVORITOS_QUERY_KEY,
    queryFn: () => fetchAuthorized(fetchFavoritos),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}
