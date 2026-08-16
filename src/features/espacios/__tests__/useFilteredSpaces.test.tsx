import { QueryClient } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { crearQueryClient, conQueryClient } from '../../../../jest/harness';

import { ESPACIOS_QUERY_KEY, useEspacios } from '../hooks/useEspacios';
import {
  useFilteredSpaces,
  useFavoriteSpaces,
  useEspaciosPorIds,
} from '../hooks/useFilteredSpaces';
import * as espaciosService from '../services/espacios.service';
import { Espacio } from '../types';

/**
 * El filtrado del catálogo ocurre en el cliente sobre la lista que ya cacheó
 * React Query: es lo que hace que escribir en el buscador responda al instante
 * en vez de disparar una petición por tecla.
 */

jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(() => ({ isAuthenticated: true })),
}));

jest.mock('../services/espacios.service', () => ({
  fetchEspacios: jest.fn(),
}));

const { useAuth } = jest.requireMock('@/features/auth');
const service = espaciosService as jest.Mocked<typeof espaciosService>;

function espacio(overrides: Partial<Espacio> = {}): Espacio {
  return {
    id: 1,
    nombre: 'Cancha El Campín',
    categoria: 'canchas',
    subcategoria: 'Cancha de fútbol',
    ubicacion: 'Pichincha, Quito',
    precio: 25,
    unidad: 'hora',
    rating: 4,
    reviews: 10,
    distancia: 5,
    disponibleHoy: true,
    imagen: '',
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

const CATALOGO = [
  espacio({ id: 1, nombre: 'Cancha El Campín', categoria: 'canchas', distancia: 5, rating: 4.0 }),
  espacio({
    id: 2,
    nombre: 'Piscina Olímpica',
    categoria: 'piscinas',
    subcategoria: 'Piscina semiolímpica',
    ubicacion: 'Guayas, Guayaquil',
    distancia: 1,
    rating: 4.8,
    disponibleHoy: false,
  }),
  espacio({
    id: 3,
    nombre: 'Salón Los Ceibos',
    categoria: 'salones',
    subcategoria: 'Salón de eventos',
    ubicacion: 'Guayas, Guayaquil',
    distancia: 3,
    rating: 3.5,
  }),
];

let queryClient: QueryClient;

async function montarFiltro(params: Parameters<typeof useFilteredSpaces>[0]) {
  const { result } = await renderHook(() => useFilteredSpaces(params), {
    wrapper: conQueryClient(queryClient),
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

const nombres = (espacios: Espacio[]) => espacios.map(e => e.nombre);

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ isAuthenticated: true });
  queryClient = crearQueryClient();
  service.fetchEspacios.mockResolvedValue(CATALOGO);
});

afterEach(() => queryClient.clear());

describe('useEspacios', () => {
  it('no consulta el catálogo sin sesión iniciada', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false });

    const { result } = await renderHook(() => useEspacios(), {
      wrapper: conQueryClient(queryClient),
    });

    expect(service.fetchEspacios).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('cachea el catálogo bajo una clave estable', async () => {
    const { result } = await renderHook(() => useEspacios(), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(queryClient.getQueryData(ESPACIOS_QUERY_KEY)).toHaveLength(3);
  });
});

describe('filtrado por categoría', () => {
  it('sin categoría devuelve todo el catálogo', async () => {
    const result = await montarFiltro({ categoria: null, query: '' });

    expect(result.current.total).toBe(3);
  });

  it('acota a la categoría elegida', async () => {
    const result = await montarFiltro({ categoria: 'piscinas', query: '' });

    expect(nombres(result.current.espacios)).toEqual(['Piscina Olímpica']);
  });
});

describe('búsqueda por texto', () => {
  it('busca por nombre sin distinguir mayúsculas', async () => {
    const result = await montarFiltro({ categoria: null, query: 'CAMPÍN' });

    expect(nombres(result.current.espacios)).toEqual(['Cancha El Campín']);
  });

  it('busca también por ubicación', async () => {
    const result = await montarFiltro({ categoria: null, query: 'guayaquil' });

    expect(result.current.total).toBe(2);
  });

  it('busca también por subcategoría', async () => {
    const result = await montarFiltro({ categoria: null, query: 'semiolímpica' });

    expect(nombres(result.current.espacios)).toEqual(['Piscina Olímpica']);
  });

  it('ignora los espacios en blanco alrededor de la búsqueda', async () => {
    const result = await montarFiltro({ categoria: null, query: '   ' });

    expect(result.current.total).toBe(3);
  });

  it('combina categoría y texto', async () => {
    const result = await montarFiltro({ categoria: 'canchas', query: 'guayaquil' });

    expect(result.current.total).toBe(0);
  });

  it('devuelve lista vacía si nada coincide', async () => {
    const result = await montarFiltro({ categoria: null, query: 'coworking' });

    expect(result.current.espacios).toEqual([]);
  });
});

describe('filtros rápidos', () => {
  it('"cercanos" ordena de menor a mayor distancia', async () => {
    const result = await montarFiltro({ categoria: null, query: '', filtroRapido: 'cercanos' });

    expect(nombres(result.current.espacios)).toEqual([
      'Piscina Olímpica',
      'Salón Los Ceibos',
      'Cancha El Campín',
    ]);
  });

  it('"puntuación" ordena de mejor a peor valorado', async () => {
    const result = await montarFiltro({ categoria: null, query: '', filtroRapido: 'puntuacion' });

    expect(nombres(result.current.espacios)).toEqual([
      'Piscina Olímpica',
      'Cancha El Campín',
      'Salón Los Ceibos',
    ]);
  });

  it('"inmediato" deja solo lo disponible hoy', async () => {
    const result = await montarFiltro({ categoria: null, query: '', filtroRapido: 'inmediato' });

    expect(nombres(result.current.espacios)).toEqual(['Cancha El Campín', 'Salón Los Ceibos']);
  });

  it('ordenar no altera el catálogo cacheado', async () => {
    await montarFiltro({ categoria: null, query: '', filtroRapido: 'cercanos' });

    expect(nombres(queryClient.getQueryData<Espacio[]>(ESPACIOS_QUERY_KEY) ?? [])).toEqual(
      nombres(CATALOGO),
    );
  });
});

describe('estados de la consulta', () => {
  it('propaga el fallo del catálogo', async () => {
    service.fetchEspacios.mockRejectedValue(new Error('Backend caído'));

    const { result } = await renderHook(
      () => useFilteredSpaces({ categoria: null, query: '' }),
      { wrapper: conQueryClient(queryClient) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.espacios).toEqual([]);
  });

  it('expone el refetch para el "pull to refresh"', async () => {
    const result = await montarFiltro({ categoria: null, query: '' });

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(service.fetchEspacios).toHaveBeenCalledTimes(2));
  });
});

describe('selección de espacios ya cacheados', () => {
  it('useFavoriteSpaces filtra el catálogo por los ids marcados', async () => {
    const { result } = await renderHook(() => useFavoriteSpaces([3, 1]), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map(e => e.id).sort()).toEqual([1, 3]);
  });

  it('useEspaciosPorIds respeta el orden que le dan', async () => {
    const { result } = await renderHook(() => useEspaciosPorIds([3, 1, 2]), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current.map(e => e.id)).toEqual([3, 1, 2]);
  });

  it('useEspaciosPorIds descarta los ids que ya no están en el catálogo', async () => {
    const { result } = await renderHook(() => useEspaciosPorIds([99, 2]), {
      wrapper: conQueryClient(queryClient),
    });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].id).toBe(2);
  });
});
