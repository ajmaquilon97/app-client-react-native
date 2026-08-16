import React from 'react';
import * as SecureStore from 'expo-secure-store';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { KioskAuthProvider, useKioskAuth } from '../context/KioskAuthContext';
import * as recepcionService from '../services/recepcion.service';

/**
 * La sesión de kiosco es deliberadamente distinta de la del cliente: se abre con
 * un PIN, no tiene refresh token y caduca sola. Lo que se prueba aquí es
 * justamente eso — que nunca intente renovarse y que no se restaure vencida.
 */

jest.mock('../services/recepcion.service', () => ({
  loginRecepcion: jest.fn(),
  validarQr: jest.fn(),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const service = recepcionService as jest.Mocked<typeof recepcionService>;

const CLAVE_TOKEN = 'kiosk_access_token';
const CLAVE_RESERVA = 'kiosk_reserva_id';
const CLAVE_EXPIRA = 'kiosk_expira_en';

const enUnaHora = () => new Date(Date.now() + 3600_000).toISOString();
const haceUnaHora = () => new Date(Date.now() - 3600_000).toISOString();

function conSesionGuardada(valores: Record<string, string | null>) {
  secureStore.getItemAsync.mockImplementation(async (key: string) => valores[key] ?? null);
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <KioskAuthProvider>{children}</KioskAuthProvider>
);

async function montarKiosco() {
  const { result } = await renderHook(() => useKioskAuth(), { wrapper });
  await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  conSesionGuardada({});
});

describe('arranque del kiosco', () => {
  it('arranca sin sesión cuando el llavero está vacío', async () => {
    const result = await montarKiosco();

    expect(result.current.isKioskAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('restaura una sesión de kiosco todavía vigente', async () => {
    const expiraEn = enUnaHora();
    conSesionGuardada({
      [CLAVE_TOKEN]: 'kiosk-token',
      [CLAVE_RESERVA]: '42',
      [CLAVE_EXPIRA]: expiraEn,
    });

    const result = await montarKiosco();

    expect(result.current.session).toEqual({
      accessToken: 'kiosk-token',
      reservaId: 42,
      expiraEn,
    });
    expect(result.current.isKioskAuthenticated).toBe(true);
  });

  it('descarta y borra una sesión ya vencida en vez de intentar renovarla', async () => {
    conSesionGuardada({
      [CLAVE_TOKEN]: 'kiosk-token',
      [CLAVE_RESERVA]: '42',
      [CLAVE_EXPIRA]: haceUnaHora(),
    });

    const result = await montarKiosco();

    expect(result.current.isKioskAuthenticated).toBe(false);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(CLAVE_TOKEN);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(CLAVE_RESERVA);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(CLAVE_EXPIRA);
  });

  it('ignora una sesión incompleta en el llavero', async () => {
    conSesionGuardada({ [CLAVE_TOKEN]: 'kiosk-token', [CLAVE_RESERVA]: '42' });

    const result = await montarKiosco();

    expect(result.current.isKioskAuthenticated).toBe(false);
  });
});

describe('login con PIN', () => {
  it('abre la sesión y la persiste completa', async () => {
    const expiraEn = enUnaHora();
    service.loginRecepcion.mockResolvedValue({
      accessToken: 'kiosk-token',
      reservaId: 7,
      expiraEn,
    });
    const result = await montarKiosco();

    await act(async () => {
      await result.current.loginKiosk('482913');
    });

    expect(service.loginRecepcion).toHaveBeenCalledWith('482913');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(CLAVE_TOKEN, 'kiosk-token');
    // El id de reserva viaja como texto: SecureStore no guarda números.
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(CLAVE_RESERVA, '7');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(CLAVE_EXPIRA, expiraEn);
    expect(result.current.isKioskAuthenticated).toBe(true);
  });

  it('propaga el PIN inválido sin dejar sesión abierta', async () => {
    service.loginRecepcion.mockRejectedValue(new Error('PIN inválido o expirado.'));
    const result = await montarKiosco();

    await expect(
      act(async () => {
        await result.current.loginKiosk('000000');
      }),
    ).rejects.toThrow('PIN inválido o expirado.');
    expect(result.current.isKioskAuthenticated).toBe(false);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});

describe('logout del kiosco', () => {
  it('borra las tres claves del llavero', async () => {
    conSesionGuardada({
      [CLAVE_TOKEN]: 'kiosk-token',
      [CLAVE_RESERVA]: '42',
      [CLAVE_EXPIRA]: enUnaHora(),
    });
    const result = await montarKiosco();

    await act(async () => {
      await result.current.logoutKiosk();
    });

    expect(result.current.isKioskAuthenticated).toBe(false);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });
});

describe('fetchAuthorizedKiosk', () => {
  it('entrega el token del kiosco a la petición', async () => {
    conSesionGuardada({
      [CLAVE_TOKEN]: 'kiosk-token',
      [CLAVE_RESERVA]: '42',
      [CLAVE_EXPIRA]: enUnaHora(),
    });
    const result = await montarKiosco();
    const peticion = jest.fn(async (token: string) => `validado con ${token}`);

    const salida = await result.current.fetchAuthorizedKiosk(peticion);

    expect(peticion).toHaveBeenCalledWith('kiosk-token');
    expect(salida).toBe('validado con kiosk-token');
  });

  it('falla explícitamente si no hay sesión de kiosco', async () => {
    const result = await montarKiosco();

    await expect(result.current.fetchAuthorizedKiosk(async () => 'x')).rejects.toThrow(
      'No hay una sesión de kiosco activa.',
    );
  });
});

describe('useKioskAuth', () => {
  it('falla de forma explícita fuera del provider', async () => {
    await expect(renderHook(() => useKioskAuth())).rejects.toThrow(
      'useKioskAuth must be used within KioskAuthProvider',
    );
  });
});
