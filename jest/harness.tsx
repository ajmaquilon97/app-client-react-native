/**
 * Utilidades compartidas por las suites de pruebas.
 *
 * Vive fuera de `src/` a propósito: es andamiaje de pruebas, no código de la
 * app, y no debe contar en las métricas de cobertura.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeModeProvider } from '@/shared/theme/ThemeModeContext';

/**
 * Cliente de React Query para pruebas: sin reintentos (un fallo simulado debe
 * fallar a la primera) y sin recolección automática, para poder inspeccionar la
 * caché después de una mutación. El aislamiento entre tests lo da un cliente
 * nuevo por test más `queryClient.clear()`.
 */
export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Wrapper para `render`/`renderHook` que inyecta el cliente de React Query. */
export function conQueryClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/**
 * Wrapper para componentes: `makeStyles`/`useTheme` leen el esquema de color del
 * `ThemeModeProvider`, así que sin él ningún componente de la app se monta.
 */
export function ConTema({ children }: { children: React.ReactNode }) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>;
}

/** Tema + React Query, para componentes que además consultan datos. */
export function conProviders(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeModeProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeModeProvider>
    );
  };
}

/** `Response` mínima: solo lo que consume `shared/api/client`. */
export function respuestaHttp(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: '',
    headers: {} as Headers,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

/** Sesión simulada para el cliente HTTP, que normalmente inyecta `AuthContext`. */
export const tokenProviderFalso = {
  getAccessToken: async () => 'token-de-prueba',
  refresh: async () => 'token-renovado',
  onAuthFailure: async () => {},
};
