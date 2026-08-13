import { Alert } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { crearQueryClient, conQueryClient } from '../../../../jest/harness';
import { Espacio } from '@/features/espacios';

import { useReservaFlow } from '../hooks/useReservaFlow';
import { disponibilidadQueryKey, aforoDiaQueryKey } from '../hooks/useReservasQueries';
import * as reservasService from '../services/reservas.service';
import * as aforoService from '../services/aforo.service';

/**
 * `useReservaFlow` es la máquina de estados de la reserva: selección → creación
 * → pago. Concentra las reglas de negocio del cliente móvil (validaciones,
 * cálculo del total con comisión, tope por aforo, liberación de la reserva al
 * abandonar el pago), así que es el hook con más peso funcional de la app.
 */

jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, isAuthenticated: true }),
}));

jest.mock('../services/reservas.service', () => ({
  fetchDisponibilidad: jest.fn(),
  misReservas: jest.fn(),
  reservaDetalle: jest.fn(),
  facturasReserva: jest.fn(),
  crearReserva: jest.fn(),
  registrarPago: jest.fn(),
  cancelarReserva: jest.fn(),
}));

jest.mock('../services/aforo.service', () => ({
  fetchAforoDia: jest.fn(),
}));

const reservas = reservasService as jest.Mocked<typeof reservasService>;
const aforo = aforoService as jest.Mocked<typeof aforoService>;

const DIA = new Date(2026, 7, 20); // 20/08/2026, hora local

function espacio(overrides: Partial<Espacio> = {}): Espacio {
  return {
    id: 10,
    nombre: 'Cancha El Campín',
    categoria: 'canchas',
    subcategoria: 'Cancha de fútbol',
    ubicacion: 'Guayaquil',
    precio: 20,
    unidad: 'hora',
    rating: 4.5,
    reviews: 12,
    distancia: 1.2,
    disponibleHoy: true,
    imagen: 'https://cdn/x.jpg',
    imagenes: [],
    maxCapacidad: 22,
    validarAforo: false,
    latitud: null,
    longitud: null,
    anfitrion: { nombre: 'Carlos', registro: 'Miembro desde 2021' },
    descripcion: '',
    ...overrides,
  } as Espacio;
}

const reserva = (id = 99, total = 100) =>
  ({ id, pago: { total } }) as unknown as Awaited<ReturnType<typeof reservasService.crearReserva>>;

const TARIFA = { precio: 20, modalidad: null, unidad: 'hora', esPromocion: false };

let queryClient: QueryClient;
let onReservaPagada: jest.Mock;
let alertSpy: jest.SpyInstance;

/** Monta el flujo y espera a que la disponibilidad del día ya esté en caché. */
async function montarFlujo(opciones: { espacio?: Espacio; visible?: boolean } = {}) {
  const { result } = await renderHook(
    () =>
      useReservaFlow({
        espacio: opciones.espacio ?? espacio(),
        visible: opciones.visible ?? true,
        onReservaPagada,
      }),
    { wrapper: conQueryClient(queryClient) },
  );
  return result;
}

/** Elige día y franja horaria: el punto de partida de casi todos los casos. */
async function elegirFranja(
  result: { current: ReturnType<typeof useReservaFlow> },
  desde = 10,
  hasta = 12,
) {
  await act(async () => result.current.setSelectedDate(DIA));
  await waitFor(() => expect(result.current.disponibilidad).not.toBeNull());
  await act(async () => result.current.handleChangeHoraDesde(desde));
  await act(async () => result.current.setHoraHasta(hasta));
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = crearQueryClient();
  onReservaPagada = jest.fn();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  reservas.fetchDisponibilidad.mockResolvedValue({
    tarifa: TARIFA,
    horarios: [],
  } as never);
  aforo.fetchAforoDia.mockResolvedValue({ capacidad: 50, ocupado: 10, disponible: 40 } as never);
  reservas.crearReserva.mockResolvedValue(reserva());
  reservas.registrarPago.mockResolvedValue(reserva());
  reservas.cancelarReserva.mockResolvedValue(reserva());
});

afterEach(() => {
  alertSpy.mockRestore();
  queryClient.clear();
});

