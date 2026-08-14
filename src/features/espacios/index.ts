export { default as SpaceCard } from './components/SpaceCard';
export { default as CategoryCard } from './components/CategoryCard';
export { default as QuickFilters } from './components/QuickFilters';
export { default as EmptyState } from './components/EmptyState';
export { default as SearchScreen } from './components/SearchScreen';
export { default as LocationMap } from './components/LocationMap';

export { useEspacios, ESPACIOS_QUERY_KEY } from './hooks/useEspacios';
export {
  useFilteredSpaces,
  useFavoriteSpaces,
  useEspaciosPorIds,
} from './hooks/useFilteredSpaces';

export { getModalidadReserva } from './espacioArchetype';

export type {
  Espacio,
  Categoria,
  FiltroRapido,
  ModalidadReserva,
  Anfitrion,
  Comentario,
} from './types';
