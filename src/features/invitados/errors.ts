import { ApiError, ErrorFactory } from '@/shared/api/errors';

/**
 * Reenviar/asignar/editar necesitan más que el error genérico: reenviar expone
 * el header `Retry-After` del 429, y asignar/editar necesitan distinguir el 400
 * de validación (trae `errors`) del 400 de regla de negocio (invitado ya
 * ingresó, tope de reenvíos) — ambos vienen con el mismo status pero deben
 * mostrarse distinto.
 */
export class InvitadoApiError extends ApiError {
  retryAfterSeconds?: number;
  hasFieldErrors?: boolean;

  constructor(
    message: string,
    status: number,
    extra?: { retryAfterSeconds?: number; hasFieldErrors?: boolean },
  ) {
    super(message, status);
    this.name = 'InvitadoApiError';
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.hasFieldErrors = extra?.hasFieldErrors;
  }
}

export const makeInvitadoError: ErrorFactory = ({ message, status, body, headers }) => {
  let retryAfterSeconds: number | undefined;
  if (status === 429) {
    const header = headers.get('Retry-After');
    const parsed = header ? Number(header) : NaN;
    retryAfterSeconds = Number.isFinite(parsed) ? parsed : undefined;
  }

  const hasFieldErrors =
    typeof body === 'object' && body !== null && !!(body as { errors?: unknown }).errors;

  return new InvitadoApiError(message, status, { retryAfterSeconds, hasFieldErrors });
};
