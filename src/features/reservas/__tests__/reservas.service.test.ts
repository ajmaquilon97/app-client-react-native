import { setTokenProvider } from '@/shared/api/client';
import { API_BASE_URL } from '@/shared/config/api';

import { fetchAforoDia } from '../services/aforo.service';
import {
  cancelarReserva,
  crearReserva,
  facturasDescarga,
  facturasReserva,
  fetchDisponibilidad,
  misReservas,
  registrarPago,
  reservaDetalle,
} from '../services/reservas.service';

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

describe('fetchDisponibilidad', () => {
  it('manda la fecha como query param del namespace mobile', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { espacioId: 4, horas: [] }));

    await fetchDisponibilidad(4, '2026-08-12');

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/espacios/4/disponibilidad?fecha=2026-08-12`);
  });
});

describe('crearReserva', () => {
  // Backend usa el claim `sub` del JWT, pero su validación exige el campo igual.
  it('incluye usuarioId en el cuerpo aunque el backend lo ignore', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 77 }));
    const input = {
      espacioId: 4,
      fechaInicio: '2026-08-12T09:00:00',
      fechaFin: '2026-08-12T11:00:00',
      totalHoras: 2,
    };

    await crearReserva(input, 'usuario-abc');

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/reservas`);
    expect(JSON.parse(initOf().body as string)).toMatchObject({
      espacioId: 4,
      usuarioId: 'usuario-abc',
    });
  });

  it('propaga el 409 de aforo excedido', async () => {
    fetchMock.mockResolvedValueOnce(response(409, { message: 'No hay cupo suficiente.' }));

    await expect(
      crearReserva(
        { espacioId: 4, fechaInicio: 'x', fechaFin: 'x', totalHoras: 0, pax: 50 },
        'u',
      ),
    ).rejects.toMatchObject({ status: 409, message: 'No hay cupo suficiente.' });
  });
});

describe('misReservas y reservaDetalle', () => {
  it('usan el namespace no-mobile', async () => {
    fetchMock.mockResolvedValueOnce(response(200, []));
    await misReservas();
    expect(urlOf()).toBe(`${API_BASE_URL}/reservas/mias`);

    fetchMock.mockResolvedValueOnce(response(200, { id: 3 }));
    await reservaDetalle(3);
    expect(urlOf(1)).toBe(`${API_BASE_URL}/reservas/3`);
  });
});

describe('facturasReserva', () => {
  // Un 404 aquí significa "aún no tiene facturas", no un fallo.
  it('devuelve [] ante un 404 en vez de lanzar', async () => {
    fetchMock.mockResolvedValueOnce(response(404, { message: 'No encontrada' }));

    await expect(facturasReserva(3)).resolves.toEqual([]);
  });

  it('sigue lanzando ante otros errores', async () => {
    fetchMock.mockResolvedValueOnce(response(500));

    await expect(facturasReserva(3)).rejects.toMatchObject({ status: 500 });
  });

  it('devuelve las facturas cuando existen', async () => {
    fetchMock.mockResolvedValueOnce(response(200, [{ id: 'f1', estado: 'Autorizada' }]));

    await expect(facturasReserva(3)).resolves.toHaveLength(1);
  });
});

describe('facturasDescarga', () => {
  it('usa el endpoint plural del namespace mobile', async () => {
    fetchMock.mockResolvedValueOnce(response(200, []));

    await facturasDescarga(3);

    expect(urlOf()).toBe(`${API_BASE_URL}/mobile/reservas/3/facturas`);
  });

  // A diferencia de facturasReserva, aquí el 404 sí es un error a mostrar.
  it('propaga el 404 con el mensaje ya redactado del backend', async () => {
    fetchMock.mockResolvedValueOnce(
      response(404, { message: 'La reserva todavía no tiene facturas emitidas.' }),
    );

    await expect(facturasDescarga(3)).rejects.toMatchObject({
      status: 404,
      message: 'La reserva todavía no tiene facturas emitidas.',
    });
  });
});

describe('cancelarReserva y registrarPago', () => {
  it('cancelar manda el motivo', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 3, estado: 'cancelada' }));

    await cancelarReserva(3, 'Cliente canceló el pago');

    expect(urlOf()).toBe(`${API_BASE_URL}/reservas/3/cancelar`);
    expect(JSON.parse(initOf().body as string)).toEqual({ motivo: 'Cliente canceló el pago' });
  });

  it('registrar pago manda monto y tipo total', async () => {
    fetchMock.mockResolvedValueOnce(response(200, { id: 3 }));

    await registrarPago(3, 27.5);

    expect(JSON.parse(initOf().body as string)).toEqual({ monto: 27.5, tipo: 'total' });
  });
});

describe('fetchAforoDia', () => {
  it('manda espacioId y fecha como query params', async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, { fecha: '2026-08-12', capacidadTotal: 50, vendida: 8, disponible: 42 }),
    );

    const aforo = await fetchAforoDia(4, '2026-08-12');

    expect(urlOf()).toBe(`${API_BASE_URL}/aforo/dia?espacioId=4&fecha=2026-08-12`);
    expect(aforo.disponible).toBe(42);
  });
});
