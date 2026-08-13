import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearQueryClient, conQueryClient } from '../../../../jest/harness';

import {
  MIS_RESERVAS_QUERY_KEY,
  reservaDetalleQueryKey,
  facturasReservaQueryKey,
  disponibilidadQueryKey,
  aforoDiaQueryKey,
  useMisReservas,
  useReservaDetalle,
  useFacturasReserva,
  useDisponibilidad,
  useAforoDia,
} from '../hooks/useReservasQueries';
import {
  useCrearReserva,
  useRegistrarPago,
  useCancelarReserva,
} from '../hooks/useReservaMutations';
import * as reservasService from '../services/reservas.service';
import * as aforoService from '../services/aforo.service';

/**
 * Las consultas de reservas comparten dos reglas: nada se pide sin sesión
 * iniciada, y cada clave de caché identifica exactamente el recurso (reserva,
 * espacio + día) para que el calendario y la hoja de detalle no se pisen.
 */

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(() => ({ isAuthenticated: true })),
}));

jest.mock('../services/reservas.service', () => ({
  misReservas: jest.fn(),
  reservaDetalle: jest.fn(),
  facturasReserva: jest.fn(),
  fetchDisponibilidad: jest.fn(),
  crearReserva: jest.fn(),
  registrarPago: jest.fn(),
  cancelarReserva: jest.fn(),
}));

jest.mock('../services/aforo.service', () => ({
  fetchAforoDia: jest.fn(),
}));

const { useAuth } = jest.requireMock('@/features/auth');
const reservas = reservasService as jest.Mocked<typeof reservasService>;
const aforo = aforoService as jest.Mocked<typeof aforoService>;

const DIA = new Date(2026, 7, 20);
const reserva = (id = 7) => ({ id }) as never;

let queryClient: QueryClient;

const montar = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: conQueryClient(queryClient) });

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ isAuthenticated: true });
  queryClient = crearQueryClient();
  reservas.misReservas.mockResolvedValue([reserva()]);
  reservas.reservaDetalle.mockResolvedValue(reserva());
  reservas.facturasReserva.mockResolvedValue([]);
  reservas.fetchDisponibilidad.mockResolvedValue({ tarifa: null, horarios: [] } as never);
  reservas.crearReserva.mockResolvedValue(reserva());
  reservas.registrarPago.mockResolvedValue(reserva());
  reservas.cancelarReserva.mockResolvedValue(reserva());
  aforo.fetchAforoDia.mockResolvedValue({ disponible: 10 } as never);
});

afterEach(() => queryClient.clear());

describe('claves de caché', () => {
  it('identifican el recurso sin colisionar entre sí', () => {
    expect(MIS_RESERVAS_QUERY_KEY).toEqual(['reservas', 'mias']);
    expect(reservaDetalleQueryKey(7)).toEqual(['reservas', 7, 'detalle']);
    expect(facturasReservaQueryKey(7)).toEqual(['reservas', 7, 'facturas']);
    expect(disponibilidadQueryKey(10, '2026-08-20')).toEqual([
      'espacios',
      10,
      'disponibilidad',
      '2026-08-20',
    ]);
    expect(aforoDiaQueryKey(10, '2026-08-20')).toEqual(['espacios', 10, 'aforo', '2026-08-20']);
  });
});

describe('sin sesión iniciada', () => {
  beforeEach(() => useAuth.mockReturnValue({ isAuthenticated: false }));

  it('no pide el listado de reservas', async () => {
    await montar(() => useMisReservas());
    expect(reservas.misReservas).not.toHaveBeenCalled();
  });

  it('no pide el detalle de una reserva', async () => {
    await montar(() => useReservaDetalle(7));
    expect(reservas.reservaDetalle).not.toHaveBeenCalled();
  });

  it('no pide las facturas', async () => {
    await montar(() => useFacturasReserva(7));
    expect(reservas.facturasReserva).not.toHaveBeenCalled();
  });

  it('no consulta disponibilidad', async () => {
    await montar(() => useDisponibilidad(10, DIA));
    expect(reservas.fetchDisponibilidad).not.toHaveBeenCalled();
  });

  it('no consulta aforo', async () => {
    await montar(() => useAforoDia(10, DIA, true));
    expect(aforo.fetchAforoDia).not.toHaveBeenCalled();
  });
});

