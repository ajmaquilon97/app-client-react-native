import { useMemo } from 'react';
import { Espacio, Categoria } from '@/types';
import { ESPACIOS_DATA } from '@/data/espacios';

interface UseFilteredSpacesParams {
  categoria: Categoria | null;
  query: string;
}

interface UseFilteredSpacesReturn {
  espacios: Espacio[];
  total: number;
}

export function useFilteredSpaces({
  categoria,
  query,
}: UseFilteredSpacesParams): UseFilteredSpacesReturn {
  const espacios = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return ESPACIOS_DATA.filter(espacio => {
      const matchesCategoria = categoria ? espacio.categoria === categoria : true;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        espacio.nombre.toLowerCase().includes(normalizedQuery) ||
        espacio.ubicacion.toLowerCase().includes(normalizedQuery) ||
        espacio.subcategoria.toLowerCase().includes(normalizedQuery);

      return matchesCategoria && matchesQuery;
    });
  }, [categoria, query]);

  return {
    espacios,
    total: espacios.length,
  };
}

export function useFavoriteSpaces(favorites: number[]): Espacio[] {
  return useMemo(
    () => ESPACIOS_DATA.filter(e => favorites.includes(e.id)),
    [favorites],
  );
}
