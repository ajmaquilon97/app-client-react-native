import { ReactNode } from 'react';

import ScreenState from '@/shared/ui/feedback/ScreenState';

/**
 * Lo mínimo que necesita el boundary de un `useQuery`. Se tipa así, y no como
 * `UseQueryResult`, para poder pasarle también los hooks de derivación propios
 * (p. ej. `useFilteredSpaces`), que exponen la misma forma sin serlo.
 */
export interface BoundaryQuery<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

interface QueryBoundaryProps<T> {
  query: BoundaryQuery<T>;
  children: (data: T) => ReactNode;
  /** Qué mostrar cuando la petición fue bien pero no hay nada que pintar. */
  empty?: ReactNode;
  /** Por defecto: un array vacío. Sobrescribir para otras formas de "vacío". */
  isEmpty?: (data: T) => boolean;
  loadingMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
}

function defaultIsEmpty(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}

export default function QueryBoundary<T>({
  query,
  children,
  empty,
  isEmpty = defaultIsEmpty,
  loadingMessage,
  errorTitle = 'No se pudo cargar la información',
  errorMessage = 'Revisa tu conexión e inténtalo de nuevo.',
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return <ScreenState variant="loading" message={loadingMessage} />;
  }

  if (query.isError || query.data === undefined) {
    return (
      <ScreenState
        variant="error"
        title={errorTitle}
        message={errorMessage}
        onAction={() => query.refetch()}
      />
    );
  }

  if (empty && isEmpty(query.data)) {
    return <>{empty}</>;
  }

  return <>{children(query.data)}</>;
}
