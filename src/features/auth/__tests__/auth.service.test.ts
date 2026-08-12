import { setTokenProvider } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/config/api';

import {
  checkEmailAvailability,
  decodeJwtSubject,
  fetchUsuario,
  forgotPassword,
  isJwtExpired,
  login,
  loginWithGoogle,
  refreshTokens,
  registro,
  verificarSmsOtp,
} from '../services/auth.service';

function response(status: number, body?: unknown): Response {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);

  return {
    ok: status >= 200 && status < 300,
    status,
    url: `${API_BASE_URL}/test`,
    headers: {} as Headers,
    text: async () => text,
  } as unknown as Response;
}

const fetchMock = jest.fn();
const urlOf = (call = 0): string => fetchMock.mock.calls[call][0];
const initOf = (call = 0): RequestInit & { headers: Record<string, string> } =>
  fetchMock.mock.calls[call][1];

const provider = {
  getAccessToken: jest.fn(async () => 'token-de-sesion'),
  refresh: jest.fn(async () => 'token-nuevo'),
  onAuthFailure: jest.fn(async () => {}),
};

beforeEach(() => {
  fetchMock.mockReset();
  provider.getAccessToken.mockClear();
  provider.refresh.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setTokenProvider(provider);
});

afterEach(() => setTokenProvider(null));

