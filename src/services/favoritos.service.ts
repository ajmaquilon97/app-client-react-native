import { API_BASE_URL } from '@/shared/config/api';
import { ListaFavoritos, ListaFavoritosDetalle } from '@/types';
import { throwIfNotOk } from '@/shared/api/errors';

// Ver docs/backend_response/favoritos-listas-response.md — el usuario sale del
// claim `sub` del JWT, nunca se manda `usuarioId` en el body/query.
const MOBILE_ESPACIOS_URL = `${API_BASE_URL}/mobile/espacios`;
const FAVORITOS_URL = `${API_BASE_URL}/mobile/favoritos`;
const LISTAS_FAVORITOS_URL = `${API_BASE_URL}/mobile/listas-favoritos`;

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

// Solo para requests que sí mandan body JSON. Declarar `Content-Type:
// application/json` sin body (ej. el POST de favorito sin listaId) hace que
// algunos backends ASP.NET Core intenten parsear un stream vacío como JSON y
// devuelvan 400 antes de llegar a la lógica de negocio.
function jsonHeaders(accessToken: string): Record<string, string> {
  return {
    ...authHeaders(accessToken),
    'Content-Type': 'application/json',
  };
}

// El body de error ya lo loguea apiError.ts (`[api] <status> <url>: <raw>`)
// cuando la respuesta no es ok — esto complementa con lo que se mandó, que es
// lo que no se ve en el inspector de red de RN/Chrome DevTools para `fetch`.
function logRequest(method: string, url: string, body?: string): void {
  if (__DEV__) {
    console.log(`[Favoritos] ${method} ${url} — body:`, body ?? '(sin body)');
  }
}

// Arreglo plano de espacioId — consolidado de todas las listas del usuario,
// sin duplicados y sin orden garantizado (§1 del feedback de backend).
export async function fetchFavoritos(accessToken: string): Promise<number[]> {
  const res = await fetch(FAVORITOS_URL, { headers: authHeaders(accessToken) });
  await throwIfNotOk(res, 'No se pudieron obtener tus favoritos.');
  return res.json();
}

// Sin `listaId`, cae en la lista por defecto del usuario (el backend la crea
// sola si no existe). Idempotente: 204 tanto si se crea como si ya existía.
export async function marcarFavorito(
  espacioId: number,
  listaId: number | undefined,
  accessToken: string,
): Promise<void> {
  const url = `${MOBILE_ESPACIOS_URL}/${espacioId}/favorito`;
  // El endpoint exige Content-Type: application/json (confirmado — sin el
  // header responde 415) y no tolera un body de 0 bytes (400) aunque el
  // campo sea opcional, así que sin listaId mandamos `{}` en vez de nada.
  const body = JSON.stringify(listaId != null ? { listaId } : {});
  logRequest('POST', url, body);
  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders(accessToken),
    body,
  });
  if (__DEV__) console.log(`[Favoritos] POST ${url} — status:`, res.status);
  await throwIfNotOk(res, 'No se pudo guardar el favorito.');
}

// Sin `listaId`, lo quita de TODAS las listas del usuario (comportamiento del
// corazón global del catálogo). Con `listaId`, solo de esa lista puntual.
export async function quitarFavorito(
  espacioId: number,
  listaId: number | undefined,
  accessToken: string,
): Promise<void> {
  const url =
    listaId != null
      ? `${MOBILE_ESPACIOS_URL}/${espacioId}/favorito?listaId=${listaId}`
      : `${MOBILE_ESPACIOS_URL}/${espacioId}/favorito`;
  logRequest('DELETE', url);
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders(accessToken) });
  if (__DEV__) console.log(`[Favoritos] DELETE ${url} — status:`, res.status);
  await throwIfNotOk(res, 'No se pudo quitar el favorito.');
}

// Ordenado de la más antigua a la más reciente.
export async function fetchListasFavoritos(accessToken: string): Promise<ListaFavoritos[]> {
  const res = await fetch(LISTAS_FAVORITOS_URL, { headers: authHeaders(accessToken) });
  await throwIfNotOk(res, 'No se pudieron obtener tus listas de favoritos.');
  return res.json();
}

export async function crearListaFavoritos(
  nombre: string,
  accessToken: string,
): Promise<ListaFavoritos> {
  const body = JSON.stringify({ nombre });
  logRequest('POST', LISTAS_FAVORITOS_URL, body);
  const res = await fetch(LISTAS_FAVORITOS_URL, {
    method: 'POST',
    headers: jsonHeaders(accessToken),
    body,
  });
  if (__DEV__) console.log(`[Favoritos] POST ${LISTAS_FAVORITOS_URL} — status:`, res.status);
  await throwIfNotOk(res, 'No se pudo crear la lista.');
  return res.json();
}

// espacioIds viene ordenado del guardado más reciente al más antiguo.
export async function fetchListaFavoritosDetalle(
  listaId: number,
  accessToken: string,
): Promise<ListaFavoritosDetalle> {
  const res = await fetch(`${LISTAS_FAVORITOS_URL}/${listaId}`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudo obtener la lista.');
  return res.json();
}

// Soft delete en cascada — saca sus espacios de GET /favoritos salvo que
// también estén guardados en otra lista. Idempotente.
export async function eliminarListaFavoritos(
  listaId: number,
  accessToken: string,
): Promise<void> {
  const url = `${LISTAS_FAVORITOS_URL}/${listaId}`;
  logRequest('DELETE', url);
  const res = await fetch(url, { method: 'DELETE', headers: authHeaders(accessToken) });
  if (__DEV__) console.log(`[Favoritos] DELETE ${url} — status:`, res.status);
  await throwIfNotOk(res, 'No se pudo eliminar la lista.');
}
