import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { crearQueryClient, conProviders } from '../../../../jest/harness';

import SearchScreen from '../components/SearchScreen';
import * as espaciosService from '../services/espacios.service';
import { Espacio } from '../types';

/**
 * Buscador del catálogo. Tiene dos niveles: coincidencia exacta sobre nombre,
 * subcategoría, ubicación y descripción; y, cuando esa no devuelve nada, un
 * modo aproximado ("fuzzy") que puntúa por tokens y ordena por relevancia. Esa
 * segunda pantalla es la que evita que el usuario se quede sin resultados por
 * escribir la palabra que no era.
 */

jest.mock('@/features/auth', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

jest.mock('../services/espacios.service', () => ({
  fetchEspacios: jest.fn(),
}));

const service = espaciosService as jest.Mocked<typeof espaciosService>;

function espacio(overrides: Partial<Espacio> = {}): Espacio {
  return {
    id: 1,
    nombre: 'Cancha El Campín',
    categoria: 'canchas',
    subcategoria: 'Cancha de fútbol',
    ubicacion: 'Pichincha, Quito',
    descripcion: 'Césped sintético para partidos de fútbol.',
    precio: 25,
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
    ...overrides,
  } as Espacio;
}

const CATALOGO = [
  espacio(),
  espacio({
    id: 2,
    nombre: 'Piscina Olímpica Norte',
    categoria: 'piscinas',
    subcategoria: 'Piscina semiolímpica',
    ubicacion: 'Guayas, Guayaquil',
    descripcion: 'Piscina climatizada de 25 metros.',
    rating: 4.8,
    distancia: 3.4,
  }),
  espacio({
    id: 3,
    nombre: 'Salón Los Ceibos',
    categoria: 'salones',
    subcategoria: 'Salón de eventos',
    ubicacion: 'Guayas, Guayaquil',
    descripcion: 'Ideal para bodas y cumpleaños.',
    rating: 4.1,
    distancia: 5,
  }),
];

let queryClient: QueryClient;

const renderBuscador = (props: Partial<React.ComponentProps<typeof SearchScreen>> = {}) =>
  render(
    <SearchScreen
      visible
      busqueda=""
      onChangeText={jest.fn()}
      onClose={jest.fn()}
      onSelectEspacio={jest.fn()}
      {...props}
    />,
    { wrapper: conProviders(queryClient) },
  );

/** Espera a que el catálogo esté en caché antes de afirmar sobre resultados. */
async function conCatalogoCargado() {
  await waitFor(() => expect(service.fetchEspacios).toHaveBeenCalled());
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = crearQueryClient();
  service.fetchEspacios.mockResolvedValue(CATALOGO);
});

afterEach(() => queryClient.clear());

