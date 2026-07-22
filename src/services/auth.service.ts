import { API_BASE_URL } from '@/config/api';
import { AuthTokens, Usuario } from '@/types';

const AUTH_URL = `${API_BASE_URL}/auth`;
const USUARIOS_URL = `${API_BASE_URL}/usuarios`;

const CLIENTE_TIPO_CODIGO = 'CLI';

interface TipoUsuario {
  id: number;
  codigo: string;
  nombre: string;
}

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

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || body?.title || fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'No se pudo iniciar sesión.'));
  }
  return res.json();
}

export async function getTiposUsuario(): Promise<TipoUsuario[]> {
  const res = await fetch(`${USUARIOS_URL}/tipos`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('No se pudo obtener el catálogo de tipos de usuario.');
  return res.json();
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  const res = await fetch(`${USUARIOS_URL}/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) return true;
  const data = await res.json();
  return !data.emailInUse;
}

function slugifyUsername(email: string): string {
  const local = email.split('@')[0] ?? 'usuario';
  const slug = local.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (slug || 'usuario').slice(0, 40);
}

function randomUsernameSuffix(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

interface RegistroInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

interface RegistroResult extends AuthTokens {
  id: string;
}

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

    const res = await fetch(USUARIOS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        nombre: input.nombre,
        email: input.email,
        username,
        password: input.password,
        tipoUsuarioId,
      }),
    });

    if (res.status === 201 || res.status === 200) {
      return res.json();
    }

    if (res.status === 409) {
      ultimoError = new Error('Ese correo ya está registrado.');
      continue;
    }

    throw new Error(await parseErrorMessage(res, 'No se pudo crear la cuenta.'));
  }

  throw ultimoError ?? new Error('No se pudo crear la cuenta.');
}

async function completarApellido(
  id: string,
  apellido: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${USUARIOS_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ apellido }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'No se pudo guardar el apellido.'));
  }
}

export async function registro(input: RegistroInput): Promise<AuthTokens & { id: string }> {
  const tipos = await getTiposUsuario();
  const cliente = tipos.find(t => t.codigo === CLIENTE_TIPO_CODIGO);
  if (!cliente) {
    throw new Error('No se encontró el tipo de usuario "Cliente" en el catálogo del backend.');
  }

  const { id, accessToken, refreshToken } = await registrarUsuario(input, cliente.id);

  if (input.apellido) {
    await completarApellido(id, input.apellido, accessToken);
  }

  return { id, accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const res = await fetch(`${AUTH_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Sesión expirada.');
  return res.json();
}

export async function logout(refreshToken: string): Promise<void> {
  await fetch(`${AUTH_URL}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined);
}

export async function fetchUsuario(id: string, accessToken: string): Promise<Usuario> {
  const res = await fetch(`${USUARIOS_URL}/${id}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('No se pudo obtener el perfil del usuario.');
  const data: UsuarioAPI = await res.json();
  return mapApiToUsuario(data);
}

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

export function decodeJwtSubject(accessToken: string): string | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return null;
    const json = JSON.parse(base64UrlDecode(payload));
    return json.sub ?? null;
  } catch {
    return null;
  }
}
