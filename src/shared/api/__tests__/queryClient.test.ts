import { ApiError } from '@/shared/api/errors';
import { queryClient } from '../queryClient';

/**
 * La política de reintentos es global: reintentar un 4xx no arregla nada (el
 * contrato o los permisos no cambian entre intentos) y solo retrasa el mensaje
 * de error; un 5xx o un fallo de red sí merece un par de intentos.
 */

const shouldRetry = queryClient.getDefaultOptions().queries?.retry as (
  failureCount: number,
  error: Error,
) => boolean;

describe('política de reintentos de las consultas', () => {
  it('no reintenta un 400', () => {
    expect(shouldRetry(0, new ApiError('Datos inválidos', 400))).toBe(false);
  });

  it('no reintenta un 401 ni un 404', () => {
    expect(shouldRetry(0, new ApiError('No autorizado', 401))).toBe(false);
    expect(shouldRetry(0, new ApiError('No existe', 404))).toBe(false);
  });

  it('reintenta un 500 hasta dos veces', () => {
    const error = new ApiError('Error interno', 500);

    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });

  it('reintenta un fallo de red, que no trae status', () => {
    expect(shouldRetry(0, new Error('Network request failed'))).toBe(true);
  });
});

describe('defaults de caché', () => {
  it('mantiene los datos frescos un minuto', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60 * 1000);
  });

  it('nunca reintenta una mutación: no son idempotentes', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
