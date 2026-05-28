import { useMemo } from 'react';
import { Espacio, Categoria, FiltroRapido } from '@/types';
import { ESPACIOS_DATA } from '@/data/espacios';

interface UseFilteredSpacesParams {
  categoria: Categoria | null;
  query: string;
  filtroRapido?: FiltroRapido | null;
}

interface UseFilteredSpacesReturn {
  espacios: Espacio[];
  total: number;
}

export function useFilteredSpaces({
  categoria,
  query,
  filtroRapido,
}: UseFilteredSpacesParams): UseFilteredSpacesReturn {
  const espacios = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let lista = ESPACIOS_DATA.filter(espacio => {
      const matchesCategoria = categoria ? espacio.categoria === categoria : true;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        espacio.nombre.toLowerCase().includes(normalizedQuery) ||
        espacio.ubicacion.toLowerCase().includes(normalizedQuery) ||
        espacio.subcategoria.toLowerCase().includes(normalizedQuery);

      return matchesCategoria && matchesQuery;
    });

    if (filtroRapido === 'cercanos') {
      lista = [...lista].sort((a, b) => a.distancia - b.distancia);
    } else if (filtroRapido === 'puntuacion') {
      lista = [...lista].sort((a, b) => b.rating - a.rating);
    } else if (filtroRapido === 'inmediato') {
      lista = lista.filter(e => e.disponibleHoy);
    }

    return lista;
  }, [categoria, query, filtroRapido]);

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
