import { api } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';

import {
  CrearReservaInput,
  Disponibilidad,
  FacturaDescarga,
  FacturaStatus,
  Reserva,
} from '../types';

export function fetchDisponibilidad(espacioId: number, fecha: string): Promise<Disponibilidad> {
  return api.get<Disponibilidad>(`/mobile/espacios/${espacioId}/disponibilidad`, {
    query: { fecha },
    fallback: 'No se pudo obtener la disponibilidad.',
  });
}

export function crearReserva(input: CrearReservaInput, usuarioId: string): Promise<Reserva> {
  return api.post<Reserva>('/mobile/reservas', {
    // El backend ignora este usuarioId (usa el claim `sub` del JWT), pero la
    // validación del modelo exige que el campo esté presente igual.
    body: { ...input, usuarioId },
    fallback: 'No se pudo crear la reserva.',
  });
}

export function misReservas(): Promise<Reserva[]> {
  return api.get<Reserva[]>('/reservas/mias', {
    fallback: 'No se pudieron obtener tus reservas.',
  });
}

export function reservaDetalle(id: number): Promise<Reserva> {
  return api.get<Reserva>(`/reservas/${id}`, { fallback: 'No se pudo obtener la reserva.' });
}

export function cancelarReserva(id: number, motivo: string): Promise<Reserva> {
  return api.post<Reserva>(`/reservas/${id}/cancelar`, {
    body: { motivo },
    fallback: 'No se pudo cancelar la reserva.',
  });
}

/**
 * Un 404 significa "todavía no tiene facturas asociadas" (p. ej. reserva sin
 * pagar): no es un error para la UI, simplemente no hay nada que mostrar.
 */
export async function facturasReserva(id: number): Promise<FacturaStatus[]> {
  try {
    return await api.get<FacturaStatus[]>(`/reservas/${id}/factura`, {
      fallback: 'No se pudieron obtener las facturas de la reserva.',
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

/**
 * Enlaces de descarga (PDF/XML) de las facturas ya autorizadas. Arreglo plano, a
 * diferencia de `facturasReserva`, que solo da el estado. Las URLs pre-firmadas
 * expiran, así que hay que llamarlo justo antes de abrir el PDF y no cachear.
 * 400 = las facturas siguen procesándose en el SRI o fueron rechazadas;
 * 404 = la reserva no existe o aún no tiene facturas emitidas. Los mensajes del
 * backend ya vienen redactados para mostrarse tal cual.
 */
export function facturasDescarga(reservaId: number): Promise<FacturaDescarga[]> {
  return api.get<FacturaDescarga[]>(`/mobile/reservas/${reservaId}/facturas`, {
    fallback: 'No se pudo obtener el comprobante de la factura.',
  });
}

export function registrarPago(id: number, monto: number): Promise<Reserva> {
  return api.post<Reserva>(`/reservas/${id}/pago`, {
    body: { monto, tipo: 'total' },
    fallback: 'No se pudo registrar el pago.',
  });
}
