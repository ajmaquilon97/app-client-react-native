export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || body?.title || fallback;
  } catch {
    return fallback;
  }
}

export async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res, fallback), res.status);
  }
}
