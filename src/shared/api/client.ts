/**
 * Cliente HTTP único de la app.
 *
 * Centraliza lo que antes estaba repartido: la URL base, las cabeceras de
 * autenticación (`authHeaders` duplicado en cinco servicios), el parseo de
 * errores y la política de "401 → refrescar → reintentar una vez" que vivía
 * dentro de `AuthContext.fetchAuthorized` y por tanto solo era alcanzable desde
 * el árbol de React.
 *
 * Los servicios ya no reciben `accessToken`: el token lo inyecta el proveedor
 * que `AuthContext` registra al montar (ver `setTokenProvider`).
 */

import { API_BASE_URL } from '@/shared/config/api';
import { ErrorFactory, throwIfNotOk } from '@/shared/api/errors';

/**
 * Puente hacia la sesión. Lo implementa `AuthContext`, que es quien tiene el
 * estado de los tokens; el cliente solo lo consume.
 */
export interface TokenProvider {
  /** Token vigente, refrescándolo si ya expiró según el propio JWT. */
  getAccessToken: () => Promise<string>;
  /** Fuerza un refresh contra el backend y devuelve el token nuevo. */
  refresh: () => Promise<string>;
  /** El refresh también falló: no hay sesión que salvar. */
  onAuthFailure: () => Promise<void>;
}

let tokenProvider: TokenProvider | null = null;

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  /** Mensaje de usuario cuando el backend no manda uno propio. Obligatorio. */
  fallback: string;
  /** `false` para endpoints públicos (p. ej. el listado de reseñas). */
  auth?: boolean;
  /** Cuerpo a serializar como JSON. */
  body?: unknown;
  /** Parámetros de query; los `null`/`undefined` se omiten. */
  query?: Record<string, QueryValue>;
  /** Permite a un dominio construir su propia subclase de `ApiError`. */
  makeError?: ErrorFactory;
  signal?: AbortSignal;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;

  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);

  return params.length ? `${url}?${params.join('&')}` : url;
}

/**
 * Un 204, un 205 o un cuerpo vacío no se pueden pasar por `res.json()`. Los
 * DELETE del backend responden así, y varios POST responden 200 sin cuerpo.
 */
async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function send(
  method: Method,
  path: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

async function request<T>(method: Method, path: string, options: RequestOptions): Promise<T> {
  const needsAuth = options.auth !== false;

  if (!needsAuth) {
    const res = await send(method, path, options, null);
    await throwIfNotOk(res, options.fallback, options.makeError);
    return parseBody<T>(res);
  }

  if (!tokenProvider) {
    throw new Error(
      'No hay un TokenProvider registrado: llama a setTokenProvider antes de usar el cliente.',
    );
  }

  const res = await send(method, path, options, await tokenProvider.getAccessToken());
  if (res.status !== 401) {
    await throwIfNotOk(res, options.fallback, options.makeError);
    return parseBody<T>(res);
  }

  // El backend rechaza el token aunque localmente pareciera vigente (reloj
  // desincronizado, token revocado): se refresca y se reintenta UNA vez. Si el
  // refresh también falla, se cierra la sesión en vez de dejar la UI en un
  // estado "autenticado" que nunca puede recuperar datos.
  let retryRes: Response;
  try {
    retryRes = await send(method, path, options, await tokenProvider.refresh());
  } catch {
    await tokenProvider.onAuthFailure();
    await throwIfNotOk(res, options.fallback, options.makeError);
    return parseBody<T>(res); // inalcanzable: el 401 siempre lanza arriba
  }

  if (retryRes.status === 401) await tokenProvider.onAuthFailure();
  await throwIfNotOk(retryRes, options.fallback, options.makeError);
  return parseBody<T>(retryRes);
}

export const api = {
  get: <T>(path: string, options: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options: RequestOptions) => request<T>('PATCH', path, options),
  del: <T>(path: string, options: RequestOptions) => request<T>('DELETE', path, options),
};
