import { api } from '@/shared/api/client';

import { makeInvitadoError as makeError } from '../errors';
import { Invitado, InvitacionAsignada, InvitadoInput } from '../types';

// Ver docs/frontend-spec-control-acceso.md — §4.1 usa el namespace no-mobile
// (/api/reservas), el resto usa /api/mobile/reservas.
const invitadosDeReserva = (reservaId: number) => `/mobile/reservas/${reservaId}/invitados`;

/**
 * §4.1 — reparte entradas del pool a la lista de invitados, una por invitado.
 * Incremental y repetible: se puede llamar varias veces con pocos cada vez.
 */
export function asignarInvitados(
  reservaId: number,
  invitados: InvitadoInput[],
): Promise<InvitacionAsignada[]> {
  return api.post<InvitacionAsignada[]>(`/reservas/${reservaId}/invitaciones/asignar`, {
    body: invitados,
    fallback: 'No se pudieron asignar los invitados.',
    makeError,
  });
}

/** §4.2 */
export function fetchInvitados(reservaId: number): Promise<Invitado[]> {
  return api.get<Invitado[]>(invitadosDeReserva(reservaId), {
    fallback: 'No se pudieron obtener los invitados.',
  });
}

/** §4.3 — máx. 3 reenvíos, 5 min de espera entre uno y otro. */
export function reenviarInvitado(reservaId: number, invitadoId: string): Promise<void> {
  return api.post<void>(`${invitadosDeReserva(reservaId)}/${invitadoId}/reenviar`, {
    fallback: 'No se pudo reenviar la credencial.',
    makeError,
  });
}

/**
 * §4.4 — corrige nombre/correo y regenera credenciales (invalida las
 * anteriores, resetea el contador de reenvíos).
 */
export function editarInvitado(
  reservaId: number,
  invitadoId: string,
  input: InvitadoInput,
): Promise<Invitado> {
  return api.put<Invitado>(`${invitadosDeReserva(reservaId)}/${invitadoId}`, {
    body: input,
    fallback: 'No se pudo editar el invitado.',
    makeError,
  });
}
