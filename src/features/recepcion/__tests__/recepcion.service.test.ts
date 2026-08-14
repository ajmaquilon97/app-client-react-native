import { setTokenProvider } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { API_BASE_URL } from '@/shared/config/api';

import { loginRecepcion, validarQr } from '../services/recepcion.service';

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

/** El proveedor es el del cliente: recepción no debe tocarlo nunca. */
const providerDelCliente = {
  getAccessToken: jest.fn(async () => 'token-del-cliente'),
  refresh: jest.fn(async () => 'token-refrescado'),
  onAuthFailure: jest.fn(async () => {}),
};

beforeEach(() => {
  fetchMock.mockReset();
  providerDelCliente.getAccessToken.mockClear();
  providerDelCliente.refresh.mockClear();
  providerDelCliente.onAuthFailure.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setTokenProvider(providerDelCliente);
});

afterEach(() => setTokenProvider(null));

describe('loginRecepcion', () => {
  it('no manda Authorization: el PIN es la credencial', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { accessToken: 'kiosk', reservaId: 3 }));

    await loginRecepcion('123456');

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/auth/recepcion`);
    expect(initOf().headers.Authorization).toBeUndefined();
    expect(initOf().body).toBe(JSON.stringify({ pin: '123456' }));
    expect(providerDelCliente.getAccessToken).not.toHaveBeenCalled();
  });

  it('propaga el PIN inválido con el mensaje del backend', async () => {
    fetchMock.mockResolvedValueOnce(response(401, 'PIN inválido o expirado.'));

    await expect(loginRecepcion('000000')).rejects.toMatchObject({
      status: 401,
      message: 'PIN inválido o expirado.',
    });
  });
});

describe('validarQr', () => {
  it('usa el token del kiosco, no el de la sesión del cliente', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { invitadoId: 'a', nombre: 'Ana' }));

    await validarQr('ABC123', 'token-de-kiosco');

    expect(initOf().headers.Authorization).toBe('Bearer token-de-kiosco');
    expect(providerDelCliente.getAccessToken).not.toHaveBeenCalled();
  });

  it('manda el código sin normalizar', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { invitadoId: 'a', nombre: 'Ana' }));

    await validarQr('  aBc123  ', 'token-de-kiosco');

    expect(initOf().body).toBe(JSON.stringify({ codigo: '  aBc123  ' }));
  });

  // El kiosco no tiene refresh token: un 401 debe llegar a la UI para que
  // vuelva a pedir el PIN, nunca disparar el refresh de la sesión del cliente.
  it('en un 401 no refresca ni cierra la sesión del cliente', async () => {
    fetchMock.mockResolvedValueOnce(response(401, { message: 'Sesión de kiosco expirada.' }));

    await expect(validarQr('ABC123', 'token-de-kiosco')).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(providerDelCliente.refresh).not.toHaveBeenCalled();
    expect(providerDelCliente.onAuthFailure).not.toHaveBeenCalled();
  });
});
