/**
 * ⚠️ SOLO DIAGNÓSTICO TEMPORAL — mientras backend arregla la validación de
 * `resourcePath` (ver FEEDBACK_BACKEND_DATAFAST.md, sección "Bug encontrado
 * probando en UAT").
 *
 * Llama DIRECTO a la API de Datafast (sandbox real, host `eu-test.oppwa.com`),
 * sin pasar por nuestro backend, usando las credenciales + parámetros del
 * ejemplo de código Node.js publicado en la sección "Sandbox" de
 * https://developers.datafast.com.ec/index.aspx (no son secretos de comercio
 * — ver FEEDBACK_BACKEND_DATAFAST.md → "Credenciales para esta etapa"). Sirve
 * únicamente para confirmar que Datafast en sí funciona bien y que el
 * problema está en la validación de backend, no en algo de nuestro lado.
 *
 * Esto NO reemplaza el flujo real: como se salta al backend, la reserva NUNCA
 * queda marcada como pagada en nuestra base de datos al usar este modo.
 *
 * BORRAR este archivo (y el toggle DATAFAST_DIAGNOSTICO_DIRECTO_UAT en
 * paymentConfig.ts) en cuanto backend confirme el fix.
 */

const UAT_ENTITY_ID = '8a8294175f113aad015f11652f2200a5';
const UAT_TOKEN = 'OGE4Mjk0MTg1YTY1YmY1ZTAxNWE2YzhjNzI4YzBkOTV8YmZxR3F3UTMyWA==';

// El checkoutId queda atado al host que lo generó — el widget (paymentWidgets.js)
// tiene que cargarse desde este mismo host en modo diagnóstico.
export const UAT_DIRECT_WIDGET_BASE_URL = 'https://eu-test.oppwa.com';
const UAT_BASE_URL = UAT_DIRECT_WIDGET_BASE_URL;

// Códigos "éxito / pendiente de revisión manual" documentados por Datafast/OPPWA.
const SUCCESS_CODE_REGEX = /^(000\.000\.|000\.100\.1|000\.(3|6))/;

function merchantTransactionId(): string {
  // Mismo estilo que el ejemplo de Datafast (ddMMyyyy_timestamp).
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}${mm}${yyyy}_${now.getTime()}`;
}

export interface DirectCheckout {
  checkoutId: string;
}

export async function crearCheckoutDatafastDirecto(amount: string): Promise<DirectCheckout> {
  // Datafast valida que BASE0 + BASEIMP + IVA == amount exactamente. `amount`
  // es el total con IVA incluido (12%), así que hay que desglosarlo hacia
  // atrás: baseImp = amount / 1.12, iva = amount - baseImp (nunca calcular el
  // IVA aparte sobre el total, o la suma no cuadra y Datafast rechaza con
  // "invalid tax number" / "valores mal calculados").
  const amountNum = Number(amount);
  const baseImp = Math.round((amountNum / 1.12) * 100) / 100;
  const iva = Math.round((amountNum - baseImp) * 100) / 100;

  // Mismos parámetros (incluidos los de IVA ecuatoriano) que el ejemplo
  // funcional de Datafast — de otra forma el sandbox real los rechaza.
  const body = new URLSearchParams({
    entityId: UAT_ENTITY_ID,
    amount,
    currency: 'USD',
    paymentType: 'DB',
    'customParameters[SHOPPER_MID]': '1000000505',
    'customParameters[SHOPPER_TID]': 'PD100406',
    'customParameters[SHOPPER_PSERV]': '17913101',
    'risk.parameters[USER_DATA2]': 'Sismetic',
    'customParameters[SHOPPER_VAL_BASE0]': '0.00',
    'customParameters[SHOPPER_VAL_BASEIMP]': baseImp.toFixed(2),
    'customParameters[SHOPPER_VAL_IVA]': iva.toFixed(2),
    'customParameters[SHOPPER_VERSIONDF]': '2',
    merchantTransactionId: merchantTransactionId(),
    'customer.merchantCustomerId': '999999',
    testMode: 'EXTERNAL',
  });

  const res = await fetch(`${UAT_BASE_URL}/v1/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UAT_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (__DEV__) console.log('[Datafast DIRECTO] checkout creado, respuesta cruda:', data);

  if (!res.ok || !data?.id) {
    throw new Error(data?.result?.description || 'No se pudo crear el checkout directo con Datafast.');
  }
  return { checkoutId: data.id };
}

export interface DirectVerificacion {
  aprobado: boolean;
  transactionId: string;
  resultCode: string;
  mensaje: string;
}

export async function verificarPagoDatafastDirecto(resourcePath: string): Promise<DirectVerificacion> {
  const res = await fetch(`${UAT_BASE_URL}${resourcePath}?entityId=${UAT_ENTITY_ID}`, {
    headers: { Authorization: `Bearer ${UAT_TOKEN}` },
  });
  const data = await res.json();
  if (__DEV__) console.log('[Datafast DIRECTO] verificación, respuesta cruda:', data);

  const resultCode: string = data?.result?.code ?? '';
  const aprobado = SUCCESS_CODE_REGEX.test(resultCode);
  return {
    aprobado,
    transactionId: data?.id ?? '',
    resultCode,
    mensaje: data?.result?.description ?? (aprobado ? 'Pago aprobado' : 'Pago rechazado'),
  };
}

export interface DirectReverso {
  aprobado: boolean;
  transactionId: string;
  resultCode: string;
  mensaje: string;
}

/**
 * Método de anulación de Datafast: POST /v1/payments/{id} (el `id` de la
 * transacción original aprobada) con paymentType=RF. Documentado en la
 * sección "Sandbox" de Datafast — a diferencia del checkout, no lleva los
 * `customParameters` de IVA, solo entityId/amount/currency/paymentType/testMode.
 */
export async function reversarPagoDatafastDirecto(
  originalTransactionId: string,
  amount: string,
): Promise<DirectReverso> {
  const body = new URLSearchParams({
    entityId: UAT_ENTITY_ID,
    amount,
    currency: 'USD',
    paymentType: 'RF',
    testMode: 'EXTERNAL',
  });

  const res = await fetch(`${UAT_BASE_URL}/v1/payments/${originalTransactionId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UAT_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  if (__DEV__) console.log('[Datafast DIRECTO] reverso, respuesta cruda:', data);

  const resultCode: string = data?.result?.code ?? '';
  const aprobado = SUCCESS_CODE_REGEX.test(resultCode);
  return {
    aprobado,
    transactionId: data?.id ?? '',
    resultCode,
    mensaje: data?.result?.description ?? (aprobado ? 'Reverso aprobado' : 'Reverso rechazado'),
  };
}

// ─── Registro efímero (en memoria) de transacciones directas por reserva ───
//
// El diagnóstico directo nunca pasa por backend, así que la reserva nunca se
// marca como pagada allá — no hay forma de que el botón "Cancelar" del
// Calendario sepa qué transacción de Datafast reversar a menos que lo
// guardemos nosotros mismos, acá, del lado del cliente. Se pierde al recargar
// la app — es solo para probar el sandbox de anulación en la misma sesión en
// la que se pagó.
const transaccionesDirectasPorReserva = new Map<number, { transactionId: string; amount: string }>();

export function registrarTransaccionDirecta(reservaId: number, transactionId: string, amount: string): void {
  transaccionesDirectasPorReserva.set(reservaId, { transactionId, amount });
}

export function obtenerTransaccionDirecta(
  reservaId: number,
): { transactionId: string; amount: string } | undefined {
  return transaccionesDirectasPorReserva.get(reservaId);
}
