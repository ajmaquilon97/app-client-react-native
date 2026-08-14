import { Reserva } from '@/features/reservas';
import { api } from '@/shared/api/client';

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
export async function crearCheckoutDatafast(reservaId: number): Promise<DatafastCheckout> {
  const data = await api.post<DatafastCheckout>(`/reservas/${reservaId}/pago/datafast/checkout`, {
    fallback: 'No se pudo iniciar el pago con Datafast.',
  });
  // El swagger no documenta el shape exacto de esta respuesta todavía — se
  // loguea el crudo para poder confirmar/corregir el parseo contra el backend real.
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
): Promise<DatafastVerificacion> {
  const data = await api.get<DatafastVerificacion>(
    `/reservas/${reservaId}/pago/datafast/status`,
    {
      query: { resourcePath },
      fallback: 'No se pudo verificar el pago con Datafast.',
    },
  );
  if (__DEV__) console.log('[Datafast][BACKEND] verificación de pago, respuesta cruda:', data);
  return data;
}
