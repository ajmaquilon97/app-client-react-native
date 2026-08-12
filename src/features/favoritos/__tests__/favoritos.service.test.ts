import { setTokenProvider } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/config/api';

import {
  crearListaFavoritos,
  eliminarListaFavoritos,
  fetchFavoritos,
  fetchListaFavoritosDetalle,
  fetchListasFavoritos,
  marcarFavorito,
  quitarFavorito,
} from '../services/favoritos.service';

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

describe('fetchFavoritos', () => {
  it('devuelve el arreglo plano de espacioId', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [3, 7, 11]));

    await expect(fetchFavoritos()).resolves.toEqual([3, 7, 11]);
    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/favoritos`);
  });
});

describe('marcarFavorito', () => {
  // El endpoint responde 415 sin Content-Type y 400 con un body de 0 bytes,
  // aunque listaId sea opcional: por eso sin lista se manda `{}`.
  it('manda `{}` cuando no hay listaId, no un body vacío', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await marcarFavorito(5);

    expect(initOf().method).toBe('POST');
    expect(initOf().body).toBe('{}');
    expect(initOf().headers['Content-Type']).toBe('application/json');
    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/espacios/5/favorito`);
  });

  it('manda el listaId cuando se guarda en una lista concreta', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await marcarFavorito(5, 42);

    expect(initOf().body).toBe(JSON.stringify({ listaId: 42 }));
  });
});

describe('quitarFavorito', () => {
  it('sin listaId no añade query: quita de todas las listas', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await quitarFavorito(5);

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/espacios/5/favorito`);
    expect(initOf().method).toBe('DELETE');
  });

  it('con listaId lo quita solo de esa lista', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await quitarFavorito(5, 42);

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/espacios/5/favorito?listaId=42`);
  });
});

describe('listas de favoritos', () => {
  it('lista las wishlists del usuario', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [{ id: 1, nombre: 'Canchas' }]));

    await fetchListasFavoritos();

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/listas-favoritos`);
  });

  it('crea una lista mandando el nombre', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 9, nombre: 'Cumpleaños' }));

    await expect(crearListaFavoritos('Cumpleaños')).resolves.toMatchObject({ id: 9 });
    expect(initOf().body).toBe(JSON.stringify({ nombre: 'Cumpleaños' }));
  });

  it('propaga el 400 de nombre inválido con el mensaje del backend', async () => {
    fetchMock.mockResolvedValueOnce(response(400, 'El nombre no puede estar vacío.'));

    await expect(crearListaFavoritos('   ')).rejects.toMatchObject({
      status: 400,
      message: 'El nombre no puede estar vacío.',
    });
  });

  it('pide el detalle de una lista', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 9, espacioIds: [4, 2] }));

    await expect(fetchListaFavoritosDetalle(9)).resolves.toMatchObject({ espacioIds: [4, 2] });
    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/listas-favoritos/9`);
  });

  it('elimina una lista y tolera el 204 sin cuerpo', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await expect(eliminarListaFavoritos(9)).resolves.toBeUndefined();
    expect(initOf().method).toBe('DELETE');
  });
});