describe('login', () => {
  it('no manda Authorization y devuelve los tokens', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { accessToken: 'a', refreshToken: 'r' }));

    await expect(login('a@b.com', 'secreta')).resolves.toEqual({
      accessToken: 'a',
      refreshToken: 'r',
    });
    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/auth/login`);
    expect(initOf().headers.Authorization).toBeUndefined();
    expect(provider.getAccessToken).not.toHaveBeenCalled();
  });

  // El backend manda su propio texto en el 401; el del usuario es más claro.
  it('traduce el 401 a "Correo o contraseña incorrectos."', async () => {
    fetchMock.mockResolvedValueOnce(response(401, { message: 'Unauthorized' }));

    await expect(login('a@b.com', 'mala')).rejects.toMatchObject({
      status: 401,
      message: 'Correo o contraseña incorrectos.',
    });
  });

  it('conserva el mensaje del backend en otros errores', async () => {
    fetchMock.mockResolvedValueOnce(response(400, { message: 'El correo no tiene formato válido.' }));

    await expect(login('malo', 'x')).rejects.toMatchObject({
      message: 'El correo no tiene formato válido.',
    });
  });
});

describe('loginWithGoogle', () => {
  it('distingue el 401 del 409', async () => {
    fetchMock.mockResolvedValueOnce(response(401));
    await expect(loginWithGoogle('id-token')).rejects.toMatchObject({
      message: 'No se pudo verificar tu cuenta de Google. Intenta nuevamente.',
    });

    fetchMock.mockResolvedValueOnce(response(409));
    await expect(loginWithGoogle('id-token')).rejects.toMatchObject({
      message: 'Ese correo ya está en uso por otra cuenta. Intenta con otro método.',
    });
  });
});

describe('registro', () => {
  const tipos = [
    { id: 1, codigo: 'PRO', nombre: 'Propietario' },
    { id: 3, codigo: 'CLI', nombre: 'Cliente' },
  ];
  const input = { nombre: 'Ana', apellido: 'Paz', email: 'ana.paz@x.com', password: 'Secreta1' };

  it('resuelve el tipo Cliente del catálogo antes de crear la cuenta', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, tipos))
      .mockResolvedValueOnce(response(201, { id: 'u1', accessToken: 'a', refreshToken: 'r' }));

    await expect(registro(input)).resolves.toMatchObject({ id: 'u1' });

    expect(JSON.parse(initOf(1).body as string)).toMatchObject({
      tipoUsuarioId: 3,
      username: 'anapaz',
    });
  });

  // El username sale del correo, así que puede chocar con uno ya existente.
  it('ante un 409 reintenta con un username distinto', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, tipos))
      .mockResolvedValueOnce(response(409))
      .mockResolvedValueOnce(response(201, { id: 'u2', accessToken: 'a', refreshToken: 'r' }));

    await expect(registro(input)).resolves.toMatchObject({ id: 'u2' });

    const primero = JSON.parse(initOf(1).body as string).username;
    const segundo = JSON.parse(initOf(2).body as string).username;
    expect(primero).toBe('anapaz');
    expect(segundo).not.toBe(primero);
    expect(segundo).toMatch(/^anapaz\d{4}$/);
  });

  it('se rinde tras tres 409 con el mensaje de correo ya registrado', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, tipos))
      .mockResolvedValueOnce(response(409))
      .mockResolvedValueOnce(response(409))
      .mockResolvedValueOnce(response(409));

    await expect(registro(input)).rejects.toThrow('Ese correo ya está registrado.');
  });

  it('falla si el catálogo no trae el tipo Cliente', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [{ id: 1, codigo: 'PRO', nombre: 'Prop' }]));

    await expect(registro(input)).rejects.toThrow(/Cliente/);
  });
});

describe('checkEmailAvailability', () => {
  it('invierte el emailInUse del backend', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { emailInUse: true }));
    await expect(checkEmailAvailability('a@b.com')).resolves.toBe(false);

    fetchMock.mockResolvedValueOnce(response(200, { emailInUse: false }));
    await expect(checkEmailAvailability('libre@b.com')).resolves.toBe(true);
  });

  // No debe bloquear el registro por un fallo de red: el POST lo confirmará.
  it('asume disponible si la comprobación falla', async () => {
    fetchMock.mockResolvedValueOnce(response(500));

    await expect(checkEmailAvailability('a@b.com')).resolves.toBe(true);
  });
});

describe('fetchUsuario', () => {
  /**
   * Se llama durante el arranque de sesión, cuando el token está en SecureStore
   * pero todavía no en el estado de AuthContext: por eso va explícito y no por
   * el proveedor, que en ese momento devolvería null y forzaría un refresh.
   */
  it('usa el token explícito, no el del proveedor', async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, {
        id: 'u1',
        nombre: 'Ana',
        apellido: null,
        correo: 'a@b.com',
        username: 'ana',
        tipoUsuarioId: 3,
        tipoUsuarioNombre: 'Cliente',
      }),
    );

    const usuario = await fetchUsuario('u1', 'token-de-securestore');

    expect(initOf().headers.Authorization).toBe('Bearer token-de-securestore');
    expect(provider.getAccessToken).not.toHaveBeenCalled();
    expect(usuario.correo).toBe('a@b.com');
  });

  it('no dispara el refresh ante un 401 durante el arranque', async () => {
    fetchMock.mockResolvedValueOnce(response(401));

    await expect(fetchUsuario('u1', 'token-viejo')).rejects.toMatchObject({ status: 401 });
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('refreshTokens', () => {
  it('manda el refresh token en el cuerpo, sin Authorization', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { accessToken: 'a2', refreshToken: 'r2' }));

    await refreshTokens('r1');

    expect(urlOf()).toBe(`${API_BASE_URL}/auth/refresh`);
    expect(initOf().headers.Authorization).toBeUndefined();
    expect(JSON.parse(initOf().body as string)).toEqual({ refreshToken: 'r1' });
  });

  it('cualquier fallo se reporta como sesión expirada', async () => {
    fetchMock.mockResolvedValueOnce(response(400, { message: 'token inválido' }));

    await expect(refreshTokens('r1')).rejects.toThrow('Sesión expirada.');
  });
});

describe('endpoints con sesión', () => {
  it('verificarSmsOtp sí usa el proveedor de token', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await verificarSmsOtp('123456');

    expect(provider.getAccessToken).toHaveBeenCalled();
    expect(initOf().headers.Authorization).toBe('Bearer token-de-sesion');
  });

  it('forgotPassword es público', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await forgotPassword('a@b.com');

    expect(initOf().headers.Authorization).toBeUndefined();
  });
});

describe('lectura local del JWT', () => {
  // { "sub": "usuario-123", "exp": 4102444800 } (año 2100)
  const jwtVigente =
    'x.eyJzdWIiOiJ1c3VhcmlvLTEyMyIsImV4cCI6NDEwMjQ0NDgwMH0.y';
  // { "sub": "usuario-123", "exp": 1000000000 } (año 2001)
  const jwtExpirado = 'x.eyJzdWIiOiJ1c3VhcmlvLTEyMyIsImV4cCI6MTAwMDAwMDAwMH0.y';

  it('extrae el sub', () => {
    expect(decodeJwtSubject(jwtVigente)).toBe('usuario-123');
  });

  it('devuelve null si el token está mal formado', () => {
    expect(decodeJwtSubject('no-es-un-jwt')).toBeNull();
    expect(decodeJwtSubject('')).toBeNull();
  });

  it('detecta un token expirado', () => {
    expect(isJwtExpired(jwtExpirado)).toBe(true);
    expect(isJwtExpired(jwtVigente)).toBe(false);
  });

  // Sin `exp` legible se trata como expirado: forzar un refresh es más seguro
  // que asumir que sirve.
  it('trata como expirado un token sin exp', () => {
    expect(isJwtExpired('no-es-un-jwt')).toBe(true);
  });
});
