import { api, setTokenProvider, TokenProvider } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { API_BASE_URL } from '@/shared/config/api';

function response(status: number, body?: unknown): Response {
  const text =
    body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);

  return {
    ok: status >= 200 && status < 300,
    status,
    url: `${API_BASE_URL}/test`,
    headers: {} as Headers,
    text: async () => text,
  } as unknown as Response;
}

const fetchMock = jest.fn();

function fakeProvider(overrides: Partial<TokenProvider> = {}): TokenProvider {
  return {
    getAccessToken: jest.fn(async () => 'token-viejo'),
    refresh: jest.fn(async () => 'token-nuevo'),
    onAuthFailure: jest.fn(async () => {}),
    ...overrides,
  };
}

function authHeaderOf(call: number): string | undefined {
  return (fetchMock.mock.calls[call][1].headers as Record<string, string>).Authorization;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setTokenProvider(fakeProvider());
});

afterEach(() => {
  setTokenProvider(null);
});

describe('api', () => {
  it('manda el token en las peticiones autenticadas', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [{ id: 1 }]));

    const data = await api.get<{ id: number }[]>('/mobile/espacios', { fallback: 'falló' });

    expect(data).toEqual([{ id: 1 }]);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/mobile/espacios`);
    expect(authHeaderOf(0)).toBe('Bearer token-viejo');
  });

  it('no pide token ni manda Authorization cuando auth es false', async () => {
    const provider = fakeProvider();
    setTokenProvider(provider);
    fetchMock.mockResolvedValueOnce(response(200, []));

    await api.get('/espacios/1/resenas', { fallback: 'falló', auth: false });

    expect(provider.getAccessToken).not.toHaveBeenCalled();
    expect(authHeaderOf(0)).toBeUndefined();
  });

  it('omite los parámetros de query nulos', async () => {
    fetchMock.mockResolvedValueOnce(response(200, {}));

    await api.get('/aforo/dia', {
      fallback: 'falló',
      query: { espacioId: 7, fecha: '2026-08-11', listaId: undefined },
    });

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/aforo/dia?espacioId=7&fecha=2026-08-11`);
  });

  it('refresca el token y reintenta una sola vez ante un 401', async () => {
    const provider = fakeProvider();
    setTokenProvider(provider);
    fetchMock
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200, { id: 3 }));

    const data = await api.get<{ id: number }>('/mobile/reservas/mias', { fallback: 'falló' });

    expect(data).toEqual({ id: 3 });
    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(authHeaderOf(1)).toBe('Bearer token-nuevo');
    expect(provider.onAuthFailure).not.toHaveBeenCalled();
  });

  it('cierra la sesión si el reintento vuelve a dar 401', async () => {
    const provider = fakeProvider();
    setTokenProvider(provider);
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(401));

    await expect(api.get('/mobile/reservas/mias', { fallback: 'sesión caída' })).rejects.toThrow(
      ApiError,
    );
    expect(provider.onAuthFailure).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cierra la sesión si el propio refresh falla', async () => {
    const provider = fakeProvider({
      refresh: jest.fn(async () => {
        throw new Error('refresh token revocado');
      }),
    });
    setTokenProvider(provider);
    fetchMock.mockResolvedValueOnce(response(401));

    await expect(api.get('/mobile/favoritos', { fallback: 'falló' })).rejects.toThrow(ApiError);
    expect(provider.onAuthFailure).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('usa el mensaje del backend y conserva el status', async () => {
    fetchMock.mockResolvedValueOnce(response(409, { message: 'Ya reseñaste esta reserva.' }));

    await expect(
      api.post('/espacios/1/resenas', { fallback: 'genérico', body: {} }),
    ).rejects.toMatchObject({ message: 'Ya reseñaste esta reserva.', status: 409 });
  });

  it('entiende el string JSON crudo que devuelve ASP.NET en un BadRequest', async () => {
    fetchMock.mockResolvedValueOnce(response(400, 'El código ya expiró.'));

    await expect(api.post('/mobile/auth/recepcion', { fallback: 'genérico' })).rejects.toMatchObject(
      { message: 'El código ya expiró.', status: 400 },
    );
  });

  it('cae al mensaje por defecto cuando el backend no manda cuerpo', async () => {
    fetchMock.mockResolvedValueOnce(response(500));

    await expect(api.get('/mobile/espacios', { fallback: 'No se pudo cargar.' })).rejects.toMatchObject(
      { message: 'No se pudo cargar.', status: 500 },
    );
  });

  it('permite a un dominio construir su propia subclase de error', async () => {
    class ResenaApiError extends ApiError {
      fieldErrors?: Record<string, string[]>;
      constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
        super(message, status);
        this.fieldErrors = fieldErrors;
      }
    }

    fetchMock.mockResolvedValueOnce(
      response(400, { message: 'Datos inválidos', errors: { titulo: ['Obligatorio'] } }),
    );

    const promise = api.post('/espacios/1/resenas', {
      fallback: 'falló',
      body: {},
      makeError: ({ message, status, body }) =>
        new ResenaApiError(message, status, (body as { errors?: Record<string, string[]> })?.errors),
    });

    await expect(promise).rejects.toBeInstanceOf(ResenaApiError);
    await expect(promise).rejects.toMatchObject({ fieldErrors: { titulo: ['Obligatorio'] } });
  });

  it('devuelve undefined en un 204 sin reventar al parsear', async () => {
    fetchMock.mockResolvedValueOnce(response(204));

    await expect(api.del('/espacios/1/resenas/9', { fallback: 'falló' })).resolves.toBeUndefined();
  });

  it('serializa el cuerpo como JSON y declara el Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 1 }));

    await api.post('/mobile/reservas', { fallback: 'falló', body: { espacioId: 4 } });

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ espacioId: 4 }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('falla claro si nadie registró el proveedor de token', async () => {
    setTokenProvider(null);

    await expect(api.get('/mobile/espacios', { fallback: 'falló' })).rejects.toThrow(
      /TokenProvider/,
    );
  });
});
