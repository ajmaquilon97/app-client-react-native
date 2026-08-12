import { ApiError, ErrorFactory } from '@/shared/api/errors';

/**
 * Los 400 de validación traen `{ message, errors: { campo: string[] } }` (§2.5
 * del spec) — se expone `fieldErrors` para que la UI arme un mensaje específico
 * en vez del genérico "Los datos proporcionados no son válidos.".
 *
 * Vive fuera del servicio a propósito: la UI necesita discriminar el error, y
 * un componente no debe importar nada de `services/`.
 */
export class ResenaApiError extends ApiError {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message, status);
    this.name = 'ResenaApiError';
    this.fieldErrors = fieldErrors;
  }
}

export const makeResenaError: ErrorFactory = ({ message, status, body }) =>
  new ResenaApiError(
    message,
    status,
    (body as { errors?: Record<string, string[]> } | null)?.errors,
  );
