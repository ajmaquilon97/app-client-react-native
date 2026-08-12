import { setTokenProvider } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/config/api';

import { ResenaApiError } from '../errors';
import {
  actualizarResena,
  crearResena,
  eliminarResena,
  fetchResenasEspacio,
  fetchReservasResenables,
} from '../services/resenas.service';

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

function urlOf(call = 0): string {
  return fetchMock.mock.calls[call][0];
}

function initOf(call = 0): RequestInit & { headers: Record<string, string> } {
  return fetchMock.mock.calls[call][1];
}

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

describe('fetchResenasEspacio', () => {
  it('es público: no manda Authorization', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [{ id: 1 }]));

    await fetchResenasEspacio(7);

    expect(urlOf()).toBe(`${API_BASE_URL}/espacios/7/resenas`);
    expect(initOf().headers.Authorization).toBeUndefined();
  });

  it('devuelve la lista tal cual la ordena el servidor', async () => {
    const delServidor = [{ id: 2 }, { id: 1 }];
    fetchMock.mockResolvedValueOnce(response(200, delServidor));

    await expect(fetchResenasEspacio(7)).resolves.toEqual(delServidor);
  });
});

describe('fetchReservasResenables', () => {
  it('pega al endpoint autenticado de reservas disponibles', async () => {
    fetchMock.mockResolvedValueOnce(response(200, []));

    await fetchReservasResenables(7);

    expect(urlOf()).toBe(`${API_BASE_URL}/espacios/7/resenas/reservas-disponibles`);
    expect(initOf().headers.Authorization).toBe('Bearer token');
  });
});

describe('crearResena', () => {
  it('manda el input como cuerpo JSON', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 9 }));
    const input = { reservaId: 3, titulo: 'Genial', descripcion: 'Todo bien', calificacion: 5 };

    await expect(crearResena(7, input)).resolves.toEqual({ id: 9 });

    expect(initOf().method).toBe('POST');
    expect(initOf().body).toBe(JSON.stringify(input));
  });

  it('expone fieldErrors en un 400 de validación', async () => {
    fetchMock.mockResolvedValueOnce(
      response(400, {
        message: 'Los datos proporcionados no son válidos.',
        errors: { titulo: ['El título es obligatorio.'] },
      }),
    );

    const promesa = crearResena(7, {
      reservaId: 3,
      titulo: '',
      descripcion: 'x',
      calificacion: 5,
    });

    await expect(promesa).rejects.toBeInstanceOf(ResenaApiError);
    await expect(promesa).rejects.toMatchObject({
      status: 400,
      fieldErrors: { titulo: ['El título es obligatorio.'] },
    });
  });

  it('propaga el 409 de "esta reserva ya tiene reseña" con su mensaje', async () => {
    fetchMock.mockResolvedValueOnce(response(409, { message: 'Esa reserva ya fue reseñada.' }));

    await expect(
      crearResena(7, { reservaId: 3, titulo: 'a', descripcion: 'b', calificacion: 4 }),
    ).rejects.toMatchObject({ status: 409, message: 'Esa reserva ya fue reseñada.' });
  });
});

describe('actualizarResena', () => {
  it('usa PUT sobre la reseña concreta', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 9 }));

    await actualizarResena(7, 9, { titulo: 'Otro', descripcion: 'Otro', calificacion: 4 });

    expect(urlOf()).toBe(`${API_BASE_URL}/espacios/7/resenas/9`);
    expect(initOf().method).toBe('PUT');
  });
});

describe('eliminarResena', () => {
  it('usa DELETE y tolera la respuesta sin cuerpo', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await expect(eliminarResena(7, 9)).resolves.toBeUndefined();

    expect(urlOf()).toBe(`${API_BASE_URL}/espacios/7/resenas/9`);
    expect(initOf().method).toBe('DELETE');
  });

  it('un DELETE repetido devuelve 404, no 200', async () => {
    fetchMock.mockResolvedValueOnce(response(404, { message: 'La reseña no existe.' }));

    await expect(eliminarResena(7, 9)).rejects.toMatchObject({ status: 404 });
  });
});
