import { API_BASE_URL } from '@/config/api';
import { Reserva } from '@/types';
import { throwIfNotOk } from '@/services/apiError';

const RESERVAS_URL = `${API_BASE_URL}/reservas`;

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface DatafastCheckout {
  checkoutId: string;
}

/**
 * Pide al backend que cree el checkout de Datafast (POST /v1/checkouts con las
 * credenciales del comercio). El cliente nunca ve entityId/accessToken, solo
 * recibe el checkoutId de corta duración para cargar el widget de pago.
 *
 * Contrato pendiente en el backend — ver FEEDBACK_BACKEND_DATAFAST.md.
 */
export async function crearCheckoutDatafast(
  reservaId: number,
  accessToken: string,
): Promise<DatafastCheckout> {
  const url = `${RESERVAS_URL}/${reservaId}/pago/datafast/checkout`;
  if (__DEV__) console.log('[Datafast][BACKEND] POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
  await throwIfNotOk(res, 'No se pudo iniciar el pago con Datafast.');
  const data = await res.json();
  // El swagger no documenta el shape exacto de esta respuesta todavía — logueamos
  // el crudo para poder confirmar/corregir el parseo contra el backend real.
  if (__DEV__) console.log('[Datafast][BACKEND] checkout creado, respuesta cruda:', data);
  return data;
}

export interface DatafastVerificacion {
  aprobado: boolean;
  transactionId: string;
  resultCode: string;
  mensaje: string;
  reserva: Reserva;
}

/**
 * Envía al backend el `resourcePath` que devolvió el widget de Datafast tras el
 * pago, para que verifique el resultado final (GET /v1/checkouts/{id}/payment)
 * y registre el pago en la reserva si corresponde.
 *
 * Contrato pendiente en el backend — ver FEEDBACK_BACKEND_DATAFAST.md.
 */
export async function verificarPagoDatafast(
  reservaId: number,
  resourcePath: string,
  accessToken: string,
): Promise<DatafastVerificacion> {
  const url = `${RESERVAS_URL}/${reservaId}/pago/datafast/status?resourcePath=${encodeURIComponent(resourcePath)}`;
  if (__DEV__) console.log('[Datafast][BACKEND] GET', url);
  const res = await fetch(url, { headers: authHeaders(accessToken) });
  await throwIfNotOk(res, 'No se pudo verificar el pago con Datafast.');
  const data = await res.json();
  if (__DEV__) console.log('[Datafast][BACKEND] verificación de pago, respuesta cruda:', data);
  return data;
}
