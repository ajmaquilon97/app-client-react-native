import { API_BASE_URL } from '@/config/api';
import { Disponibilidad, Reserva } from '@/types';
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
  // Cantidad de entradas para espacios `cupo_compartido` (piscinas). Reutiliza el
  // nombre de `ReservaResponse.pax`, que backend ya devuelve hoy en las respuestas —
  // ver FEEDBACK_BACKEND_MODALIDADES_RESERVA.md. Igual que `facturacion`, se manda
  // optimista: mientras backend no confirme soporte en `ReservaRequest`, puede ser
  // ignorado silenciosamente.
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
