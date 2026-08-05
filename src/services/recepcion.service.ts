import { API_BASE_URL } from '@/config/api';
import { RecepcionLoginResult, ValidarQrResult } from '@/types';
import { throwIfNotOk } from '@/services/apiError';

const MOBILE_AUTH_URL = `${API_BASE_URL}/mobile/auth`;
const MOBILE_RECEPCION_URL = `${API_BASE_URL}/mobile/recepcion`;

// POST /api/mobile/auth/recepcion (§4.6) — sin Authorization, el PIN es la credencial.
export async function loginRecepcion(pin: string): Promise<RecepcionLoginResult> {
  const res = await fetch(`${MOBILE_AUTH_URL}/recepcion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ pin }),
  });
  await throwIfNotOk(res, 'PIN inválido o expirado.');
  return res.json();
}

// POST /api/mobile/recepcion/validar-qr (§4.7) — codigo acepta el token QR (32 hex)
// o el código corto (6 alfanuméricos) indistintamente, sin normalizar.
export async function validarQr(codigo: string, kioskAccessToken: string): Promise<ValidarQrResult> {
  const res = await fetch(`${MOBILE_RECEPCION_URL}/validar-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${kioskAccessToken}`,
    },
    body: JSON.stringify({ codigo }),
  });
  await throwIfNotOk(res, 'No se pudo validar el código.');
  return res.json();
}