describe('con sesión iniciada', () => {
  it('carga el listado del calendario', async () => {
    const { result } = await montar(() => useMisReservas());

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(queryClient.getQueryData(MIS_RESERVAS_QUERY_KEY)).toHaveLength(1);
  });

  it('carga el detalle de la reserva pedida', async () => {
    const { result } = await montar(() => useReservaDetalle(7));

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(reservas.reservaDetalle).toHaveBeenCalledWith(7);
  });

  it('no pide el detalle si el id todavía no llegó', async () => {
    await montar(() => useReservaDetalle(0));
    expect(reservas.reservaDetalle).not.toHaveBeenCalled();
  });

  it('carga las facturas de la reserva', async () => {
    const { result } = await montar(() => useFacturasReserva(7));

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(reservas.facturasReserva).toHaveBeenCalledWith(7);
  });

  it('no pide facturas sin id de reserva', async () => {
    await montar(() => useFacturasReserva(0));
    expect(reservas.facturasReserva).not.toHaveBeenCalled();
  });

  it('consulta la disponibilidad con la fecha en formato del backend', async () => {
    const { result } = await montar(() => useDisponibilidad(10, DIA));

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(reservas.fetchDisponibilidad).toHaveBeenCalledWith(10, '2026-08-20');
  });

  it('no consulta disponibilidad sin espacio', async () => {
    await montar(() => useDisponibilidad(null, DIA));
    expect(reservas.fetchDisponibilidad).not.toHaveBeenCalled();
  });

  it('no consulta disponibilidad sin día elegido', async () => {
    await montar(() => useDisponibilidad(10, null));
    expect(reservas.fetchDisponibilidad).not.toHaveBeenCalled();
  });

  it('el aforo solo se consulta en espacios de cupo compartido', async () => {
    await montar(() => useAforoDia(10, DIA, false));
    expect(aforo.fetchAforoDia).not.toHaveBeenCalled();
  });

  it('consulta el aforo del día cuando corresponde', async () => {
    const { result } = await montar(() => useAforoDia(10, DIA, true));

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(aforo.fetchAforoDia).toHaveBeenCalledWith(10, '2026-08-20');
  });
});

describe('mutaciones de reserva', () => {
  it('crear invalida el calendario y el detalle de la reserva nueva', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await montar(() => useCrearReserva());

    await result.current.mutateAsync({
      input: { espacioId: 10 } as never,
      usuarioId: 'u-1',
    });

    expect(invalidar).toHaveBeenCalledWith({ queryKey: MIS_RESERVAS_QUERY_KEY });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: reservaDetalleQueryKey(7) });
  });

  it('registrar el pago invalida el calendario y esa reserva', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await montar(() => useRegistrarPago());

    await result.current.mutateAsync({ reservaId: 7, monto: 66 });

    expect(reservas.registrarPago).toHaveBeenCalledWith(7, 66);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: reservaDetalleQueryKey(7) });
  });

  it('cancelar invalida el calendario y esa reserva', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await montar(() => useCancelarReserva());

    await result.current.mutateAsync({ reservaId: 7, motivo: 'Cliente canceló' });

    expect(reservas.cancelarReserva).toHaveBeenCalledWith(7, 'Cliente canceló');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: MIS_RESERVAS_QUERY_KEY });
  });

  it('no invalida invitados ni facturas: esas no cambian al mover una reserva', async () => {
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await montar(() => useCancelarReserva());

    await result.current.mutateAsync({ reservaId: 7, motivo: 'Cliente canceló' });

    const claves = invalidar.mock.calls.map(([arg]) => JSON.stringify(arg?.queryKey));
    expect(claves).not.toContain(JSON.stringify(facturasReservaQueryKey(7)));
  });
});
