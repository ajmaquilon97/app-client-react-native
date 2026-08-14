/**
 * Errores de API — punto único de parseo.
 *
 * Los dominios que necesitan exponer campos extra (validación por campo, tiempo
 * de espera de un 429) NO deben reimplementar el parseo: extienden `ApiError` y
 * pasan una `ErrorFactory` a `throwIfNotOk`, que recibe el cuerpo ya parseado.
 */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Respuesta de error ya leída y parseada, lista para construir un `ApiError`. */
export interface ParsedError {
  /** Mensaje listo para mostrar al usuario (ya cae al fallback si no vino nada). */
  message: string;
  status: number;
  /** Cuerpo parseado como JSON, o el texto crudo si no era JSON. `null` si vino vacío. */
  body: unknown;
  /** Cabeceras de la respuesta — p. ej. `Retry-After` en un 429. */
  headers: Headers;
}

export type ErrorFactory = (parsed: ParsedError) => ApiError;

export async function parseError(res: Response, fallback: string): Promise<ParsedError> {
  const raw = await res.text().catch(() => '');
  if (__DEV__ && raw) console.log(`[api] ${res.status} ${res.url}:`, raw);

  const base = { status: res.status, headers: res.headers };
  if (!raw) return { ...base, message: fallback, body: null };

  try {
    const body = JSON.parse(raw);
    // ASP.NET's BadRequest("algo") serializa el body como un string JSON crudo,
    // no como { message: "..." } — hay que contemplar ese caso además del objeto.
    if (typeof body === 'string') return { ...base, message: body || fallback, body };
    return { ...base, message: body?.message || body?.title || fallback, body };
  } catch {
    return { ...base, message: raw, body: raw };
  }
}

/** Compatibilidad con el código que solo necesita el mensaje. */
export async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  return (await parseError(res, fallback)).message;
}

export async function throwIfNotOk(
  res: Response,
  fallback: string,
  makeError?: ErrorFactory,
): Promise<void> {
  if (res.ok) return;
  const parsed = await parseError(res, fallback);
  throw makeError ? makeError(parsed) : new ApiError(parsed.message, parsed.status);
}
