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

interface CrearReservaInput {
  espacioId: number;
  fechaInicio: string;
  fechaFin: string;
  totalHoras: number;
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
  const res = await fetch(`${RESERVAS_URL}/${id}/cancelar`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ motivo }),
  });
  await throwIfNotOk(res, 'No se pudo cancelar la reserva.');
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
