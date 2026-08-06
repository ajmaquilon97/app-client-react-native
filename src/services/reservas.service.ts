import { API_BASE_URL } from '@/config/api';
import { Disponibilidad, FacturaDescargaResponse, FacturaStatus, Reserva } from '@/types';
import { throwIfNotOk } from '@/services/apiError';

const MOBILE_ESPACIOS_URL = `${API_BASE_URL}/mobile/espacios`;
const MOBILE_RESERVAS_URL = `${API_BASE_URL}/mobile/reservas`;
const RESERVAS_URL = `${API_BASE_URL}/reservas`;

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchDisponibilidad(
  espacioId: number,
  fecha: string,
  accessToken: string,
): Promise<Disponibilidad> {
  const res = await fetch(`${MOBILE_ESPACIOS_URL}/${espacioId}/disponibilidad?fecha=${fecha}`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudo obtener la disponibilidad.');
  return res.json();
}

export interface FacturacionInput {
  identificacion: string;
  nombre: string;
  correo: string;
}

interface CrearReservaInput {
  espacioId: number;
  fechaInicio: string;
  fechaFin: string;
  totalHoras: number;
  // Opcional — si el cliente no completa estos datos, se manda "consumidor
  // final" (ver DEFAULT_FACTURACION en SpaceDetailSheet.tsx). Pendiente de
  // contrato en backend — ver FEEDBACK_BACKEND_FACTURACION.md. `ReservaRequest`
  // hoy tiene `additionalProperties: false`, así que hasta que backend lo
  // acepte explícitamente, es posible que este campo se rechace o se ignore
  // silenciosamente.
  facturacion?: FacturacionInput;
  // Cantidad de entradas para espacios `cupo_compartido` (piscinas). Backend valida el
  // aforo del día contra este valor y responde 409 si se excede (ver
  // docs/instrucciones-equipo-mobile-modalidades-reserva.md §2.3-2.4).
  pax?: number;
}

export async function crearReserva(
  input: CrearReservaInput,
  usuarioId: string,
  accessToken: string,
): Promise<Reserva> {
  const res = await fetch(MOBILE_RESERVAS_URL, {
    method: 'POST',
    headers: authHeaders(accessToken),
    // El backend ignora este usuarioId (usa el claim `sub` del JWT), pero la
    // validación del modelo exige que el campo esté presente igual.
    body: JSON.stringify({ ...input, usuarioId }),
  });
  await throwIfNotOk(res, 'No se pudo crear la reserva.');
  return res.json();
}

export async function misReservas(accessToken: string): Promise<Reserva[]> {
  const res = await fetch(`${RESERVAS_URL}/mias`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudieron obtener tus reservas.');
  return res.json();
}

export async function reservaDetalle(id: number, accessToken: string): Promise<Reserva> {
  const res = await fetch(`${RESERVAS_URL}/${id}`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudo obtener la reserva.');
  return res.json();
}

export async function cancelarReserva(
  id: number,
  motivo: string,
  accessToken: string,
): Promise<Reserva> {
  const url = `${RESERVAS_URL}/${id}/cancelar`;
  if (__DEV__) console.log('[Reversa][BACKEND] POST', url, { motivo });
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ motivo }),
  });
  await throwIfNotOk(res, 'No se pudo cancelar la reserva.');
  const data = await res.json();
  if (__DEV__) {
    console.log('[Reversa][BACKEND] respuesta cruda:', data);
    console.log('[Reversa][BACKEND] estadoPago tras cancelar:', data?.estadoPago);
  }
  return data;
}

export async function facturasReserva(id: number, accessToken: string): Promise<FacturaStatus[]> {
  const res = await fetch(`${RESERVAS_URL}/${id}/factura`, {
    headers: authHeaders(accessToken),
  });
  // 404 también significa "todavía no tiene facturas asociadas" (p.ej. reserva
  // sin pagar aún) — no es un error para la UI, simplemente no hay nada que mostrar.
  if (res.status === 404) return [];
  await throwIfNotOk(res, 'No se pudieron obtener las facturas de la reserva.');
  return res.json();
}

// GET /api/mobile/reservas/{reservaId}/factura — enlaces de descarga (PDF/XML) para el
// botón "Descargar factura" del detalle de reserva. A diferencia de facturasReserva
// (arriba), este sí tiene schema confirmado en swagger. Las URLs pre-firmadas expiran
// en 1 hora, así que hay que llamarlo justo antes de abrir el PDF, no cachear la
// respuesta. 400 = la factura todavía se procesa en el SRI o fue rechazada.
export async function descargarFactura(
  reservaId: number,
  accessToken: string,
): Promise<FacturaDescargaResponse> {
  const res = await fetch(`${MOBILE_RESERVAS_URL}/${reservaId}/factura`, {
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudo obtener el comprobante de la factura.');
  return res.json();
}

export async function registrarPago(
  id: number,
  monto: number,
  accessToken: string,
): Promise<Reserva> {
  const res = await fetch(`${RESERVAS_URL}/${id}/pago`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ monto, tipo: 'total' }),
  });
  await throwIfNotOk(res, 'No se pudo registrar el pago.');
  return res.json();
}