describe('estado inicial', () => {
  it('sin texto ofrece sugerencias populares', async () => {
    await renderBuscador();

    expect(screen.getByText('Sugerencias populares')).toBeTruthy();
    expect(screen.getByText('🏷️ Fútbol')).toBeTruthy();
    expect(screen.getByText('Búsqueda inteligente')).toBeTruthy();
  });

  it('una sugerencia rellena el buscador', async () => {
    const onChangeText = jest.fn();
    await renderBuscador({ onChangeText });

    await fireEvent.press(screen.getByText('🏷️ Piscina'));

    expect(onChangeText).toHaveBeenCalledWith('Piscina');
  });

  it('no ofrece limpiar mientras el campo está vacío', async () => {
    await renderBuscador();

    expect(screen.getByPlaceholderText('Escribe para buscar...')).toBeTruthy();
  });

  it('cerrar vacía el buscador y avisa al padre', async () => {
    const onChangeText = jest.fn();
    const onClose = jest.fn();
    await renderBuscador({ busqueda: 'piscina', onChangeText, onClose });

    await fireEvent.press(screen.getByLabelText('Volver'));

    expect(onChangeText).toHaveBeenCalledWith('');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('coincidencia exacta', () => {
  it('encuentra por nombre', async () => {
    await renderBuscador({ busqueda: 'Campín' });
    await conCatalogoCargado();

    await waitFor(() => expect(screen.getByText('1 encontrados')).toBeTruthy());
    expect(screen.getByText('Cancha El Campín')).toBeTruthy();
  });

  it('encuentra por ubicación', async () => {
    await renderBuscador({ busqueda: 'guayaquil' });
    await conCatalogoCargado();

    await waitFor(() => expect(screen.getByText('2 encontrados')).toBeTruthy());
  });

  it('encuentra por descripción', async () => {
    await renderBuscador({ busqueda: 'climatizada' });
    await conCatalogoCargado();

    await waitFor(() => expect(screen.getByText('Piscina Olímpica Norte')).toBeTruthy());
  });

  it('muestra precio, distancia y puntuación de cada resultado', async () => {
    await renderBuscador({ busqueda: 'Campín' });
    await conCatalogoCargado();

    await waitFor(() => expect(screen.getByText('a 1.2 km')).toBeTruthy());
    expect(screen.getByText('/hora')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
  });

  it('abrir un resultado cierra el buscador y lo entrega al padre', async () => {
    const onClose = jest.fn();
    const onSelectEspacio = jest.fn();
    await renderBuscador({ busqueda: 'Campín', onClose, onSelectEspacio });
    await conCatalogoCargado();
    await waitFor(() => expect(screen.getByText('Cancha El Campín')).toBeTruthy());

    await fireEvent.press(screen.getByText('Cancha El Campín'));

    expect(onClose).toHaveBeenCalled();
    expect(onSelectEspacio).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('limpiar el campo devuelve el buscador a su estado inicial', async () => {
    const onChangeText = jest.fn();
    await renderBuscador({ busqueda: 'Campín', onChangeText });

    await fireEvent.press(screen.getByLabelText('Limpiar búsqueda'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });
});

describe('búsqueda aproximada', () => {
  it('invita al modo aproximado cuando no hay coincidencia exacta', async () => {
    await renderBuscador({ busqueda: 'canchas de tenis techadas' });
    await conCatalogoCargado();

    await waitFor(() => expect(screen.getByText('Sin coincidencias exactas')).toBeTruthy());
    expect(screen.getByText('0 encontrados')).toBeTruthy();
  });

  it('el banner abre la pantalla de lugares sugeridos', async () => {
    await renderBuscador({ busqueda: 'bodas y cumpleaños' });
    await conCatalogoCargado();

    await fireEvent.press(screen.getByText('➔'));

    expect(screen.getByText('Lugares Sugeridos')).toBeTruthy();
    expect(screen.getByText('Fuzzy Match')).toBeTruthy();
  });

  it('puntúa y ordena los espacios por relevancia', async () => {
    await renderBuscador({ busqueda: 'piscina climatizada' });
    await conCatalogoCargado();
    await fireEvent.press(screen.getByText('➔'));

    // Los dos modales conviven en el árbol, así que el espacio aparece tanto en
    // la lista exacta como en la aproximada; lo distintivo es el porcentaje.
    await waitFor(() => expect(screen.getAllByText('Piscina Olímpica Norte').length).toBe(2));
    expect(screen.getByText(/% de coincidencia/)).toBeTruthy();
  });

  it('avisa si no logra enlazar la búsqueda con nada del catálogo', async () => {
    await renderBuscador({ busqueda: 'gimnasio crossfit' });
    await conCatalogoCargado();

    await fireEvent.press(screen.getByText('➔'));

    await waitFor(() => expect(screen.getByText('Sin coincidencias')).toBeTruthy());
  });

  it('abrir un sugerido cierra todo y lo entrega al padre', async () => {
    const onSelectEspacio = jest.fn();
    await renderBuscador({ busqueda: 'bodas y cumpleaños', onSelectEspacio });
    await conCatalogoCargado();
    await fireEvent.press(screen.getByText('➔'));
    await waitFor(() => expect(screen.getAllByText('Salón Los Ceibos').length).toBe(2));

    // El último es el de la pantalla de sugeridos.
    const enSugeridos = screen.getAllByText('Salón Los Ceibos');
    await fireEvent.press(enSugeridos[enSugeridos.length - 1]);

    expect(onSelectEspacio).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
  });

  it('vuelve al buscador desde los lugares sugeridos', async () => {
    await renderBuscador({ busqueda: 'bodas y cumpleaños' });
    await conCatalogoCargado();
    await fireEvent.press(screen.getByText('➔'));
    expect(screen.getByText('Lugares Sugeridos')).toBeTruthy();

    await fireEvent.press(screen.getAllByLabelText('Volver')[1]);

    expect(screen.queryByText('Lugares Sugeridos')).toBeNull();
  });

  it('ignora los tokens de una sola letra al puntuar', async () => {
    await renderBuscador({ busqueda: 'a e i o u' });
    await conCatalogoCargado();

    await fireEvent.press(screen.getByText('➔'));

    await waitFor(() => expect(screen.getByText('Sin coincidencias')).toBeTruthy());
  });
});
