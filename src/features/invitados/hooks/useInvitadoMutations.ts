import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  asignarInvitados,
  editarInvitado,
  reenviarInvitado,
} from '../services/invitados.service';
import { Invitado, InvitadoInput } from '../types';
import { invitadosQueryKey } from './useInvitados';

export function useAsignarInvitados(reservaId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitados: InvitadoInput[]) => asignarInvitados(reservaId, invitados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitadosQueryKey(reservaId) });
    },
  });
}

export function useEditarInvitado(reservaId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invitadoId, input }: { invitadoId: string; input: InvitadoInput }) =>
      editarInvitado(reservaId, invitadoId, input),
    onSuccess: actualizado => {
      queryClient.setQueryData<Invitado[]>(invitadosQueryKey(reservaId), prev =>
        prev?.map(i => (i.id === actualizado.id ? actualizado : i)),
      );
    },
  });
}

/**
 * Reenviar no cambia la lista salvo por el estado (Pendiente → Enviado), que el
 * backend sí actualiza: se invalida para reflejarlo.
 */
export function useReenviarInvitado(reservaId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitadoId: string) => reenviarInvitado(reservaId, invitadoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitadosQueryKey(reservaId) });
    },
  });
}
