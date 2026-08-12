import { AforoDia } from '@/types';
import { API_BASE_URL } from '@/shared/config/api';
import { throwIfNotOk } from '@/shared/api/errors';

const AFORO_URL = `${API_BASE_URL}/aforo`;

export async function fetchAforoDia(
  espacioId: number,
  fecha: string,
  // Sin uso: el backend ya calcula capacidadTotal a partir del espacio. Se mantiene en la
  // firma para no tocar los call sites existentes.
  _capacidadTotal: number | undefined,
  accessToken: string,
): Promise<AforoDia> {
  const res = await fetch(`${AFORO_URL}/dia?espacioId=${espacioId}&fecha=${fecha}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  await throwIfNotOk(res, 'No se pudo obtener el aforo disponible.');
  const data = await res.json();
  return {
    fecha: data.fecha,
    capacidadTotal: data.capacidadTotal,
    vendida: data.vendida,
    disponible: data.disponible,
  };
}
