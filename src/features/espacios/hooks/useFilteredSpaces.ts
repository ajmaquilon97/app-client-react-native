import { useMemo } from 'react';
import { useEspacios } from './useEspacios';
import { Categoria, Espacio, FiltroRapido } from '../types';

interface UseFilteredSpacesParams {
  categoria: Categoria | null;
  query: string;
  filtroRapido?: FiltroRapido | null;
}

interface UseFilteredSpacesReturn {
  espacios: Espacio[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  refetch: () => void;
}

export function useFilteredSpaces({
  categoria,
  query,
  filtroRapido,
}: UseFilteredSpacesParams): UseFilteredSpacesReturn {
  const { data = [], isLoading, isError, isRefetching, refetch } = useEspacios();

  const espacios = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    let lista = data.filter(espacio => {
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
  }, [data, categoria, query, filtroRapido]);

  return {
    espacios,
    total: espacios.length,
    isLoading,
    isError,
    isRefetching,
    refetch,
  };
}

export function useFavoriteSpaces(favorites: number[]): Espacio[] {
  const { data = [] } = useEspacios();
  return useMemo(
    () => data.filter(e => favorites.includes(e.id)),
    [data, favorites],
  );
}

// A diferencia de useFavoriteSpaces (sin orden garantizado), preserva el
// orden de `ids` — para el detalle de una lista de favoritos, que backend
// devuelve del guardado más reciente al más antiguo.
export function useEspaciosPorIds(ids: number[]): Espacio[] {
  const { data = [] } = useEspacios();
  return useMemo(() => {
    const porId = new Map(data.map(e => [e.id, e]));
    return ids.map(id => porId.get(id)).filter((e): e is Espacio => !!e);
  }, [data, ids]);
}
