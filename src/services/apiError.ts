export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const raw = await res.text().catch(() => '');
  if (__DEV__ && raw) console.log(`[api] ${res.status} ${res.url}:`, raw);

  if (!raw) return fallback;
  try {
    const body = JSON.parse(raw);
    // ASP.NET's BadRequest("algo") serializa el body como un string JSON crudo,
    // no como { message: "..." } — hay que contemplar ese caso además del objeto.
    if (typeof body === 'string') return body || fallback;
    return body?.message || body?.title || fallback;
  } catch {
    return raw;
  }
}

export async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res, fallback), res.status);
  }
}
