import { api } from '@/shared/api/client';

import { RecepcionLoginResult, ValidarQrResult } from '../types';

/** §4.6 — sin Authorization: el PIN es la credencial. */
export function loginRecepcion(pin: string): Promise<RecepcionLoginResult> {
  return api.post<RecepcionLoginResult>('/mobile/auth/recepcion', {
    auth: false,
    body: { pin },
    fallback: 'PIN inválido o expirado.',
  });
}

/**
 * §4.7 — `codigo` acepta el token QR (32 hex) o el código corto (6
 * alfanuméricos) indistintamente, sin normalizar.
 *
 * Va con el token del kiosco, no con el del cliente: es una sesión aparte y sin
 * refresh, así que un 401 se propaga para que la UI vuelva a pedir el PIN.
 */
export function validarQr(codigo: string, kioskAccessToken: string): Promise<ValidarQrResult> {
  return api.post<ValidarQrResult>('/mobile/recepcion/validar-qr', {
    token: kioskAccessToken,
    body: { codigo },
    fallback: 'No se pudo validar el código.',
  });
}
