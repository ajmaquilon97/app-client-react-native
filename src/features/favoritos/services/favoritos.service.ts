import { api } from '@/shared/api/client';

import { ListaFavoritos, ListaFavoritosDetalle } from '../types';

// Ver docs/backend_response/favoritos-listas-response.md — el usuario sale del
// claim `sub` del JWT, nunca se manda `usuarioId` en el body/query.
const favoritoDeEspacio = (espacioId: number) => `/mobile/espacios/${espacioId}/favorito`;
const FAVORITOS = '/mobile/favoritos';
const LISTAS = '/mobile/listas-favoritos';

/**
 * Arreglo plano de espacioId — consolidado de todas las listas del usuario,
 * sin duplicados y sin orden garantizado (§1 del feedback de backend).
 */
export function fetchFavoritos(): Promise<number[]> {
  return api.get<number[]>(FAVORITOS, { fallback: 'No se pudieron obtener tus favoritos.' });
}

/**
 * Sin `listaId`, cae en la lista por defecto del usuario (el backend la crea
 * sola si no existe). Idempotente: 204 tanto si se crea como si ya existía.
 *
 * El endpoint exige `Content-Type: application/json` (sin el header responde
 * 415) y no tolera un body de 0 bytes (400) aunque el campo sea opcional: por
 * eso sin `listaId` se manda `{}` y no `undefined`.
 */
export function marcarFavorito(espacioId: number, listaId?: number): Promise<void> {
  return api.post<void>(favoritoDeEspacio(espacioId), {
    body: listaId != null ? { listaId } : {},
    fallback: 'No se pudo guardar el favorito.',
  });
}

/**
 * Sin `listaId`, lo quita de TODAS las listas del usuario (comportamiento del
 * corazón global del catálogo). Con `listaId`, solo de esa lista puntual.
 */
export function quitarFavorito(espacioId: number, listaId?: number): Promise<void> {
  return api.del<void>(favoritoDeEspacio(espacioId), {
    query: { listaId },
    fallback: 'No se pudo quitar el favorito.',
  });
}

/** Ordenado de la más antigua a la más reciente. */
export function fetchListasFavoritos(): Promise<ListaFavoritos[]> {
  return api.get<ListaFavoritos[]>(LISTAS, {
    fallback: 'No se pudieron obtener tus listas de favoritos.',
  });
}

export function crearListaFavoritos(nombre: string): Promise<ListaFavoritos> {
  return api.post<ListaFavoritos>(LISTAS, {
    body: { nombre },
    fallback: 'No se pudo crear la lista.',
  });
}

/** `espacioIds` viene ordenado del guardado más reciente al más antiguo. */
export function fetchListaFavoritosDetalle(listaId: number): Promise<ListaFavoritosDetalle> {
  return api.get<ListaFavoritosDetalle>(`${LISTAS}/${listaId}`, {
    fallback: 'No se pudo obtener la lista.',
  });
}

/**
 * Soft delete en cascada — saca sus espacios de GET /favoritos salvo que
 * también estén guardados en otra lista. Idempotente.
 */
export function eliminarListaFavoritos(listaId: number): Promise<void> {
  return api.del<void>(`${LISTAS}/${listaId}`, { fallback: 'No se pudo eliminar la lista.' });
}