describe('modalidad del espacio', () => {
  it('trata como franja exclusiva a una cancha', async () => {
    const result = await montarFlujo();

    expect(result.current.modalidad).toBe('franja_exclusiva');
    expect(result.current.esCupoCompartido).toBe(false);
  });

  it('trata como cupo compartido a una piscina', async () => {
    const result = await montarFlujo({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });

    expect(result.current.esCupoCompartido).toBe(true);
  });

  it('no consulta el aforo en espacios de franja exclusiva', async () => {
    const result = await montarFlujo();
    await act(async () => result.current.setSelectedDate(DIA));

    await waitFor(() => expect(reservas.fetchDisponibilidad).toHaveBeenCalled());
    expect(aforo.fetchAforoDia).not.toHaveBeenCalled();
  });
});

describe('selección de horario', () => {
  it('descarta la hora final si queda antes de la nueva hora inicial', async () => {
    const result = await montarFlujo();
    await elegirFranja(result, 10, 12);
    expect(result.current.horaHasta).toBe(12);

    await act(async () => result.current.handleChangeHoraDesde(14));

    expect(result.current.horaDesde).toBe(14);
    expect(result.current.horaHasta).toBeNull();
  });

  it('conserva la hora final si sigue siendo posterior', async () => {
    const result = await montarFlujo();
    await elegirFranja(result, 10, 18);

    await act(async () => result.current.handleChangeHoraDesde(12));

    expect(result.current.horaHasta).toBe(18);
  });
});

