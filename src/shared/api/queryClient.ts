/**
 * Configuración única de React Query.
 *
 * Antes cada hook elegía su propio `staleTime` (había cuatro valores distintos
 * puestos a ojo) y no había política de reintentos. Aquí quedan los defaults;
 * un hook solo debe declarar `staleTime` si necesita apartarse de ellos.
 */

import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/errors';

/** Un 4xx es un problema de contrato o de permisos: reintentarlo no lo arregla. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});
