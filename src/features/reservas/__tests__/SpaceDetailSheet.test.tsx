import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { crearQueryClient, conProviders } from '../../../../jest/harness';
import { Espacio } from '@/features/espacios';
import { useLocationContext } from '@/shared/location/LocationContext';

import SpaceDetailSheet from '../components/SpaceDetailSheet';
import * as reservasService from '../services/reservas.service';
import * as aforoService from '../services/aforo.service';

/**
 * Hoja de detalle del espacio: el único sitio de la app donde el cliente ve
 * todo junto —ficha, mapa, normas y calculadora de reserva— y desde donde
 * arranca el pago. Es presentación pura sobre `useReservaFlow`, así que lo que
 * se verifica aquí es qué se muestra en cada estado, no la lógica de reserva.
 */

jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, isAuthenticated: true }),
}));

jest.mock('@/shared/location/LocationContext', () => ({
  useLocationContext: jest.fn(),
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

jest.mock('../services/aforo.service', () => ({ fetchAforoDia: jest.fn() }));

jest.mock('@/features/favoritos', () => ({
  SaveToListSheet: () => null,
}));

const reservas = reservasService as jest.Mocked<typeof reservasService>;
const aforo = aforoService as jest.Mocked<typeof aforoService>;
const ubicacion = useLocationContext as jest.Mock;

function espacio(overrides: Partial<Espacio> = {}): Espacio {
  return {
    id: 10,
    nombre: 'Cancha El Campín',
    categoria: 'canchas',
    subcategoria: 'Cancha de fútbol',
    ubicacion: 'Pichincha, Quito',
    descripcion: 'Césped sintético recién renovado.',
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
    latitud: -0.180653,
    longitud: -78.467834,
    anfitrion: { nombre: 'Carlos Mendoza', registro: 'Miembro desde 2021', verificado: true },
    servicios: ['Vestidores', 'Parqueadero'],
    normas: ['No fumar', 'Zapatos deportivos'],
    comentarios: [],
    ...overrides,
  } as Espacio;
}

let queryClient: QueryClient;

const renderHoja = (props: Partial<React.ComponentProps<typeof SpaceDetailSheet>> = {}) =>
  render(
    <SpaceDetailSheet
      visible
      espacio={espacio()}
      isFavorite={false}
      onToggleFavorite={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
    { wrapper: conProviders(queryClient) },
  );

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = crearQueryClient();
  ubicacion.mockReturnValue({ coords: null, loading: false, error: null, refresh: jest.fn() });
  reservas.fetchDisponibilidad.mockResolvedValue({
    tarifa: { precio: 20, unidad: 'hora', modalidad: null, esPromocion: false },
    horas: [],
  } as never);
  aforo.fetchAforoDia.mockResolvedValue({ disponible: 30, capacidadTotal: 50 } as never);
});

afterEach(() => queryClient.clear());

describe('ficha del espacio', () => {
  it('no pinta nada sin espacio cargado', async () => {
    const { toJSON } = await renderHoja({ espacio: null });

    expect(toJSON()).toBeNull();
  });

  it('muestra los datos principales del espacio', async () => {
    await renderHoja();

    expect(screen.getByText('Cancha El Campín')).toBeTruthy();
    expect(screen.getByText('Cancha de fútbol')).toBeTruthy();
    expect(screen.getByText('★ 4.5')).toBeTruthy();
    expect(screen.getByText('Césped sintético recién renovado.')).toBeTruthy();
  });

  it('marca al anfitrión verificado', async () => {
    await renderHoja();

    expect(screen.getByText('Carlos Mendoza ✔')).toBeTruthy();
    expect(screen.getByText('Miembro desde 2021')).toBeTruthy();
  });

  it('no marca al anfitrión sin verificar', async () => {
    await renderHoja({
      espacio: espacio({
        anfitrion: { nombre: 'Ana Salas', registro: 'Miembro desde 2023' },
      } as Partial<Espacio>),
    });

    expect(screen.getByText('Ana Salas')).toBeTruthy();
  });

  it('lista servicios y normas', async () => {
    await renderHoja();

    expect(screen.getByText('Vestidores')).toBeTruthy();
    expect(screen.getByText('Parqueadero')).toBeTruthy();
    expect(screen.getByText('No fumar')).toBeTruthy();
    expect(screen.getByText('Zapatos deportivos')).toBeTruthy();
  });

  it('destaca la disponibilidad de hoy cuando la hay', async () => {
    await renderHoja();

    expect(screen.getByText('⚡ Disponible Hoy')).toBeTruthy();
  });

  it('omite la insignia si el espacio no está libre hoy', async () => {
    await renderHoja({ espacio: espacio({ disponibleHoy: false }) });

    expect(screen.queryByText('⚡ Disponible Hoy')).toBeNull();
  });

  it('oculta la sección de reseñas si no hay comentarios', async () => {
    await renderHoja();

    expect(screen.queryByText(/Reseñas de Usuarios/)).toBeNull();
  });

  it('pinta los comentarios con sus estrellas', async () => {
    await renderHoja({
      espacio: espacio({
        comentarios: [
          { usuario: 'Kelly', fecha: '01/08/2026', rating: 4, texto: 'Muy buena cancha.' },
        ],
      } as Partial<Espacio>),
    });

    expect(screen.getByText('Reseñas de Usuarios (1)')).toBeTruthy();
    expect(screen.getByText('Kelly')).toBeTruthy();
    expect(screen.getByText('★★★★☆')).toBeTruthy();
  });
});

describe('ubicación y distancia', () => {
  it('muestra el mapa cuando el espacio tiene coordenadas', async () => {
    await renderHoja();

    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('avisa si el espacio no tiene coordenadas', async () => {
    await renderHoja({ espacio: espacio({ latitud: null, longitud: null }) });

    expect(screen.queryByTestId('webview')).toBeNull();
    expect(screen.getAllByText('Ubicación no disponible').length).toBeGreaterThan(0);
  });

  it('calcula la distancia cuando conoce la ubicación del usuario', async () => {
    ubicacion.mockReturnValue({
      coords: { latitude: -0.18, longitude: -78.46 },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    await renderHoja();

    expect(screen.getByText(/📍 a /)).toBeTruthy();
  });

  it('avisa mientras todavía está localizando al usuario', async () => {
    ubicacion.mockReturnValue({ coords: null, loading: true, error: null, refresh: jest.fn() });

    await renderHoja();

    expect(screen.getByText('📍 Calculando distancia…')).toBeTruthy();
  });
});

describe('favorito', () => {
  it('alterna el favorito desde la cabecera', async () => {
    const onToggleFavorite = jest.fn();
    await renderHoja({ onToggleFavorite });

    await fireEvent.press(screen.getByLabelText('Añadir a favoritos'));

    expect(onToggleFavorite).toHaveBeenCalledWith(10);
  });

  it('cambia la etiqueta si ya es favorito', async () => {
    await renderHoja({ isFavorite: true });

    expect(screen.getByLabelText('Quitar de favoritos')).toBeTruthy();
  });
});

describe('calculadora de reserva', () => {
  it('anuncia el precio por hora en espacios de franja exclusiva', async () => {
    await renderHoja();

    expect(screen.getByText('/hora')).toBeTruthy();
    expect(screen.getByText('Horario')).toBeTruthy();
  });

  it('anuncia el precio por entrada en espacios de cupo compartido', async () => {
    await renderHoja({
      espacio: espacio({ modalidadReserva: 'cupo_compartido' } as Partial<Espacio>),
    });

    expect(screen.getByText('/entrada')).toBeTruthy();
    expect(screen.getByText('Cantidad de entradas')).toBeTruthy();
  });

  it('avisa mientras consulta la tarifa del día elegido', async () => {
    reservas.fetchDisponibilidad.mockReturnValue(new Promise(() => {}) as never);
    await renderHoja();

    await fireEvent.press(screen.getByText('Hoy'));

    await waitFor(() =>
      expect(screen.getByText('Consultando tarifa y disponibilidad…')).toBeTruthy(),
    );
  });

  it('muestra el error si la disponibilidad falla', async () => {
    reservas.fetchDisponibilidad.mockRejectedValue(new Error('Servicio no disponible'));
    await renderHoja();

    await fireEvent.press(screen.getByText('Hoy'));

    await waitFor(() => expect(screen.getByText('⚠️ Servicio no disponible')).toBeTruthy());
  });

  it('avisa cuando el día de hoy no tiene tarifa configurada', async () => {
    reservas.fetchDisponibilidad.mockResolvedValue({ tarifa: null, horas: [] } as never);
    await renderHoja();

    await fireEvent.press(screen.getByText('Hoy'));

    await waitFor(() =>
      expect(screen.getByText(/no tiene una tarifa configurada para el día de hoy/)).toBeTruthy(),
    );
  });

  it('avisa cuando es otro día el que no tiene tarifa', async () => {
    reservas.fetchDisponibilidad.mockResolvedValue({ tarifa: null, horas: [] } as never);
    await renderHoja();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);

    await fireEvent.press(screen.getAllByText(String(manana.getDate()))[0]);

    await waitFor(() =>
      expect(screen.getByText(/no tiene una tarifa configurada para el día elegido/)).toBeTruthy(),
    );
  });

  it('no muestra desglose de costos mientras no haya franja elegida', async () => {
    await renderHoja();

    expect(screen.queryByText('Total a pagar:')).toBeNull();
  });

  it('desglosa subtotal, comisión y total al elegir la franja', async () => {
    await renderHoja();
    await fireEvent.press(screen.getByText('Hoy'));
    await waitFor(() => expect(screen.getByTestId('hora-desde-10')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('hora-desde-10'));
    await fireEvent.press(screen.getByTestId('hora-hasta-13'));

    expect(screen.getByText('Costo por 3 horas:')).toBeTruthy();
    expect(screen.getByText('$60.00')).toBeTruthy();
    expect(screen.getByText('Comisión de servicio (10%):')).toBeTruthy();
    expect(screen.getByText('$6.00')).toBeTruthy();
    expect(screen.getByText('$66.00')).toBeTruthy();
  });

  it('concuerda el singular cuando se reserva una sola hora', async () => {
    await renderHoja();
    await fireEvent.press(screen.getByText('Hoy'));
    await waitFor(() => expect(screen.getByTestId('hora-desde-10')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('hora-desde-10'));
    await fireEvent.press(screen.getByTestId('hora-hasta-11'));

    expect(screen.getByText('Costo por 1 hora:')).toBeTruthy();
  });

  it('ofrece los datos de facturación como opcionales', async () => {
    await renderHoja();
    await fireEvent.press(screen.getByText('Hoy'));
    await waitFor(() => expect(screen.getByTestId('hora-desde-10')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('hora-desde-10'));
    await fireEvent.press(screen.getByTestId('hora-hasta-11'));

    expect(screen.getByText(/la factura se emite a/)).toBeTruthy();
    expect(screen.getByPlaceholderText('Ej. 0102030405')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nombre o empresa a facturar')).toBeTruthy();
    expect(screen.getByPlaceholderText('correo@ejemplo.com')).toBeTruthy();
  });

  it('limita la identificación a 13 caracteres, como el SRI', async () => {
    await renderHoja();
    await fireEvent.press(screen.getByText('Hoy'));
    await waitFor(() => expect(screen.getByTestId('hora-desde-10')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('hora-desde-10'));
    await fireEvent.press(screen.getByTestId('hora-hasta-11'));

    expect(screen.getByPlaceholderText('Ej. 0102030405').props.maxLength).toBe(13);
  });

  it('crea la reserva desde el botón de continuar al pago', async () => {
    reservas.crearReserva.mockResolvedValue({ id: 99, pago: { total: 66 } } as never);
    await renderHoja();
    await fireEvent.press(screen.getByText('Hoy'));
    await waitFor(() => expect(screen.getByTestId('hora-desde-10')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('hora-desde-10'));
    await fireEvent.press(screen.getByTestId('hora-hasta-12'));

    await fireEvent.press(screen.getByText('CONTINUAR AL PAGO →'));

    await waitFor(() => expect(reservas.crearReserva).toHaveBeenCalled());
  });
});

describe('cierre de la hoja', () => {
  it('el botón de volver cierra la hoja', async () => {
    const onClose = jest.fn();
    await renderHoja({ onClose });

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(onClose).toHaveBeenCalled();
  });
});
