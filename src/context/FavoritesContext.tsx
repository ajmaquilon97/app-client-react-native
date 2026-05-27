import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface FavoritesContextValue {
  favorites: number[];
  isFavorite: (id: number) => boolean;
  toggleFavorite: (id: number) => void;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const DEFAULT_FAVORITES: number[] = [1, 4];

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<number[]>(DEFAULT_FAVORITES);

  const isFavorite = useCallback(
    (id: number): boolean => favorites.includes(id),
    [favorites],
  );

  const toggleFavorite = useCallback((id: number): void => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id],
    );
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        favoritesCount: favorites.length,
      }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export function useFavoritesContext(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavoritesContext must be used within FavoritesProvider');
  }
  return ctx;
}