describe('cálculo del total', () => {
  it('cobra por hora y añade la comisión de servicio', async () => {
    const result = await montarFlujo();
    await elegirFranja(result, 10, 13);

    expect(result.current.cantidadHoras).toBe(3);
    expect(result.current.subtotal).toBe(60);
    // Comisión de servicio del 10% (SERVICE_FEE_RATE).
    expect(result.current.comision).toBeCloseTo(6, 5);
    expect(result.current.total).toBeCloseTo(66, 5);
  });

  it('usa la tarifa del día por encima del precio de catálogo', async () => {
    reservas.fetchDisponibilidad.mockResolvedValue({
      tarifa: { ...TARIFA, precio: 35, esPromocion: true },
      horarios: [],
    } as never);
    const result = await montarFlujo();
    await elegirFranja(result, 10, 12);

    expect(result.current.precioDelDia).toBe(35);
    expect(result.current.subtotal).toBe(70);
  });

  it('deja el total en cero mientras no haya franja elegida', async () => {
    const result = await montarFlujo();

    expect(result.current.subtotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('cobra por entrada en cupo compartido', async () => {
    const result = await montarFlujo({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });
    await act(async () => result.current.setSelectedDate(DIA));
    await waitFor(() => expect(result.current.aforo).not.toBeNull());
    await act(async () => result.current.setCantidadEntradas(4));

    expect(result.current.cantidadUnidades).toBe(4);
    expect(result.current.subtotal).toBe(80);
  });
});

describe('tope por aforo', () => {
  it('recorta la cantidad de entradas al aforo disponible', async () => {
    aforo.fetchAforoDia.mockResolvedValue({ capacidad: 50, ocupado: 47, disponible: 3 } as never);
    const result = await montarFlujo({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });
    await act(async () => result.current.setSelectedDate(DIA));
    await waitFor(() => expect(result.current.aforo).not.toBeNull());

    await act(async () => result.current.setCantidadEntradas(10));

    expect(result.current.cantidadEntradas).toBe(3);
  });

  it('nunca deja el tope en cero: el mínimo consultable es una entrada', async () => {
    aforo.fetchAforoDia.mockResolvedValue({ capacidad: 50, ocupado: 50, disponible: 0 } as never);
    const result = await montarFlujo({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });
    await act(async () => result.current.setSelectedDate(DIA));
    await waitFor(() => expect(result.current.aforo).not.toBeNull());

    await act(async () => result.current.setCantidadEntradas(5));

    expect(result.current.cantidadEntradas).toBe(1);
  });
});

describe('validaciones antes de reservar', () => {
  it('exige elegir el día', async () => {
    const result = await montarFlujo();

    await act(async () => result.current.reservar());

    expect(alertSpy).toHaveBeenCalledWith(
      'Faltan datos',
      'Elige el día para tu reserva.',
      expect.anything(),
    );
    expect(reservas.crearReserva).not.toHaveBeenCalled();
  });

  it('exige el rango de horas en franja exclusiva', async () => {
    const result = await montarFlujo();
    await act(async () => result.current.setSelectedDate(DIA));

    await act(async () => result.current.reservar());

    expect(alertSpy).toHaveBeenCalledWith(
      'Faltan datos',
      'Elige el rango de horas (desde–hasta) para tu reserva.',
      expect.anything(),
    );
  });

  it('bloquea la reserva si el día elegido no tiene tarifa', async () => {
    reservas.fetchDisponibilidad.mockResolvedValue({ tarifa: null, horarios: [] } as never);
    const result = await montarFlujo();
    await act(async () => result.current.setSelectedDate(DIA));
    await waitFor(() => expect(result.current.disponibilidad).not.toBeNull());
    await act(async () => result.current.handleChangeHoraDesde(10));
    await act(async () => result.current.setHoraHasta(12));

    await act(async () => result.current.reservar());

    expect(alertSpy).toHaveBeenCalledWith(
      'Tarifa no disponible',
      expect.stringContaining('no tiene una tarifa configurada'),
      expect.anything(),
    );
    expect(reservas.crearReserva).not.toHaveBeenCalled();
  });

  it('no hace nada si todavía no hay espacio cargado', async () => {
    const { result } = await renderHook(
      () => useReservaFlow({ espacio: null, visible: true, onReservaPagada }),
      { wrapper: conQueryClient(queryClient) },
    );

    await act(async () => result.current.reservar());

    expect(alertSpy).not.toHaveBeenCalled();
    expect(reservas.crearReserva).not.toHaveBeenCalled();
  });
});

describe('creación de la reserva', () => {
  it('manda la franja horaria local y el total de horas', async () => {
    const result = await montarFlujo();
    await elegirFranja(result, 10, 12);

    await act(async () => result.current.reservar());

    await waitFor(() => expect(reservas.crearReserva).toHaveBeenCalled());
    const [input, usuarioId] = reservas.crearReserva.mock.calls[0];
    expect(input).toMatchObject({
      espacioId: 10,
      fechaInicio: '2026-08-20T10:00:00',
      fechaFin: '2026-08-20T12:00:00',
      totalHoras: 2,
    });
    expect(usuarioId).toBe('u-1');
  });

  it('en cupo compartido manda el día completo, sin franja, con pax', async () => {
    const result = await montarFlujo({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });
    await act(async () => result.current.setSelectedDate(DIA));
    await waitFor(() => expect(result.current.aforo).not.toBeNull());
    await act(async () => result.current.setCantidadEntradas(2));

    await act(async () => result.current.reservar());

    await waitFor(() => expect(reservas.crearReserva).toHaveBeenCalled());
    expect(reservas.crearReserva.mock.calls[0][0]).toMatchObject({
      fechaInicio: '2026-08-20T00:00:00',
      fechaFin: '2026-08-20T00:00:00',
      totalHoras: 0,
      pax: 2,
    });
  });

  it('factura a consumidor final cuando el cliente no llena sus datos', async () => {
    const result = await montarFlujo();
    await elegirFranja(result);

    await act(async () => result.current.reservar());

    await waitFor(() => expect(reservas.crearReserva).toHaveBeenCalled());
    expect(reservas.crearReserva.mock.calls[0][0].facturacion).toEqual({
      identificacion: '9999999999999',
      nombre: 'Consumidor Final',
      correo: '',
    });
  });

  it('usa los datos de facturación del cliente si llenó aunque sea uno', async () => {
    const result = await montarFlujo();
    await elegirFranja(result);
    await act(async () => result.current.setIdentificacionFacturacion(' 0912345678 '));

    await act(async () => result.current.reservar());

    await waitFor(() => expect(reservas.crearReserva).toHaveBeenCalled());
    expect(reservas.crearReserva.mock.calls[0][0].facturacion).toEqual({
      identificacion: '0912345678',
      nombre: '',
      correo: '',
    });
  });

  it('abre el pago con la reserva recién creada', async () => {
    const result = await montarFlujo();
    await elegirFranja(result);

    await act(async () => result.current.reservar());

    await waitFor(() => expect(result.current.showPayment).toBe(true));
    expect(result.current.reservaCreada).toMatchObject({ id: 99 });
  });

  it('avisa y no abre el pago si el backend rechaza la reserva', async () => {
    reservas.crearReserva.mockRejectedValue(new Error('El horario ya fue tomado.'));
    const result = await montarFlujo();
    await elegirFranja(result);

    await act(async () => result.current.reservar());

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'No se pudo crear la reserva',
        'El horario ya fue tomado.',
        expect.anything(),
      ),
    );
    expect(result.current.showPayment).toBe(false);
  });
});

describe('confirmación del pago', () => {
  async function llegarAlPago() {
    const result = await montarFlujo();
    await elegirFranja(result);
    await act(async () => result.current.reservar());
    await waitFor(() => expect(result.current.showPayment).toBe(true));
    return result;
  }

  it('registra el pago y cierra el flujo', async () => {
    const result = await llegarAlPago();

    await act(async () => result.current.confirmarPago());

    await waitFor(() => expect(reservas.registrarPago).toHaveBeenCalledWith(99, 100));
    expect(onReservaPagada).toHaveBeenCalled();
    expect(result.current.showPayment).toBe(false);
    expect(result.current.selectedDate).toBeNull();
  });

  it('no vuelve a registrar el pago si la pasarela ya lo confirmó en backend', async () => {
    const result = await llegarAlPago();

    await act(async () => result.current.confirmarPago({ pagoYaRegistrado: true }));

    expect(reservas.registrarPago).not.toHaveBeenCalled();
    expect(onReservaPagada).toHaveBeenCalled();
  });

  it('cierra el flujo igual si el registro del pago falla, pero avisa', async () => {
    reservas.registrarPago.mockRejectedValue(new Error('Timeout del servidor'));
    const result = await llegarAlPago();

    await act(async () => result.current.confirmarPago());

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Pago procesado, pero no se pudo registrar',
        'Timeout del servidor',
        expect.anything(),
      ),
    );
    expect(onReservaPagada).toHaveBeenCalled();
  });
});

