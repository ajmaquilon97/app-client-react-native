import { api } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';

import { AuthTokens, RegistroInput, RegistroResult, Usuario } from '../types';

// Endpoint específico del espacio de identidad Cliente (TipoUsuarioId=3) — ver
// FEEDBACK_BACKEND_LOGIN_GOOGLE.md. Backend lo separó de `/auth/google/token`
// (que hace upsert en el espacio Propietario/Web) para no mezclar cuentas.
const MOBILE_AUTH = '/mobile/auth';
const AUTH = '/auth';
const USUARIOS = '/usuarios';

const CLIENTE_TIPO_CODIGO = 'CLI';

interface TipoUsuario {
  id: number;
  codigo: string;
  nombre: string;
}

/** Forma cruda del backend: no sale de este archivo. */
interface UsuarioAPI {
  id: string;
  nombre: string;
  apellido: string | null;
  correo: string;
  username: string;
  tipoUsuarioId: number;
  tipoUsuarioNombre: string;
}

function mapApiToUsuario(u: UsuarioAPI): Usuario {
  return {
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    correo: u.correo,
    username: u.username,
    tipoUsuarioId: u.tipoUsuarioId,
    tipoUsuarioNombre: u.tipoUsuarioNombre,
  };
}

/** Traduce ciertos status a un mensaje propio, más útil que el del backend. */
function mensajePorStatus(porStatus: Record<number, string>) {
  return ({ message, status }: { message: string; status: number }) =>
    new ApiError(porStatus[status] ?? message, status);
}

export function login(email: string, password: string): Promise<AuthTokens> {
  return api.post<AuthTokens>(`${MOBILE_AUTH}/login`, {
    auth: false,
    body: { email, password },
    fallback: 'No se pudo iniciar sesión.',
    makeError: mensajePorStatus({ 401: 'Correo o contraseña incorrectos.' }),
  });
}

export function loginWithGoogle(idToken: string): Promise<AuthTokens> {
  return api.post<AuthTokens>(`${MOBILE_AUTH}/google`, {
    auth: false,
    body: { idToken },
    fallback: 'No se pudo iniciar sesión con Google.',
    makeError: mensajePorStatus({
      401: 'No se pudo verificar tu cuenta de Google. Intenta nuevamente.',
      409: 'Ese correo ya está en uso por otra cuenta. Intenta con otro método.',
    }),
  });
}

export function getTiposUsuario(): Promise<TipoUsuario[]> {
  return api.get<TipoUsuario[]>(`${USUARIOS}/tipos`, {
    auth: false,
    fallback: 'No se pudo obtener el catálogo de tipos de usuario.',
  });
}

/** Ante cualquier fallo asume que el correo está libre: el registro lo confirmará. */
export async function checkEmailAvailability(email: string): Promise<boolean> {
  try {
    const data = await api.post<{ emailInUse: boolean }>(`${USUARIOS}/check-availability`, {
      auth: false,
      body: { email },
      fallback: 'No se pudo verificar el correo.',
    });
    return !data.emailInUse;
  } catch {
    return true;
  }
}

function slugifyUsername(email: string): string {
  const local = email.split('@')[0] ?? 'usuario';
  const slug = local.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (slug || 'usuario').slice(0, 40);
}

function randomUsernameSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * El username sale del correo, así que puede chocar con uno existente. Ante un
 * 409 se reintenta con un sufijo aleatorio, hasta tres veces.
 */
async function registrarUsuario(
  input: RegistroInput,
  tipoUsuarioId: number,
): Promise<RegistroResult> {
  const maxIntentos = 3;
  let ultimoError: Error | null = null;

  for (let intento = 0; intento < maxIntentos; intento++) {
    const username =
      intento === 0
        ? slugifyUsername(input.email)
        : `${slugifyUsername(input.email)}${randomUsernameSuffix()}`;

    try {
      return await api.post<RegistroResult>(USUARIOS, {
        auth: false,
        body: {
          nombre: input.nombre,
          apellido: input.apellido,
          email: input.email,
          username,
          password: input.password,
          tipoUsuarioId,
        },
        fallback: 'No se pudo crear la cuenta.',
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        ultimoError = new Error('Ese correo ya está registrado.');
        continue;
      }
      throw err;
    }
  }

  throw ultimoError ?? new Error('No se pudo crear la cuenta.');
}

export async function registro(input: RegistroInput): Promise<RegistroResult> {
  const tipos = await getTiposUsuario();
  const cliente = tipos.find(t => t.codigo === CLIENTE_TIPO_CODIGO);
  if (!cliente) {
    throw new Error('No se encontró el tipo de usuario "Cliente" en el catálogo del backend.');
  }

  return registrarUsuario(input, cliente.id);
}

export function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return api.post<AuthTokens>(`${AUTH}/refresh`, {
    auth: false,
    body: { refreshToken },
    fallback: 'Sesión expirada.',
    makeError: ({ status }) => new ApiError('Sesión expirada.', status),
  });
}

/** Best effort: si el backend no responde, la sesión local se limpia igual. */
export async function logout(refreshToken: string): Promise<void> {
  await api
    .post<void>(`${AUTH}/logout`, {
      auth: false,
      body: { refreshToken },
      fallback: 'No se pudo cerrar sesión.',
    })
    .catch(() => undefined);
}

/**
 * Recibe el token explícito en vez de usar el `TokenProvider`: se llama durante
 * el arranque de sesión, cuando el token está en SecureStore pero todavía no en
 * el estado de `AuthContext` — es decir, antes de que el proveedor pueda darlo.
 */
export async function fetchUsuario(id: string, accessToken: string): Promise<Usuario> {
  const data = await api.get<UsuarioAPI>(`${USUARIOS}/${id}`, {
    token: accessToken,
    fallback: 'No se pudo obtener el perfil del usuario.',
  });
  return mapApiToUsuario(data);
}

export function enviarSmsOtp(phoneNumber: string): Promise<void> {
  return api.post<void>(`${AUTH}/send-sms-otp`, {
    body: { phoneNumber },
    fallback: 'No se pudo enviar el código de verificación.',
  });
}

export function verificarSmsOtp(code: string): Promise<void> {
  return api.post<void>(`${AUTH}/verify-sms-otp`, {
    body: { code },
    fallback: 'Código inválido.',
  });
}

export function forgotPassword(email: string): Promise<void> {
  return api.post<void>(`${MOBILE_AUTH}/forgot-password`, {
    auth: false,
    body: { email },
    fallback: 'No se pudo procesar la solicitud.',
  });
}

export function resetPassword(email: string, token: string, newPassword: string): Promise<void> {
  return api.post<void>(`${MOBILE_AUTH}/reset-password`, {
    auth: false,
    body: { email, token, newPassword },
    fallback: 'El enlace no es válido o expiró.',
  });
}

/* -------------------------------------------------------------------------- */
/*  Lectura local del JWT                                                      */
/* -------------------------------------------------------------------------- */

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of padded) {
    if (char === '=') break;
    const value = chars.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

export function decodeJwtSubject(accessToken: string): string | null {
  const sub = decodeJwtPayload(accessToken)?.sub;
  return typeof sub === 'string' ? sub : null;
}

export function isJwtExpired(accessToken: string, bufferSeconds = 15): boolean {
  const exp = decodeJwtPayload(accessToken)?.exp;
  if (typeof exp !== 'number') return true;
  return Date.now() / 1000 >= exp - bufferSeconds;
}
