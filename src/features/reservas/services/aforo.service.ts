import { api } from '@/shared/api/client';

import { AforoDia } from '../types';

/**
 * El backend calcula `capacidadTotal` a partir del propio espacio; no hace falta
 * mandársela (el parámetro que antes existía en la firma nunca se usó).
 */
export function fetchAforoDia(espacioId: number, fecha: string): Promise<AforoDia> {
  return api.get<AforoDia>('/aforo/dia', {
    query: { espacioId, fecha },
    fallback: 'No se pudo obtener el aforo disponible.',
  });
}
