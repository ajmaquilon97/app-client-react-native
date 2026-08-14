import { api } from '@/shared/api/client';

import { makeResenaError as makeError } from '../errors';
import { CrearResenaInput, Resena, ResenaInput, ReservaResenable } from '../types';

// El módulo de reseñas vive bajo /api/espacios (controlador del panel web); no
// hay endpoints espejo en /api/mobile. Ver docs/bacend_request/backend-resenas-spec.md §1.
const path = (espacioId: number, resenaId?: number) =>
  resenaId === undefined
    ? `/espacios/${espacioId}/resenas`
    : `/espacios/${espacioId}/resenas/${resenaId}`;

/**
 * Público, no requiere JWT. Devuelve `200 []` también cuando el espacio no
 * existe (§3.1): no sirve para saber si un espacio existe. El orden ya viene
 * resuelto del servidor (más reciente primero); no reordenar en el cliente.
 */
export function fetchResenasEspacio(espacioId: number): Promise<Resena[]> {
  return api.get<Resena[]>(path(espacioId), {
    auth: false,
    fallback: 'No se pudieron obtener las reseñas.',
    makeError,
  });
}

/**
 * Llamar siempre antes de mostrar el botón "Escribir reseña": si devuelve `[]`,
 * no hay ninguna reserva propia que la habilite.
 */
export function fetchReservasResenables(espacioId: number): Promise<ReservaResenable[]> {
  return api.get<ReservaResenable[]>(`${path(espacioId)}/reservas-disponibles`, {
    fallback: 'No se pudieron obtener tus reservas disponibles para reseñar.',
    makeError,
  });
}

/**
 * Responde 200, no 201, y sin header Location. El autor sale del JWT;
 * `reservaId` es obligatorio y consume esa reserva (una reserva = una reseña).
 */
export function crearResena(espacioId: number, input: CrearResenaInput): Promise<Resena> {
  return api.post<Resena>(path(espacioId), {
    body: input,
    fallback: 'No se pudo publicar la reseña.',
    makeError,
  });
}

/** No acepta reasignar `reservaId` (se ignora si se manda). */
export function actualizarResena(
  espacioId: number,
  resenaId: number,
  input: ResenaInput,
): Promise<Resena> {
  return api.put<Resena>(path(espacioId, resenaId), {
    body: input,
    fallback: 'No se pudo actualizar la reseña.',
    makeError,
  });
}

/**
 * Baja lógica. Libera la reserva: vuelve a aparecer en reservas-disponibles.
 * Un DELETE repetido responde 404, no 200.
 */
export function eliminarResena(espacioId: number, resenaId: number): Promise<void> {
  return api.del<void>(path(espacioId, resenaId), {
    fallback: 'No se pudo eliminar la reseña.',
    makeError,
  });
}
