import React from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { setTokenProvider, TokenProvider } from '@/shared/api/client';

import { AuthProvider, useAuth } from '../context/AuthContext';
import * as authService from '../services/auth.service';

/**
 * El contexto de sesión es el único punto de la app que escribe en SecureStore y
 * el que alimenta al cliente HTTP con el token. Se prueba a través de `useAuth`,
 * con el servicio de red simulado: lo que se verifica aquí es la máquina de
 * estados de la sesión (arranque, login, refresh, logout), no el transporte.
 */

jest.mock('@/shared/api/client', () => ({
  setTokenProvider: jest.fn(),
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../services/auth.service', () => ({
  ...jest.requireActual('../services/auth.service'),
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  registro: jest.fn(),
  logout: jest.fn(),
  refreshTokens: jest.fn(),
  fetchUsuario: jest.fn(),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const service = authService as jest.Mocked<typeof authService>;

const USUARIO = {
  id: 'u-1',
  nombre: 'Kelly',
  apellido: 'Ramírez',
  correo: 'kelly@agora.ec',
  username: 'kelly',
  tipoUsuarioId: 3,
  tipoUsuarioNombre: 'Cliente',
};

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url a mano: en React Native no hay `Buffer` ni `btoa`. */
function base64Url(texto: string): string {
  let salida = '';
  for (let i = 0; i < texto.length; i += 3) {
    const bloque =
      (texto.charCodeAt(i) << 16) |
      ((i + 1 < texto.length ? texto.charCodeAt(i + 1) : 0) << 8) |
      (i + 2 < texto.length ? texto.charCodeAt(i + 2) : 0);
    const sextetos = Math.min(4, texto.length - i + 1);
    for (let j = 0; j < sextetos; j++) {
      salida += BASE64_CHARS[(bloque >> (18 - j * 6)) & 0x3f];
    }
  }
  return salida;
}

/** JWT sin firma real: solo el payload importa, el cliente nunca lo valida. */
function jwt(payload: Record<string, unknown>): string {
  return `header.${base64Url(JSON.stringify(payload))}.signature`;
}

const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;
const haceUnaHora = () => Math.floor(Date.now() / 1000) - 3600;

const TOKEN_VIGENTE = jwt({ sub: 'u-1', exp: enUnaHora() });
const TOKEN_EXPIRADO = jwt({ sub: 'u-1', exp: haceUnaHora() });

/** Deja SecureStore devolviendo la sesión indicada (o ninguna). */
function conSesionGuardada(access: string | null, refresh: string | null = 'refresh-guardado') {
  secureStore.getItemAsync.mockImplementation(async (key: string) => {
    if (key === 'auth_access_token') return access;
    if (key === 'auth_refresh_token') return refresh;
    return null;
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

/** Monta el provider y espera a que termine el arranque de sesión. */
async function montarSesion() {
  const { result } = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
  return result;
}

/** El proveedor de tokens que `AuthContext` inyecta en el cliente HTTP. */
function ultimoTokenProvider(): TokenProvider {
  const calls = (setTokenProvider as jest.Mock).mock.calls.map(([p]) => p).filter(Boolean);
  return calls[calls.length - 1] as TokenProvider;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  secureStore.setItemAsync.mockResolvedValue(undefined);
  secureStore.deleteItemAsync.mockResolvedValue(undefined);
  conSesionGuardada(null, null);
  service.fetchUsuario.mockResolvedValue(USUARIO);
});

afterEach(() => {
  (console.log as jest.Mock).mockRestore();
});

describe('arranque de sesión', () => {
  it('queda sin sesión cuando no hay tokens guardados', async () => {
    const result = await montarSesion();

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(service.fetchUsuario).not.toHaveBeenCalled();
  });

  it('no intenta restaurar si falta el refresh token', async () => {
    conSesionGuardada(TOKEN_VIGENTE, null);

    const result = await montarSesion();

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('restaura la sesión con el access token guardado', async () => {
    conSesionGuardada(TOKEN_VIGENTE);

    const result = await montarSesion();

    expect(service.fetchUsuario).toHaveBeenCalledWith('u-1', TOKEN_VIGENTE);
    expect(result.current.user).toEqual(USUARIO);
    expect(result.current.isAuthenticated).toBe(true);
    // Restaurar no reescribe SecureStore: los tokens ya estaban ahí.
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('refresca y vuelve a guardar cuando el access token guardado ya no sirve', async () => {
    conSesionGuardada(TOKEN_EXPIRADO);
    const nuevoAccess = jwt({ sub: 'u-1', exp: enUnaHora() });
    service.fetchUsuario.mockRejectedValueOnce(new Error('401')).mockResolvedValue(USUARIO);
    service.refreshTokens.mockResolvedValue({
      accessToken: nuevoAccess,
      refreshToken: 'refresh-nuevo',
    });

    const result = await montarSesion();

    expect(service.refreshTokens).toHaveBeenCalledWith('refresh-guardado');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth_access_token', nuevoAccess);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'refresh-nuevo');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('refresca cuando el access token guardado no trae "sub"', async () => {
    conSesionGuardada(jwt({ exp: enUnaHora() }));
    service.refreshTokens.mockResolvedValue({
      accessToken: TOKEN_VIGENTE,
      refreshToken: 'refresh-nuevo',
    });

    const result = await montarSesion();

    expect(service.refreshTokens).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('borra la sesión si el refresh token también fue rechazado', async () => {
    conSesionGuardada(TOKEN_EXPIRADO);
    service.fetchUsuario.mockRejectedValue(new Error('401'));
    service.refreshTokens.mockRejectedValue(new Error('refresh inválido'));

    const result = await montarSesion();

    expect(result.current.isAuthenticated).toBe(false);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
  });

  it('borra la sesión si el token renovado tampoco trae "sub"', async () => {
    conSesionGuardada(TOKEN_EXPIRADO);
    service.fetchUsuario.mockRejectedValueOnce(new Error('401'));
    service.refreshTokens.mockResolvedValue({
      accessToken: jwt({ exp: enUnaHora() }),
      refreshToken: 'refresh-nuevo',
    });

    const result = await montarSesion();

    expect(result.current.isAuthenticated).toBe(false);
    expect(secureStore.deleteItemAsync).toHaveBeenCalled();
  });
});

describe('login con correo y contraseña', () => {
  it('guarda tokens y usuario tras un login correcto', async () => {
    service.login.mockResolvedValue({
      accessToken: TOKEN_VIGENTE,
      refreshToken: 'refresh-1',
    });
    const result = await montarSesion();

    await act(async () => {
      await result.current.login('kelly@agora.ec', 'Secreta123');
    });

    expect(service.login).toHaveBeenCalledWith('kelly@agora.ec', 'Secreta123');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('auth_access_token', TOKEN_VIGENTE);
    expect(result.current.user).toEqual(USUARIO);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('rechaza si el backend devuelve un token que no identifica al usuario', async () => {
    service.login.mockResolvedValue({
      accessToken: jwt({ exp: enUnaHora() }),
      refreshToken: 'refresh-1',
    });
    const result = await montarSesion();

    await expect(
      act(async () => {
        await result.current.login('kelly@agora.ec', 'Secreta123');
      }),
    ).rejects.toThrow('No se pudo interpretar la sesión recibida.');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('propaga el error de credenciales sin dejar sesión a medias', async () => {
    service.login.mockRejectedValue(new Error('Correo o contraseña incorrectos.'));
    const result = await montarSesion();

    await expect(
      act(async () => {
        await result.current.login('kelly@agora.ec', 'mala');
      }),
    ).rejects.toThrow('Correo o contraseña incorrectos.');
    expect(result.current.isAuthenticated).toBe(false);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

describe('login con Google', () => {
  it('canjea el idToken de Google por la sesión propia', async () => {
    service.loginWithGoogle.mockResolvedValue({
      accessToken: TOKEN_VIGENTE,
      refreshToken: 'refresh-google',
    });
    const result = await montarSesion();

    await act(async () => {
      await result.current.loginWithGoogle('id-token-de-google');
    });

    expect(service.loginWithGoogle).toHaveBeenCalledWith('id-token-de-google');
    expect(result.current.user).toEqual(USUARIO);
  });

  it('rechaza si el token canjeado no identifica al usuario', async () => {
    service.loginWithGoogle.mockResolvedValue({
      accessToken: jwt({ exp: enUnaHora() }),
      refreshToken: 'refresh-google',
    });
    const result = await montarSesion();

    await expect(
      act(async () => {
        await result.current.loginWithGoogle('id-token-de-google');
      }),
    ).rejects.toThrow('No se pudo interpretar la sesión recibida.');
  });
});

describe('registro', () => {
  it('deja al usuario recién registrado con sesión iniciada', async () => {
    service.registro.mockResolvedValue({
      id: 'u-1',
      accessToken: TOKEN_VIGENTE,
      refreshToken: 'refresh-nuevo',
    });
    const result = await montarSesion();

    await act(async () => {
      await result.current.registro({
        nombre: 'Kelly',
        apellido: 'Ramírez',
        email: 'kelly@agora.ec',
        password: 'Secreta123',
      });
    });

    // El id lo da el registro; no hace falta decodificar el JWT.
    expect(service.fetchUsuario).toHaveBeenCalledWith('u-1', TOKEN_VIGENTE);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

describe('logout', () => {
  it('revoca el refresh token, cierra Google y limpia el almacenamiento', async () => {
    conSesionGuardada(TOKEN_VIGENTE);
    service.logout.mockResolvedValue(undefined);
    const result = await montarSesion();

    await act(async () => {
      await result.current.logout();
    });

    expect(service.logout).toHaveBeenCalledWith('refresh-guardado');
    expect(GoogleSignin.signOut).toHaveBeenCalled();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('no llama al backend si no hay refresh token en memoria', async () => {
    const result = await montarSesion();

    await act(async () => {
      await result.current.logout();
    });

    expect(service.logout).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('cierra la sesión igual si el SDK de Google falla', async () => {
    conSesionGuardada(TOKEN_VIGENTE);
    service.logout.mockResolvedValue(undefined);
    (GoogleSignin.signOut as jest.Mock).mockRejectedValueOnce(new Error('sin sesión de Google'));
    const result = await montarSesion();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('proveedor de tokens para el cliente HTTP', () => {
  it('se registra al montar y se retira al desmontar', async () => {
    const { unmount } = await renderHook(() => useAuth(), { wrapper });

    expect(setTokenProvider).toHaveBeenCalledWith(
      expect.objectContaining({ getAccessToken: expect.any(Function) }),
    );

    await act(async () => {
      unmount();
    });
    expect(setTokenProvider).toHaveBeenLastCalledWith(null);
  });

  it('devuelve el token en memoria mientras siga vigente', async () => {
    conSesionGuardada(TOKEN_VIGENTE);
    await montarSesion();

    await expect(ultimoTokenProvider().getAccessToken()).resolves.toBe(TOKEN_VIGENTE);
    expect(service.refreshTokens).not.toHaveBeenCalled();
  });

  it('refresca automáticamente cuando el token en memoria ya expiró', async () => {
    conSesionGuardada(TOKEN_EXPIRADO);
    // El arranque restaura la sesión sin refrescar: fetchUsuario responde bien
    // aunque el `exp` esté vencido (el backend es quien manda).
    const tokenFresco = jwt({ sub: 'u-1', exp: enUnaHora() });
    service.refreshTokens.mockResolvedValue({
      accessToken: tokenFresco,
      refreshToken: 'refresh-nuevo',
    });
    await montarSesion();

    await act(async () => {
      await expect(ultimoTokenProvider().getAccessToken()).resolves.toBe(tokenFresco);
    });
    expect(service.refreshTokens).toHaveBeenCalledWith('refresh-guardado');
  });

  it('cierra la sesión si el refresh falla al pedir un token', async () => {
    conSesionGuardada(TOKEN_EXPIRADO);
    service.refreshTokens.mockRejectedValue(new Error('Sesión expirada.'));
    const result = await montarSesion();

    await act(async () => {
      await expect(ultimoTokenProvider().getAccessToken()).rejects.toThrow('Sesión expirada.');
    });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('rechaza el refresh explícito cuando no hay sesión activa', async () => {
    await montarSesion();

    await expect(ultimoTokenProvider().refresh()).rejects.toThrow('No hay una sesión activa.');
  });

  it('onAuthFailure limpia la sesión del almacenamiento', async () => {
    conSesionGuardada(TOKEN_VIGENTE);
    const result = await montarSesion();

    await act(async () => {
      await ultimoTokenProvider().onAuthFailure();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
  });
});

describe('useAuth', () => {
  it('falla de forma explícita si se usa fuera del provider', async () => {
    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within AuthProvider',
    );
  });
});
