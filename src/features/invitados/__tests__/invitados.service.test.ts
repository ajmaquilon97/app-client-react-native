import { setTokenProvider } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/config/api';

import { InvitadoApiError } from '../errors';
import {
  asignarInvitados,
  editarInvitado,
  fetchInvitados,
  reenviarInvitado,
} from '../services/invitados.service';

function response(status: number, body?: unknown, headers: Record<string, string> = {}): Response {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);

  return {
    ok: status >= 200 && status < 300,
    status,
    url: `${API_BASE_URL}/test`,
    headers: { get: (name: string) => headers[name] ?? null } as unknown as Headers,
    text: async () => text,
  } as unknown as Response;
}

const fetchMock = jest.fn();
const urlOf = (call = 0): string => fetchMock.mock.calls[call][0];
const initOf = (call = 0): RequestInit & { headers: Record<string, string> } =>
  fetchMock.mock.calls[call][1];

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setTokenProvider({
    getAccessToken: async () => 'token',
    refresh: async () => 'token-nuevo',
    onAuthFailure: async () => {},
  });
});

afterEach(() => setTokenProvider(null));

describe('asignarInvitados', () => {
  // §4.1 usa el namespace no-mobile; el resto de invitados usa /api/mobile.
  it('pega al namespace no-mobile y manda el arreglo tal cual', async () => {
    fetchMock.mockResolvedValueOnce(response(200, []));
    const invitados = [{ nombre: 'Ana', correo: 'ana@x.com' }];

    await asignarInvitados(12, invitados);

    expect(urlOf()).toBe(`${API_BASE_URL}/reservas/12/invitaciones/asignar`);
    expect(initOf().body).toBe(JSON.stringify(invitados));
  });

  it('marca hasFieldErrors en el 400 de validación', async () => {
    fetchMock.mockResolvedValueOnce(
      response(400, { message: 'Datos inválidos', errors: { '[0].correo': ['Formato'] } }),
    );

    const promesa = asignarInvitados(12, [{ nombre: 'Ana', correo: 'malo' }]);

    await expect(promesa).rejects.toBeInstanceOf(InvitadoApiError);
    await expect(promesa).rejects.toMatchObject({ status: 400, hasFieldErrors: true });
  });

  // Mismo status, distinto significado: regla de negocio, no validación de campos.
  it('no marca hasFieldErrors en el 400 de regla de negocio', async () => {
    fetchMock.mockResolvedValueOnce(response(400, { message: 'El invitado ya ingresó.' }));

    await expect(asignarInvitados(12, [])).rejects.toMatchObject({
      status: 400,
      hasFieldErrors: false,
      message: 'El invitado ya ingresó.',
    });
  });

  it('propaga el 409 de cupo insuficiente', async () => {
    fetchMock.mockResolvedValueOnce(response(409, { message: 'No hay entradas disponibles.' }));

    await expect(asignarInvitados(12, [])).rejects.toMatchObject({ status: 409 });
  });
});

describe('fetchInvitados', () => {
  it('usa el namespace mobile', async () => {
    fetchMock.mockResolvedValueOnce(response(200, []));

    await fetchInvitados(12);

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/reservas/12/invitados`);
  });
});

describe('reenviarInvitado', () => {
  // Varios endpoints responden 415 sin Content-Type, aunque no lleven cuerpo.
  it('manda Content-Type aunque no haya cuerpo', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await reenviarInvitado(12, 'abc');

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/reservas/12/invitados/abc/reenviar`);
    expect(initOf().method).toBe('POST');
    expect(initOf().body).toBeUndefined();
    expect(initOf().headers['Content-Type']).toBe('application/json');
  });

  it('lee el Retry-After del 429 para el cooldown', async () => {
    fetchMock.mockResolvedValueOnce(
      response(429, { message: 'Demasiadas solicitudes.' }, { 'Retry-After': '120' }),
    );

    await expect(reenviarInvitado(12, 'abc')).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 120,
    });
  });

  it('deja retryAfterSeconds sin definir si el header no es un número', async () => {
    fetchMock.mockResolvedValueOnce(
      response(429, { message: 'Demasiadas.' }, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }),
    );

    await expect(reenviarInvitado(12, 'abc')).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: undefined,
    });
  });

  it('el 400 de tope de reenvíos llega como InvitadoApiError', async () => {
    fetchMock.mockResolvedValueOnce(response(400, { message: 'Tope de reenvíos alcanzado.' }));

    await expect(reenviarInvitado(12, 'abc')).rejects.toMatchObject({
      status: 400,
      hasFieldErrors: false,
    });
  });
});

describe('editarInvitado', () => {
  it('usa PUT sobre el invitado concreto', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 'abc', nombre: 'Ana' }));

    await editarInvitado(12, 'abc', { nombre: 'Ana', correo: 'ana@x.com' });

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/reservas/12/invitados/abc`);
    expect(initOf().method).toBe('PUT');
  });
});
