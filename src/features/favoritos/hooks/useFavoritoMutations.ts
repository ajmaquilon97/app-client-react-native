import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  crearListaFavoritos,
  eliminarListaFavoritos,
  marcarFavorito,
  quitarFavorito,
} from '../services/favoritos.service';
import { ListaFavoritos } from '../types';
import { FAVORITOS_QUERY_KEY } from './useFavoritos';
import { LISTAS_FAVORITOS_QUERY_KEY } from './useListasFavoritos';

/**
 * Política de invalidación única para todo lo que toca favoritos.
 *
 * Antes estaba repetida —con criterios distintos— en cuatro sitios:
 * FavoritesContext, la pantalla de favoritos, SaveToListSheet y CrearListaModal.
 *
 * `LISTAS_FAVORITOS_QUERY_KEY` es `['listas-favoritos']` y React Query invalida
 * por prefijo, así que también alcanza a `['listas-favoritos', id]`: no hace
 * falta invalidar el detalle de cada lista por separado. Y cualquier cambio en
 * un favorito mueve el `cantidadEspacios` de las listas, así que las dos claves
 * van siempre juntas.
 */
function invalidarFavoritos(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: FAVORITOS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: LISTAS_FAVORITOS_QUERY_KEY });
}

interface ToggleFavoritoVars {
  espacioId: number;
  /** Estado actual: `true` significa que la acción es quitarlo. */
  esFavorito: boolean;
}

/**
 * Corazón global del catálogo (sin listaId). Optimista porque POST/DELETE son
 * idempotentes: si falla la red, basta con revertir el cache local.
 *
 * Las opciones se exponen aparte del hook para poder probar el optimismo y el
 * rollback sin montar un árbol de React.
 */
export function toggleFavoritoOptions(queryClient: QueryClient) {
  return {
    mutationFn: ({ espacioId, esFavorito }: ToggleFavoritoVars) =>
      esFavorito ? quitarFavorito(espacioId) : marcarFavorito(espacioId),

    onMutate: async ({ espacioId, esFavorito }: ToggleFavoritoVars) => {
      // Sin esto, un refetch en vuelo puede pisar la actualización optimista.
      await queryClient.cancelQueries({ queryKey: FAVORITOS_QUERY_KEY });
      const anterior = queryClient.getQueryData<number[]>(FAVORITOS_QUERY_KEY);

      queryClient.setQueryData<number[]>(FAVORITOS_QUERY_KEY, (prev = []) =>
        esFavorito ? prev.filter(id => id !== espacioId) : [...prev, espacioId],
      );

      return { anterior };
    },

    onError: (_err: Error, _vars: ToggleFavoritoVars, context?: { anterior?: number[] }) => {
      if (context?.anterior) {
        queryClient.setQueryData<number[]>(FAVORITOS_QUERY_KEY, context.anterior);
      }
    },

    onSettled: () => invalidarFavoritos(queryClient),
  };
}

export function useToggleFavorito() {
  const queryClient = useQueryClient();

  return useMutation(toggleFavoritoOptions(queryClient));
}

/** Quitar de UNA lista concreta, no de todas (§2 del response de backend). */
export function useQuitarDeLista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ espacioId, listaId }: { espacioId: number; listaId: number }) =>
      quitarFavorito(espacioId, listaId),
    onSuccess: () => invalidarFavoritos(queryClient),
  });
}

export function useGuardarEnLista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ espacioId, listaId }: { espacioId: number; listaId: number }) =>
      marcarFavorito(espacioId, listaId),
    onSuccess: () => invalidarFavoritos(queryClient),
  });
}

export function useCrearLista() {
  const queryClient = useQueryClient();

  return useMutation<ListaFavoritos, Error, string>({
    mutationFn: (nombre: string) => crearListaFavoritos(nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTAS_FAVORITOS_QUERY_KEY });
    },
  });
}

export function useEliminarLista() {
  const queryClient = useQueryClient();

  return useMutation({
    // Soft delete en cascada: puede sacar espacios de GET /favoritos, así que
    // se invalidan las dos claves y no solo la de listas.
    mutationFn: (listaId: number) => eliminarListaFavoritos(listaId),
    onSuccess: () => invalidarFavoritos(queryClient),
  });
}
