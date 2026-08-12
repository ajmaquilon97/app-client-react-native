import { useMutation, useQueryClient } from '@tanstack/react-query';

// TODO(fase 5): pasar a `@/features/espacios` cuando esa feature exista.
import { ESPACIOS_QUERY_KEY } from '@/hooks/useEspacios';

import {
  actualizarResena,
  crearResena,
  eliminarResena,
} from '../services/resenas.service';
import { resenasEspacioQueryKey, reservasResenablesQueryKey } from './useResenas';
import { CrearResenaInput, Resena, ResenaInput, ReservaResenable } from '../types';

/**
 * La sincronización de caché vive junto a la mutación que la provoca. Antes
 * estaba repartida: el hijo escribía y avisaba por callback (`onCreated`,
 * `onUpdated`, `onDeleted`) y el padre decidía qué invalidar.
 *
 * Se invalida `ESPACIOS_QUERY_KEY` en las tres porque el catálogo lleva el
 * promedio de calificación de cada espacio.
 */

export function useCrearResena(espacioId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CrearResenaInput) => crearResena(espacioId, input),
    onSuccess: (nueva, input) => {
      queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(espacioId), prev =>
        prev ? [nueva, ...prev] : [nueva],
      );
      // Publicar consume la reserva: deja de estar disponible para reseñar.
      queryClient.setQueryData<ReservaResenable[]>(
        reservasResenablesQueryKey(espacioId),
        prev => prev?.filter(r => r.reservaId !== input.reservaId),
      );
      queryClient.invalidateQueries({ queryKey: ESPACIOS_QUERY_KEY });
    },
  });
}

export function useActualizarResena(espacioId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resenaId, input }: { resenaId: number; input: ResenaInput }) =>
      actualizarResena(espacioId, resenaId, input),
    onSuccess: actualizada => {
      queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(espacioId), prev =>
        prev?.map(r => (r.id === actualizada.id ? actualizada : r)),
      );
      queryClient.invalidateQueries({ queryKey: ESPACIOS_QUERY_KEY });
    },
  });
}

export function useEliminarResena(espacioId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resenaId: number) => eliminarResena(espacioId, resenaId),
    onSuccess: (_void, resenaId) => {
      queryClient.setQueryData<Resena[]>(resenasEspacioQueryKey(espacioId), prev =>
        prev?.filter(r => r.id !== resenaId),
      );
      // Borrar libera la reserva: vuelve a estar disponible para reseñar.
      queryClient.invalidateQueries({ queryKey: reservasResenablesQueryKey(espacioId) });
      queryClient.invalidateQueries({ queryKey: ESPACIOS_QUERY_KEY });
    },
  });
}
