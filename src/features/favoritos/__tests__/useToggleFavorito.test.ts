import { MutationObserver, QueryClient } from '@tanstack/react-query';

import { setTokenProvider } from '@/shared/api/client';

import { FAVORITOS_QUERY_KEY } from '../hooks/useFavoritos';
import { toggleFavoritoOptions } from '../hooks/useFavoritoMutations';

/**
 * Se prueba con `MutationObserver` en vez de `renderHook`: es el mismo código
 * de `onMutate`/`onError`/`onSettled` que ejecuta `useMutation`, pero sin
 * montar un árbol de React (el `renderHook` de @testing-library/react-native 14
 * no funciona con React 19 / RN 0.85 en este proyecto).
 */

let queryClient: QueryClient;
const fetchMock = jest.fn();

const favoritosEnCache = () => queryClient.getQueryData<number[]>(FAVORITOS_QUERY_KEY);

function toggle(vars: { espacioId: number; esFavorito: boolean }) {
  return new MutationObserver(queryClient, toggleFavoritoOptions(queryClient)).mutate(vars);
}

/** `onMutate` es async (espera a `cancelQueries`): un solo tick no alcanza. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function response(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: '',
    headers: {} as Headers,
    text: async () => '',
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setTokenProvider({
    getAccessToken: async () => 'token',
    refresh: async () => 'token-nuevo',
    onAuthFailure: async () => {},
  });
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  queryClient.setQueryData<number[]>(FAVORITOS_QUERY_KEY, [1, 2]);
});

afterEach(() => {
  setTokenProvider(null);
  queryClient.clear();
});

describe('toggle de favorito', () => {
  it('añade el espacio al cache antes de que responda la red', async () => {
    let resolver: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>(r => (resolver = r)));

    const enVuelo = toggle({ espacioId: 9, esFavorito: false });

    // Todavía no respondió el backend y el corazón ya está marcado.
    await flush();
    expect(favoritosEnCache()).toEqual([1, 2, 9]);

    resolver(response(204));
    await enVuelo;
    expect(favoritosEnCache()).toEqual([1, 2, 9]);
  });

  it('lo quita del cache al desmarcar', async () => {
    fetchMock.mockResolvedValue(response(204));

    await toggle({ espacioId: 2, esFavorito: true });

    expect(favoritosEnCache()).toEqual([1]);
  });

  it('revierte el cache si la petición falla', async () => {
    fetchMock.mockResolvedValue(response(500));

    await expect(toggle({ espacioId: 9, esFavorito: false })).rejects.toBeDefined();

    expect(favoritosEnCache()).toEqual([1, 2]);
  });

  it('revierte también al desmarcar si falla', async () => {
    fetchMock.mockResolvedValue(response(500));

    await expect(toggle({ espacioId: 2, esFavorito: true })).rejects.toBeDefined();

    expect(favoritosEnCache()).toEqual([1, 2]);
  });

  it('usa DELETE al quitar y POST al marcar', async () => {
    fetchMock.mockResolvedValue(response(204));

    await toggle({ espacioId: 2, esFavorito: true });
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');

    await toggle({ espacioId: 5, esFavorito: false });
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  });

  it('no reintenta un 4xx: el corazón revierte a la primera', async () => {
    fetchMock.mockResolvedValue(response(409));

    await expect(toggle({ espacioId: 9, esFavorito: false })).rejects.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(favoritosEnCache()).toEqual([1, 2]);
  });
});
