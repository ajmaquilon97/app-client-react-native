import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useFavoritos, FAVORITOS_QUERY_KEY } from '@/hooks/useFavoritos';
import { marcarFavorito, quitarFavorito } from '@/services/favoritos.service';

interface FavoritesContextValue {
  favorites: number[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => void;
  favoritesCount: number;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const { fetchAuthorized } = useAuth();
  const queryClient = useQueryClient();
  const { data: favorites = [], isLoading } = useFavoritos();

  const isFavorite = useCallback(
    (id: number): boolean => favorites.includes(id),
    [favorites],
  );

  // Corazón del catálogo: toggle global (sin listaId), igual al flujo sugerido
  // por backend — optimista porque POST/DELETE son idempotentes, así que si
  // falla la red simplemente revertimos el cache local.
  const toggleFavorite = useCallback(
    (id: number): void => {
      const yaEsFavorito = favorites.includes(id);
      const anterior = favorites;
      const optimista = yaEsFavorito ? favorites.filter(favId => favId !== id) : [...favorites, id];
      queryClient.setQueryData<number[]>(FAVORITOS_QUERY_KEY, optimista);

      const request = (accessToken: string) =>
        yaEsFavorito
          ? quitarFavorito(id, undefined, accessToken)
          : marcarFavorito(id, undefined, accessToken);

      fetchAuthorized(request)
        .catch(() => {
          queryClient.setQueryData<number[]>(FAVORITOS_QUERY_KEY, anterior);
        })
        .finally(() => {
          queryClient.invalidateQueries({ queryKey: FAVORITOS_QUERY_KEY });
        });
    },
    [favorites, fetchAuthorized, queryClient],
  );

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      favoritesCount: favorites.length,
      isLoading,
    }),
    [favorites, isFavorite, toggleFavorite, isLoading],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavoritesContext(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider');
  }
  return ctx;
}