describe('abandono del pago', () => {
  it('libera la reserva pendiente al cancelar', async () => {
    const result = await montarFlujo();
    await elegirFranja(result);
    await act(async () => result.current.reservar());
    await waitFor(() => expect(result.current.showPayment).toBe(true));

    await act(async () => result.current.cancelarPago());

    await waitFor(() =>
      expect(reservas.cancelarReserva).toHaveBeenCalledWith(99, 'Cliente canceló el pago'),
    );
    expect(result.current.showPayment).toBe(false);
    expect(result.current.reservaCreada).toBeNull();
  });

  it('no llama al backend si no llegó a crearse la reserva', async () => {
    const result = await montarFlujo();

    await act(async () => result.current.cancelarPago());

    expect(reservas.cancelarReserva).not.toHaveBeenCalled();
  });
});

describe('reinicio al cerrar la hoja', () => {
  it('limpia la selección cuando la hoja deja de ser visible', async () => {
    const espacioFijo = espacio();
    const { result, rerender } = await renderHook(
      ({ visible }: { visible: boolean }) =>
        useReservaFlow({ espacio: espacioFijo, visible, onReservaPagada }),
      { wrapper: conQueryClient(queryClient), initialProps: { visible: true } },
    );
    await act(async () => result.current.setSelectedDate(DIA));
    await act(async () => result.current.setCantidadEntradas(5));
    expect(result.current.selectedDate).toEqual(DIA);

    await act(async () => rerender({ visible: false }));

    expect(result.current.selectedDate).toBeNull();
    expect(result.current.cantidadEntradas).toBe(1);
  });
});

describe('propagación de errores de las consultas', () => {
  it('expone el mensaje del backend al fallar la disponibilidad', async () => {
    reservas.fetchDisponibilidad.mockRejectedValue(new Error('Servicio no disponible'));
    const result = await montarFlujo();

    await act(async () => result.current.setSelectedDate(DIA));

    await waitFor(() => expect(result.current.disponibilidadError).toBe('Servicio no disponible'));
    expect(result.current.disponibilidadLoading).toBe(false);
  });

  it('expone el error del aforo en cupo compartido', async () => {
    aforo.fetchAforoDia.mockRejectedValue(new Error('Aforo no configurado'));
    const result = await montarFlujo({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });

    await act(async () => result.current.setSelectedDate(DIA));

    await waitFor(() => expect(result.current.aforoError).toBe('Aforo no configurado'));
  });

  it('no consulta nada mientras la hoja está oculta', async () => {
    const result = await montarFlujo({ visible: false });

    await act(async () => result.current.setSelectedDate(DIA));

    expect(reservas.fetchDisponibilidad).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(disponibilidadQueryKey(10, '2026-08-20'))).toBeUndefined();
    expect(queryClient.getQueryData(aforoDiaQueryKey(10, '2026-08-20'))).toBeUndefined();
  });
});
